import { Injectable } from '@nestjs/common';
import { prisma } from '@innflow/database';
import {
  IncomingRequestSchema,
  ValidationError,
  TenantIsolationError,
  buildWorkflowId,
  type IncomingRequest,
  type RequestChannel,
} from '@innflow/domain';
import { TASK_QUEUES, WORKFLOW_NAMES, SIGNALS } from '@innflow/config';
import { HotelGuestRequestWorkflow } from '@innflow/workflows';
import { createStorageProvider } from '@innflow/storage';
import { workflowsStartedTotal } from '@innflow/telemetry';
import { TemporalService } from '../temporal/temporal.service';
import { TenantService } from '../tenant/tenant.service';
import { EventsService } from '../events/events.service';
import type { AuthUser } from '../common/types';

@Injectable()
export class RequestService {
  private readonly storage = createStorageProvider();

  constructor(
    private readonly temporal: TemporalService,
    private readonly tenants: TenantService,
    private readonly events: EventsService,
  ) {}

  async createRequest(params: {
    tenantId: string;
    idempotencyKey: string;
    body: IncomingRequest;
    createdBy?: string;
    externalRequestId?: string;
  }) {
    const parsed = IncomingRequestSchema.parse({
      ...params.body,
      externalRequestId: params.externalRequestId ?? params.body.externalRequestId,
    });

    await this.tenants.requireTenant(params.tenantId);

    if (parsed.externalRequestId) {
      const existing = await prisma.guestRequest.findUnique({
        where: {
          tenantId_externalRequestId: {
            tenantId: params.tenantId,
            externalRequestId: parsed.externalRequestId,
          },
        },
      });
      if (existing) {
        return this.toRequestResponse(existing);
      }
    }

    const guestRequest = await prisma.guestRequest.create({
      data: {
        tenantId: params.tenantId,
        idempotencyKey: params.idempotencyKey,
        externalRequestId: parsed.externalRequestId,
        channel: parsed.channel,
        rawText: parsed.rawText,
        priority: parsed.priority,
        guestName: parsed.guestName,
        roomNumber: parsed.roomNumber,
        reservationId: parsed.reservationId,
        createdBy: params.createdBy,
        status: 'RECEIVED',
      },
    });

    const workflowId = buildWorkflowId(params.tenantId, params.idempotencyKey);
    const workflowInput = {
      tenantId: params.tenantId,
      guestRequestId: guestRequest.id,
      idempotencyKey: params.idempotencyKey,
      channel: parsed.channel,
      rawText: parsed.rawText,
      guestName: parsed.guestName,
      roomNumber: parsed.roomNumber,
      reservationId: parsed.reservationId,
    };

    const client = await this.temporal.getClient();
    try {
      await client.workflow.start(HotelGuestRequestWorkflow, {
        taskQueue: TASK_QUEUES.ORCHESTRATION,
        workflowId,
        args: [workflowInput],
        workflowIdConflictPolicy: 'USE_EXISTING',
      });
      workflowsStartedTotal.inc({ tenant_id: params.tenantId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (!message.includes('already started') && !message.includes('AlreadyExists')) {
        throw error;
      }
    }

    const response = this.toRequestResponse(guestRequest, workflowId);
    this.events.emitWorkflowUpdate(params.tenantId, {
      type: 'request.created',
      requestId: guestRequest.id,
      workflowId,
      status: guestRequest.status,
    });

    return response;
  }

  async listRequests(tenantId: string | undefined, query: { status?: string; limit?: number; offset?: number }) {
    const where = tenantId ? { tenantId, ...(query.status ? { status: query.status } : {}) } : query.status ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      prisma.guestRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      prisma.guestRequest.count({ where }),
    ]);

    return { items: items.map((item) => this.toRequestResponse(item)), total };
  }

