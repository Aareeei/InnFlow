import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { SIGNALS } from '@innflow/config';
import { TenantIsolationError, ValidationError } from '@innflow/domain';
import { TemporalService } from '../temporal/temporal.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class ApprovalService {
  constructor(
    private readonly temporal: TemporalService,
    private readonly events: EventsService,
  ) {}

  async listApprovals(tenantId: string | undefined, query: { status?: string; limit?: number; offset?: number }) {
    const where = tenantId
      ? { tenantId, ...(query.status ? { status: query.status } : {}) }
      : query.status
        ? { status: query.status }
        : {};

    const [items, total] = await Promise.all([
      prisma.humanApproval.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      prisma.humanApproval.count({ where }),
    ]);

    return { items, total };
  }

  async getApproval(tenantId: string | undefined, approvalId: string) {
    const approval = await prisma.humanApproval.findUnique({
      where: { id: approvalId },
      include: { workflowExecution: true, guestRequest: true },
    });

    if (!approval) {
      throw new ValidationError('Approval not found', { approvalId });
    }

    if (tenantId && approval.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }

    return approval;
  }

  async approve(tenantId: string | undefined, approvalId: string, resolvedBy: string, note?: string) {
    return this.resolve(tenantId, approvalId, true, resolvedBy, note);
  }

  async reject(tenantId: string | undefined, approvalId: string, resolvedBy: string, note?: string) {
    return this.resolve(tenantId, approvalId, false, resolvedBy, note);
  }

  private async resolve(
    tenantId: string | undefined,
    approvalId: string,
    approved: boolean,
    resolvedBy: string,
    note?: string,
  ) {
    const approval = await this.getApproval(tenantId, approvalId);

    if (approval.status !== 'PENDING') {
      throw new ValidationError('Approval is not pending', { approvalId, status: approval.status });
    }

    const signal = {
      approvalId,
      approved,
      resolvedBy,
      note,
    };

    const client = await this.temporal.getClient();
    const handle = client.workflow.getHandle(approval.workflowExecution.temporalWorkflowId);
    await handle.signal(SIGNALS.APPROVAL_DECISION, signal);

    this.events.emitWorkflowUpdate(approval.tenantId, {
      type: approved ? 'approval.approved' : 'approval.rejected',
      approvalId,
      requestId: approval.guestRequestId,
    });

    return {
      approvalId,
      approved,
      signal: SIGNALS.APPROVAL_DECISION,
      status: approved ? 'APPROVED' : 'REJECTED',
    };
  }
}
