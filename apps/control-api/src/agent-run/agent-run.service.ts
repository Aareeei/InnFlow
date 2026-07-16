import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { TenantIsolationError, ValidationError } from '@innflow/domain';

@Injectable()
export class AgentRunService {
  async listAgentRuns(
    tenantId: string | undefined,
    query: { guestRequestId?: string; limit?: number; offset?: number },
  ) {
    const where = {
      ...(tenantId ? { tenantId } : {}),
      ...(query.guestRequestId ? { guestRequestId: query.guestRequestId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.agentRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      prisma.agentRun.count({ where }),
    ]);

    return { items, total };
  }

  async getAgentRun(tenantId: string | undefined, agentRunId: string) {
    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } });

    if (!run) {
      throw new ValidationError('Agent run not found', { agentRunId });
    }

    if (tenantId && run.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }

    return run;
  }
}