  async getRequest(tenantId: string | undefined, requestId: string) {
    const request = await prisma.guestRequest.findUnique({
      where: { id: requestId },
      include: {
        workflowExecutions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!request) {
      throw new ValidationError('Request not found', { requestId });
    }

    if (tenantId && request.tenantId !== tenantId) {
      throw new TenantIsolationError();
    }

    const workflow = request.workflowExecutions[0];
    return this.toRequestResponse(request, workflow?.temporalWorkflowId);
  }

  async cancelRequest(tenantId: string | undefined, requestId: string) {
    const request = await this.getRequest(tenantId, requestId);
    const execution = await prisma.workflowExecution.findFirst({
      where: { guestRequestId: requestId },
      orderBy: { createdAt: 'desc' },
    });

    if (execution) {
      const client = await this.temporal.getClient();
      const handle = client.workflow.getHandle(execution.temporalWorkflowId);
      await handle.signal(SIGNALS.CANCEL);
    }

    await prisma.guestRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    this.events.emitWorkflowUpdate(request.tenantId, {
      type: 'request.cancelled',
      requestId,
      status: 'CANCELLED',
    });

    return { ...request, status: 'CANCELLED' };
  }

  async retryRequest(tenantId: string | undefined, requestId: string) {
    const request = await this.getRequest(tenantId, requestId);
    const execution = await prisma.workflowExecution.findFirst({
      where: { guestRequestId: requestId },
      orderBy: { createdAt: 'desc' },
    });

    if (!execution) {
      throw new ValidationError('No workflow execution found for request', { requestId });
    }

    const client = await this.temporal.getClient();
    const handle = client.workflow.getHandle(execution.temporalWorkflowId);
    await handle.signal(SIGNALS.MANUAL_RETRY, {});

    this.events.emitWorkflowUpdate(request.tenantId, {
      type: 'request.retry',
      requestId,
    });

    return { requestId, workflowId: execution.temporalWorkflowId, signal: SIGNALS.MANUAL_RETRY };
  }

  async getTimeline(tenantId: string | undefined, requestId: string) {
    const request = await this.getRequest(tenantId, requestId);

    const [steps, agentRuns, auditEvents] = await Promise.all([
      prisma.workflowStep.findMany({
        where: { workflowExecution: { guestRequestId: requestId } },
        orderBy: { startedAt: 'asc' },
      }),
      prisma.agentRun.findMany({
        where: { guestRequestId: requestId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.auditEvent.findMany({
        where: { resourceType: 'guest_request', resourceId: requestId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      request,
      steps,
      agentRuns,
      auditEvents,
    };
  }

  async getArtifacts(tenantId: string | undefined, requestId: string) {
    const request = await this.getRequest(tenantId, requestId);

    const artifacts = await prisma.executionArtifact.findMany({
      where: { workflowExecution: { guestRequestId: requestId } },
      orderBy: { createdAt: 'asc' },
    });

    const withUrls = await Promise.all(
      artifacts.map(async (artifact) => ({
        ...artifact,
        signedUrl: await this.storage.getSignedArtifactUrl(artifact.storageKey),
      })),
    );

    return { requestId, artifacts: withUrls };
  }

  createChannelRequest(channel: RequestChannel, body: Omit<IncomingRequest, 'channel'>) {
    return IncomingRequestSchema.parse({ ...body, channel });
  }

  private toRequestResponse(
    request: {
      id: string;
      tenantId: string;
      externalRequestId: string | null;
      idempotencyKey: string;
      channel: string;
      rawText: string;
      requestType: string | null;
      status: string;
      priority: string;
      guestName: string | null;
      roomNumber: string | null;
      reservationId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    workflowId?: string,
  ) {
    return {
      id: request.id,
      tenantId: request.tenantId,
      externalRequestId: request.externalRequestId,
      idempotencyKey: request.idempotencyKey,
      channel: request.channel,
      rawText: request.rawText,
      requestType: request.requestType,
      status: request.status,
      priority: request.priority,
      guestName: request.guestName,
      roomNumber: request.roomNumber,
      reservationId: request.reservationId,
      workflowId,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }
}
