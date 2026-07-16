import { randomUUID } from 'crypto';
import { Context } from '@temporalio/activity';
import { createAIProvider } from '@innflow/ai';
import type { AIProviderUsageRecord, TenantContext } from '@innflow/ai';
import { prisma } from '@innflow/database';
import type { IncomingRequest } from '@innflow/domain';
import type {
  ClassifyGuestRequestInput,
  ClassifyGuestRequestOutput,
  CreateHumanApprovalInput,
  CreateHumanApprovalOutput,
  EnqueueFailureItemInput,
  EnqueueFailureItemOutput,
  EscalateGuestRequestInput,
  EscalateGuestRequestOutput,
  EvaluatePolicyInput,
  EvaluatePolicyOutput,
  FinalizeGuestRequestInput,
  FinalizeGuestRequestOutput,
  InitializeWorkflowInput,
  InitializeWorkflowOutput,
  PlanGuestRequestInput,
  PlanGuestRequestOutput,
  RecordAuditEventInput,
  RecordWorkflowStepInput,
  RecordWorkflowStepOutput,
  ResolveHumanApprovalInput,
  UpdateGuestRequestStatusInput,
} from './types.js';

const DEFAULT_APPROVAL_TIMEOUT_MS = 30 * 60 * 1000;

function asJson(value: Record<string, unknown> | undefined): never | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value as never;
}

function activityTraceId(): string | undefined {
  return Context.current().info.workflowExecution?.runId;
}

async function resolveTenantContext(tenantId: string): Promise<TenantContext> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { timezone: true },
  });

  return {
    tenantId,
    timezone: tenant?.timezone ?? 'America/Los_Angeles',
  };
}

function latestUsageRecord(
  records: readonly AIProviderUsageRecord[],
): AIProviderUsageRecord {
  const latest = records.length > 0 ? records[records.length - 1] : undefined;
  if (!latest) {
    return {
      operation: 'classifyRequest',
      tokenInput: 0,
      tokenOutput: 0,
      estimatedCostUsd: 0,
      latencyMs: 0,
      promptVersion: 'unknown',
      provider: 'unknown',
      model: 'unknown',
    };
  }

  return latest;
}

async function createAgentRun(
  tenantId: string,
  guestRequestId: string,
  agentType: string,
  inputJson: Record<string, unknown>,
  outputJson: Record<string, unknown>,
  usage: AIProviderUsageRecord,
  status: 'COMPLETED' | 'FAILED' = 'COMPLETED',
  errorMessage?: string,
) {
  return prisma.agentRun.create({
    data: {
      tenantId,
      guestRequestId,
      agentType,
      provider: usage.provider,
      model: usage.model,
      inputJson: asJson(inputJson)!,
      outputJson: asJson(outputJson)!,
      promptVersion: usage.promptVersion,
      tokenInput: usage.tokenInput,
      tokenOutput: usage.tokenOutput,
      estimatedCostUsd: usage.estimatedCostUsd,
      latencyMs: usage.latencyMs,
      status,
      errorMessage,
    },
  });
}


function toIncomingRequest(input: {
  channel: string;
  rawText: string;
  guestName?: string;
  roomNumber?: string;
  reservationId?: string;
  priority?: string;
}): IncomingRequest {
  return {
    channel: input.channel as IncomingRequest['channel'],
    rawText: input.rawText,
    guestName: input.guestName,
    roomNumber: input.roomNumber,
    reservationId: input.reservationId,
    priority: (input.priority as IncomingRequest['priority']) ?? 'NORMAL',
  };
}

async function resolveApprovalTimeoutMs(tenantId: string): Promise<number> {
  const config = await prisma.systemConfiguration.findFirst({
    where: {
      tenantId,
      key: 'approval_timeout_ms',
    },
  });

  if (!config?.valueJson || typeof config.valueJson !== 'object') {
    return DEFAULT_APPROVAL_TIMEOUT_MS;
  }

  const value = (config.valueJson as { value?: unknown }).value;
  return typeof value === 'number' && value > 0 ? value : DEFAULT_APPROVAL_TIMEOUT_MS;
}

