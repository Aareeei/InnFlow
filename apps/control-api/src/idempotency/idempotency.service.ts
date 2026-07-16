import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { hashRequestBody, IdempotencyConflictError } from '@innflow/domain';
import { RedisService } from '../redis/redis.service';

const IDEMPOTENCY_TTL_SECONDS = 86_400;
const LOCK_TTL_SECONDS = 30;

export interface IdempotencyResult<T> {
  cached: boolean;
  status: number;
  body: T;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  async execute<T>(params: {
    tenantId: string;
    idempotencyKey: string;
    requestBody: unknown;
    handler: () => Promise<{ status: number; body: T; resourceId?: string }>;
  }): Promise<IdempotencyResult<T>> {
    const { tenantId, idempotencyKey, requestBody, handler } = params;
    const requestHash = hashRequestBody(requestBody);
    const lockKey = `idempotency:lock:${tenantId}:${idempotencyKey}`;

    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_idempotencyKey: { tenantId, idempotencyKey },
      },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new IdempotencyConflictError(
          'Idempotency key was already used with a different request body',
        );
      }

      if (existing.expiresAt > new Date()) {
        return {
          cached: true,
          status: existing.responseStatus,
          body: existing.responseJson as T,
        };
      }
    }

    const acquired = await this.redis.getClient().set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    if (acquired !== 'OK') {
      await this.waitForRecord(tenantId, idempotencyKey, requestHash);
      const record = await prisma.idempotencyRecord.findUniqueOrThrow({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      });
      return {
        cached: true,
        status: record.responseStatus,
        body: record.responseJson as T,
      };
    }

    try {
      const result = await handler();
      const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_SECONDS * 1000);

      await prisma.idempotencyRecord.upsert({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
        create: {
          tenantId,
          idempotencyKey,
          requestHash,
          responseStatus: result.status,
          responseJson: result.body as object,
          resourceId: result.resourceId,
          expiresAt,
        },
        update: {
          requestHash,
          responseStatus: result.status,
          responseJson: result.body as object,
          resourceId: result.resourceId,
          expiresAt,
        },
      });

      return { cached: false, status: result.status, body: result.body };
    } finally {
      await this.redis.getClient().del(lockKey);
    }
  }

  private async waitForRecord(
    tenantId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const record = await prisma.idempotencyRecord.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      });
      if (record) {
        if (record.requestHash !== requestHash) {
          throw new IdempotencyConflictError();
        }
        return;
      }
    }
    throw new IdempotencyConflictError('Concurrent idempotent request timed out');
  }
}
