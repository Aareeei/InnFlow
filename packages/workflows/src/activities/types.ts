import type {
  ApprovalDecisionSignal,
  ClassificationResult,
  EscalationSummary,
  ExecutionPlan,
  ExecutionResult,
  IncomingRequest,
  PolicyDecision,
  PlannedTask,
  RequestStatus,
  VerificationResult,
  WorkflowInput,
  WorkflowProgress,
} from '@innflow/domain';

export interface InitializeWorkflowInput {
  input: WorkflowInput;
  temporalWorkflowId: string;
  temporalRunId: string;
}

export interface InitializeWorkflowOutput {
  workflowExecutionId: string;
  approvalTimeoutMs: number;
}

export interface ClassifyGuestRequestInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  request: IncomingRequest;
}

export interface ClassifyGuestRequestOutput {
  classification: ClassificationResult;
  agentRunId: string;
}

export interface PlanGuestRequestInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  request: IncomingRequest;
  classification: ClassificationResult;
}

export interface PlanGuestRequestOutput {
  plan: ExecutionPlan;
  agentRunId: string;
}

export interface EvaluatePolicyInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  request: IncomingRequest;
  classification: ClassificationResult;
  plan: ExecutionPlan;
}

export interface EvaluatePolicyOutput {
  policy: PolicyDecision;
  agentRunId: string;
}

export interface UpdateGuestRequestStatusInput {
  tenantId: string;
  guestRequestId: string;
  status: RequestStatus;
  requestType?: string;
  priority?: string;
  normalizedText?: string;
}

export interface RecordWorkflowStepInput {
  tenantId: string;
  workflowExecutionId: string;
  stepType: string;
  stepName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  durationMs?: number;
}

export interface RecordWorkflowStepOutput {
  stepId: string;
}

export interface CreateHumanApprovalInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  actionType: string;
  reason: string;
}

export interface CreateHumanApprovalOutput {
  approvalId: string;
}

export interface ResolveHumanApprovalInput {
  tenantId: string;
  approvalId: string;
  decision: ApprovalDecisionSignal;
  status: 'APPROVED' | 'REJECTED' | 'TIMED_OUT';
}

export interface RecordAuditEventInput {
  tenantId: string;
  actorType: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  traceId?: string;
}

export interface EnqueueFailureItemInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  failureType: string;
  errorCode: string;
  errorMessage: string;
  payload?: Record<string, unknown>;
}

export interface EnqueueFailureItemOutput {
  failureQueueItemId: string;
}

export interface EscalateGuestRequestInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  reason: string;
  stepsAttempted: string[];
  completedActions: string[];
  failedActions: string[];
  rawText: string;
}

export interface EscalateGuestRequestOutput {
  escalationSummary: EscalationSummary;
  agentRunId: string;
}

export interface FinalizeGuestRequestInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  status: RequestStatus;
  failureReason?: string;
  totalDurationMs: number;
  executionResults: ExecutionResult[];
  verificationResults: VerificationResult[];
}

export interface FinalizeGuestRequestOutput {
  guestRequestId: string;
  status: RequestStatus;
}

export interface ExecuteBrowserTaskInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  temporalWorkflowId: string;
  task: PlannedTask;
}

export interface VerifyBrowserTaskInput {
  tenantId: string;
  guestRequestId: string;
  workflowExecutionId: string;
  temporalWorkflowId: string;
  task: PlannedTask;
  executionResult: ExecutionResult;
}

export interface WorkflowResult {
  guestRequestId: string;
  status: RequestStatus;
  progress: WorkflowProgress;
  executionResults: ExecutionResult[];
  verificationResults: VerificationResult[];
  escalationSummary?: EscalationSummary;
}