export async function initializeWorkflowExecution(
  input: InitializeWorkflowInput,
): Promise<InitializeWorkflowOutput> {
  const approvalTimeoutMs = await resolveApprovalTimeoutMs(input.input.tenantId);

  const workflowExecution = await prisma.workflowExecution.create({
    data: {
      tenantId: input.input.tenantId,
      guestRequestId: input.input.guestRequestId,
      temporalWorkflowId: input.temporalWorkflowId,
      temporalRunId: input.temporalRunId,
      status: 'RUNNING',
    },
  });

  await prisma.guestRequest.update({
    where: { id: input.input.guestRequestId },
    data: { status: 'RECEIVED' },
  });

  await recordAuditEvent({
    tenantId: input.input.tenantId,
    actorType: 'SYSTEM',
    action: 'WORKFLOW_STARTED',
    resourceType: 'workflow_execution',
    resourceId: workflowExecution.id,
    metadata: {
      guestRequestId: input.input.guestRequestId,
      temporalWorkflowId: input.temporalWorkflowId,
    },
    traceId: activityTraceId(),
  });

  return {
    workflowExecutionId: workflowExecution.id,
    approvalTimeoutMs,
  };
}

export async function classifyGuestRequest(
  input: ClassifyGuestRequestInput,
): Promise<ClassifyGuestRequestOutput> {
  const ai = createAIProvider();
  const request = toIncomingRequest(input.request);
  const tenant = await resolveTenantContext(input.tenantId);

  const classification = await ai.classifyRequest({
    tenant,
    channel: request.channel,
    rawText: request.rawText,
    guestContext: {
      guestName: request.guestName,
      roomNumber: request.roomNumber,
      reservationId: request.reservationId,
    },
  });

  const usage = latestUsageRecord(ai.getUsageRecords());
  const agentRun = await createAgentRun(
    input.tenantId,
    input.guestRequestId,
    'CLASSIFIER',
    request,
    classification,
    usage,
  );

  await updateGuestRequestStatus({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    status: 'CLASSIFYING',
    requestType: classification.requestType,
    priority: classification.priority,
    normalizedText: input.request.rawText.trim(),
  });

  await recordWorkflowStep({
    tenantId: input.tenantId,
    workflowExecutionId: input.workflowExecutionId,
    stepType: 'CLASSIFICATION',
    stepName: 'classify-guest-request',
    status: 'COMPLETED',
    input: { request },
    output: { classification, agentRunId: agentRun.id },
    durationMs: usage.latencyMs,
  });

  return {
    classification,
    agentRunId: agentRun.id,
  };
}

export async function planGuestRequest(
  input: PlanGuestRequestInput,
): Promise<PlanGuestRequestOutput> {
  const ai = createAIProvider();
  const request = toIncomingRequest(input.request);
  const tenant = await resolveTenantContext(input.tenantId);

  const plan = await ai.createPlan({
    tenant,
    requestType: input.classification.requestType,
    classification: input.classification,
    rawText: request.rawText,
    guestContext: {
      guestName: request.guestName,
      roomNumber: request.roomNumber,
      reservationId: request.reservationId,
    },
  });

  const usage = latestUsageRecord(ai.getUsageRecords());
  const agentRun = await createAgentRun(
    input.tenantId,
    input.guestRequestId,
    'PLANNER',
    {
      request,
      classification: input.classification,
    },
    plan,
    usage,
  );

  await updateGuestRequestStatus({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    status: 'PLANNING',
  });

  await recordWorkflowStep({
    tenantId: input.tenantId,
    workflowExecutionId: input.workflowExecutionId,
    stepType: 'PLANNING',
    stepName: 'plan-guest-request',
    status: 'COMPLETED',
    input: { classification: input.classification },
    output: { plan, agentRunId: agentRun.id },
    durationMs: usage.latencyMs,
  });

  return {
    plan,
    agentRunId: agentRun.id,
  };
}

