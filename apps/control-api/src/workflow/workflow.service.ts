import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import { QUERIES, SIGNALS } from '@innflow/config';
import { TenantIsolationError, ValidationError } from '@innflow/domain';
import { TemporalService } from '../temporal/temporal.service';

@Injectable()
export class WorkflowService {
  constructor(private readonly temporal: TemporalService) {}

  async listWorkflows(tenantId: string | undefined, query: { status?: string; limit?: number; offset?: number }) {
    const where = tenantId
      ? { tenantId, ...(query.status ? { status: query.status } : {}) }
      : query.status
        ? { status: query.status }
        : {};

    const [items, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
        include: { guestRequest: true },
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toWorkflowResponse(item)),
      total,
    };
  }

  async getWorkflow(tenantId: string | undefined, workflowId: string) {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: workflowId },
      include: { guestRequest: true, steps: { orderBy: { startedAt: 'asc' } } },
    });

    if (!execution) {
      throw new ValidationError('Workflow not found', { workflowId });
    }

    if (tenantId && execution.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }

    return {
      ...this.toWorkflowResponse(execution),
      steps: execution.steps,
    };
  }

  async getWorkflowStatus(tenantId: string | undefined, workflowId: string) {
    const execution = await this.getExecution(tenantId, workflowId);
    const client = await this.temporal.getClient();
    const handle = client.workflow.getHandle(execution.temporalWorkflowId);

    try {
      const progress = await handle.query(QUERIES.PROGRESS);
      const description = await handle.describe();
      return {
        workflowId: execution.id,
        temporalWorkflowId: execution.temporalWorkflowId,
        status: execution.status,
        progress,
        temporalStatus: description.status.name,
      };
    } catch {
      return {
        workflowId: execution.id,
        temporalWorkflowId: execution.temporalWorkflowId,
        status: execution.status,
        progress: null,
        temporalStatus: 'UNKNOWN',
      };
    }
  }

  async cancelWorkflow(tenantId: string | undefined, workflowId: string) {
    const execution = await this.getExecution(tenantId, workflowId);
    const client = await this.temporal.getClient();
    const handle = client.workflow.getHandle(execution.temporalWorkflowId);
    await handle.signal(SIGNALS.CANCEL);

    return {
      workflowId: execution.id,
      temporalWorkflowId: execution.temporalWorkflowId,
      signal: SIGNALS.CANCEL,
    };
  }

  private async getExecution(tenantId: string | undefined, workflowId: string) {
    const execution = await prisma.workflowExecution.findUnique({ where: { id: workflowId } });
    if (!execution) {
      throw new ValidationError('Workflow not found', { workflowId });
    }
    if (tenantId && execution.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }
    return execution;
  }

  private toWorkflowResponse(execution: {
    id: string;
    tenantId: string;
    guestRequestId: string;
    temporalWorkflowId: string;
    temporalRunId: string | null;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    failureReason: string | null;
    retryCount: number;
    totalDurationMs: number | null;
    guestRequest?: { status: string; channel: string; rawText: string };
  }) {
    return {
      id: execution.id,
      tenantId: execution.tenantId,
      guestRequestId: execution.guestRequestId,
      temporalWorkflowId: execution.temporalWorkflowId,
      temporalRunId: execution.temporalRunId,
      status: execution.status,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt?.toISOString() ?? null,
      failureReason: execution.failureReason,
      retryCount: execution.retryCount,
      totalDurationMs: execution.totalDurationMs,
      guestRequest: execution.guestRequest
        ? {
            status: execution.guestRequest.status,
            channel: execution.guestRequest.channel,
            rawText: execution.guestRequest.rawText,
          }
        : undefined,
    };
  }
}
