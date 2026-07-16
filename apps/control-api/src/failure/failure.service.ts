import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { SIGNALS } from '@innflow/config';
import { TenantIsolationError, ValidationError } from '@innflow/domain';
import { TemporalService } from '../temporal/temporal.service';

@Injectable()
export class FailureService {
  constructor(private readonly temporal: TemporalService) {}

  async listFailures(tenantId: string | undefined, query: { status?: string; limit?: number; offset?: number }) {
    const where = tenantId
      ? { tenantId, ...(query.status ? { status: query.status } : {}) }
      : query.status
        ? { status: query.status }
        : {};

    const [items, total] = await Promise.all([
      prisma.failureQueueItem.findMany({
        where,
        orderBy: { lastFailedAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      prisma.failureQueueItem.count({ where }),
    ]);

    return { items, total };
  }

  async getFailure(tenantId: string | undefined, failureId: string) {
    const failure = await prisma.failureQueueItem.findUnique({
      where: { id: failureId },
      include: { workflowExecution: true, guestRequest: true },
    });

    if (!failure) {
      throw new ValidationError('Failure item not found', { failureId });
    }

    if (tenantId && failure.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }

    return failure;
  }

  async requeue(tenantId: string | undefined, failureId: string) {
    const failure = await this.getFailure(tenantId, failureId);

    const client = await this.temporal.getClient();
    const handle = client.workflow.getHandle(failure.workflowExecution.temporalWorkflowId);
    await handle.signal(SIGNALS.MANUAL_RETRY, {});

    const updated = await prisma.failureQueueItem.update({
      where: { id: failureId },
      data: {
        status: 'REQUEUED',
        retryCount: { increment: 1 },
        lastFailedAt: new Date(),
      },
    });

    return updated;
  }

  async resolve(tenantId: string | undefined, failureId: string) {
    await this.getFailure(tenantId, failureId);

    return prisma.failureQueueItem.update({
      where: { id: failureId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
    });
  }
}