export async function evaluateGuestRequestPolicy(
  input: EvaluatePolicyInput,
): Promise<EvaluatePolicyOutput> {
  const ai = createAIProvider();
  const request = toIncomingRequest(input.request);
  const tenant = await resolveTenantContext(input.tenantId);

  const policy = await ai.evaluatePolicy({
    tenant,
    requestType: input.classification.requestType,
    plan: input.plan,
    classification: input.classification,
    guestContext: {
      guestName: request.guestName,
      roomNumber: request.roomNumber,
      reservationId: request.reservationId,
    },
  });

  const usage = latestUsageRecord(ai.getUsageRecords());
  const agentRun = await createAgentRun(
    input.tenantId,
    input.guestRequestId,
    'POLICY',
    {
      classification: input.classification,
      plan: input.plan,
    },
    policy,
    usage,
  );

  await updateGuestRequestStatus({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    status: 'POLICY_REVIEW',
  });

  await recordWorkflowStep({
    tenantId: input.tenantId,
    workflowExecutionId: input.workflowExecutionId,
    stepType: 'POLICY',
    stepName: 'evaluate-guest-request-policy',
    status: 'COMPLETED',
    input: {
      classification: input.classification,
      plan: input.plan,
    },
    output: { policy, agentRunId: agentRun.id },
    durationMs: usage.latencyMs,
  });

  return {
    policy,
    agentRunId: agentRun.id,
  };
}

export async function updateGuestRequestStatus(
  input: UpdateGuestRequestStatusInput,
): Promise<void> {
  await prisma.guestRequest.update({
    where: {
      id: input.guestRequestId,
      tenantId: input.tenantId,
    },
    data: {
      status: input.status,
      requestType: input.requestType,
      priority: input.priority,
      normalizedText: input.normalizedText,
    },
  });
}

export async function recordWorkflowStep(
  input: RecordWorkflowStepInput,
): Promise<RecordWorkflowStepOutput> {
  const step = await prisma.workflowStep.create({
    data: {
      tenantId: input.tenantId,
      workflowExecutionId: input.workflowExecutionId,
      stepType: input.stepType,
      stepName: input.stepName,
      status: input.status,
      inputJson: asJson(input.input),
      outputJson: asJson(input.output),
      errorJson: asJson(input.error),
      startedAt: new Date(),
      completedAt: input.status === 'COMPLETED' || input.status === 'FAILED' ? new Date() : null,
      durationMs: input.durationMs,
    },
  });

  return { stepId: step.id };
}

export async function createHumanApproval(
  input: CreateHumanApprovalInput,
): Promise<CreateHumanApprovalOutput> {
  const approval = await prisma.humanApproval.create({
    data: {
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId: input.workflowExecutionId,
      actionType: input.actionType,
      reason: input.reason,
      status: 'PENDING',
    },
  });

  await updateGuestRequestStatus({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    status: 'WAITING_APPROVAL',
  });

  await recordWorkflowStep({
    tenantId: input.tenantId,
    workflowExecutionId: input.workflowExecutionId,
    stepType: 'APPROVAL',
    stepName: 'create-human-approval',
    status: 'RUNNING',
    input: {
      actionType: input.actionType,
      reason: input.reason,
    },
    output: { approvalId: approval.id },
  });

  await recordAuditEvent({
    tenantId: input.tenantId,
    actorType: 'SYSTEM',
    action: 'APPROVAL_REQUESTED',
    resourceType: 'human_approval',
    resourceId: approval.id,
    metadata: {
      guestRequestId: input.guestRequestId,
      actionType: input.actionType,
    },
  });

  return { approvalId: approval.id };
}

export async function resolveHumanApproval(input: ResolveHumanApprovalInput): Promise<void> {
  await prisma.humanApproval.update({
    where: { id: input.approvalId },
    data: {
      status: input.status,
      resolvedAt: new Date(),
      resolvedBy: input.decision.resolvedBy,
      resolutionNote: input.decision.note,
    },
  });

  await recordAuditEvent({
    tenantId: input.tenantId,
    actorType: 'HUMAN',
    actorId: input.decision.resolvedBy,
    action: input.status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
    resourceType: 'human_approval',
    resourceId: input.approvalId,
    metadata: {
      approved: input.decision.approved,
      note: input.decision.note,
    },
  });
}

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId,
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadataJson: asJson(input.metadata),
      traceId: input.traceId ?? activityTraceId(),
    },
  });
}

