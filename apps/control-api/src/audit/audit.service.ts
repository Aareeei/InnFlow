import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';

@Injectable()
export class AuditService {
  async listEvents(
    tenantId: string | undefined,
    query: {
      resourceType?: string;
      resourceId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where = {
      ...(tenantId ? { tenantId } : {}),
      ...(query.resourceType ? { resourceType: query.resourceType } : {}),
      ...(query.resourceId ? { resourceId: query.resourceId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 100,
        skip: query.offset ?? 0,
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return { items, total };
  }
}