export async function enqueueFailureItem(
  input: EnqueueFailureItemInput,
): Promise<EnqueueFailureItemOutput> {
  const item = await prisma.failureQueueItem.create({
    data: {
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId: input.workflowExecutionId,
      failureType: input.failureType,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      payloadJson: asJson(input.payload),
      status: 'OPEN',
    },
  });

  await recordAuditEvent({
    tenantId: input.tenantId,
    actorType: 'SYSTEM',
    action: 'FAILURE_ENQUEUED',
    resourceType: 'failure_queue_item',
    resourceId: item.id,
    metadata: {
      failureType: input.failureType,
      errorCode: input.errorCode,
    },
  });

  return { failureQueueItemId: item.id };
}

export async function escalateGuestRequest(
  input: EscalateGuestRequestInput,
): Promise<EscalateGuestRequestOutput> {
  const ai = createAIProvider();
  const tenant = await resolveTenantContext(input.tenantId);

  const escalationSummary = await ai.summarizeEscalation({
    tenant,
    rawText: input.rawText,
    errorMessage: input.reason,
    executionResults: input.completedActions.map((taskId) => ({
      taskId,
      success: true,
      durationMs: 0,
    })),
  });

  const usage = latestUsageRecord(ai.getUsageRecords());
  const agentRun = await createAgentRun(
    input.tenantId,
    input.guestRequestId,
    'ESCALATION',
    {
      reason: input.reason,
      stepsAttempted: input.stepsAttempted,
      completedActions: input.completedActions,
      failedActions: input.failedActions,
    },
    escalationSummary,
    usage,
  );

  await updateGuestRequestStatus({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    status: 'ESCALATED',
  });

  await recordWorkflowStep({
    tenantId: input.tenantId,
    workflowExecutionId: input.workflowExecutionId,
    stepType: 'ESCALATION',
    stepName: 'escalate-guest-request',
    status: 'COMPLETED',
    input: {
      reason: input.reason,
      stepsAttempted: input.stepsAttempted,
    },
    output: {
      escalationSummary,
      agentRunId: agentRun.id,
    },
    durationMs: usage.latencyMs,
  });

  await recordAuditEvent({
    tenantId: input.tenantId,
    actorType: 'SYSTEM',
    action: 'REQUEST_ESCALATED',
    resourceType: 'guest_request',
    resourceId: input.guestRequestId,
    metadata: {
      reason: input.reason,
      escalationSummary,
    },
  });

  return {
    escalationSummary,
    agentRunId: agentRun.id,
  };
}

export async function finalizeGuestRequest(
  input: FinalizeGuestRequestInput,
): Promise<FinalizeGuestRequestOutput> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: input.workflowExecutionId },
  });

  const totalDurationMs =
    input.totalDurationMs > 0
      ? input.totalDurationMs
      : execution
        ? Date.now() - execution.startedAt.getTime()
        : 0;

  await updateGuestRequestStatus({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    status: input.status,
  });

  await prisma.workflowExecution.update({
    where: { id: input.workflowExecutionId },
    data: {
      status: input.status === 'COMPLETED' || input.status === 'PARTIALLY_COMPLETED' ? 'COMPLETED' : 'FAILED',
      completedAt: new Date(),
      failureReason: input.failureReason,
      totalDurationMs,
    },
  });

  await recordWorkflowStep({
    tenantId: input.tenantId,
    workflowExecutionId: input.workflowExecutionId,
    stepType: 'FINALIZATION',
    stepName: 'finalize-guest-request',
    status: 'COMPLETED',
    input: {
      status: input.status,
      executionResults: input.executionResults,
      verificationResults: input.verificationResults,
    },
    output: {
      guestRequestId: input.guestRequestId,
      status: input.status,
    },
    durationMs: input.totalDurationMs,
  });

  await recordAuditEvent({
    tenantId: input.tenantId,
    actorType: 'SYSTEM',
    action: 'WORKFLOW_FINALIZED',
    resourceType: 'guest_request',
    resourceId: input.guestRequestId,
    metadata: {
      status: input.status,
      failureReason: input.failureReason,
    },
  });

  return {
    guestRequestId: input.guestRequestId,
    status: input.status,
  };
}

export function buildReceiptId(taskId: string): string {
  return `receipt-${taskId}-${randomUUID()}`;
}
