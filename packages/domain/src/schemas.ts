import { z } from 'zod';

export const RequestChannelSchema = z.enum(['WEB', 'SMS', 'EMAIL', 'VOICE_TRANSCRIPT']);
export type RequestChannel = z.infer<typeof RequestChannelSchema>;

export const RequestTypeSchema = z.enum([
  'HOUSEKEEPING',
  'MAINTENANCE',
  'WAKE_UP_CALL',
  'RESTAURANT_BOOKING',
  'RESERVATION_MODIFICATION',
  'RESERVATION_CANCELLATION',
  'MULTI_ACTION',
  'UNSUPPORTED',
]);
export type RequestType = z.infer<typeof RequestTypeSchema>;

export const RequestStatusSchema = z.enum([
  'RECEIVED',
  'CLASSIFYING',
  'PLANNING',
  'POLICY_REVIEW',
  'WAITING_APPROVAL',
  'EXECUTING',
  'VERIFYING',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'FAILED',
  'ESCALATED',
  'CANCELLED',
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const AgentTypeSchema = z.enum([
  'CLASSIFIER',
  'PLANNER',
  'POLICY',
  'EXECUTOR',
  'VERIFIER',
  'ESCALATION',
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const WorkflowStepTypeSchema = z.enum([
  'INGESTION',
  'CLASSIFICATION',
  'PLANNING',
  'POLICY',
  'APPROVAL',
  'EXECUTION',
  'VERIFICATION',
  'COMPENSATION',
  'ESCALATION',
  'FINALIZATION',
]);
export type WorkflowStepType = z.infer<typeof WorkflowStepTypeSchema>;

export const UserRoleSchema = z.enum(['TENANT_ADMIN', 'OPERATOR', 'VIEWER', 'SYSTEM_ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const TaskTypeSchema = z.enum([
  'CREATE_HOUSEKEEPING_REQUEST',
  'CREATE_MAINTENANCE_TICKET',
  'CREATE_WAKE_UP_CALL',
  'CREATE_RESTAURANT_BOOKING',
  'MODIFY_RESERVATION',
  'CANCEL_RESERVATION',
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'TIMED_OUT']);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const FailureQueueStatusSchema = z.enum([
  'OPEN',
  'INVESTIGATING',
  'REQUEUED',
  'RESOLVED',
  'IGNORED',
]);
export type FailureQueueStatus = z.infer<typeof FailureQueueStatusSchema>;

export const CircuitStateSchema = z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']);
export type CircuitState = z.infer<typeof CircuitStateSchema>;

export const IncomingRequestSchema = z.object({
  channel: RequestChannelSchema,
  rawText: z.string().min(1).max(10000),
  guestName: z.string().optional(),
  roomNumber: z.string().optional(),
  reservationId: z.string().optional(),
  externalRequestId: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});
export type IncomingRequest = z.infer<typeof IncomingRequestSchema>;

export const ClassificationResultSchema = z.object({
  requestType: RequestTypeSchema,
  confidence: z.number().min(0).max(1),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  entities: z.record(z.unknown()),
  requiresHumanReview: z.boolean(),
  reasoning: z.string(),
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export const PlannedTaskSchema = z.object({
  taskId: z.string(),
  taskType: TaskTypeSchema,
  parameters: z.record(z.unknown()),
  executionOrder: z.number().int().positive(),
  dependencies: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(120000),
  maxRetries: z.number().int().nonnegative().default(3),
  verificationMethod: z.string(),
  compensationStrategy: z.string().optional(),
  requiresApproval: z.boolean().default(false),
});
export type PlannedTask = z.infer<typeof PlannedTaskSchema>;

export const ExecutionPlanSchema = z.object({
  planId: z.string(),
  tasks: z.array(PlannedTaskSchema).min(1),
  estimatedDurationMs: z.number().int().positive(),
  summary: z.string(),
});
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export const PolicyDecisionSchema = z.object({
  approved: z.boolean(),
  requiresApproval: z.boolean(),
  escalationRequired: z.boolean(),
  reasons: z.array(z.string()),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  blockedTasks: z.array(z.string()).default([]),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const ExecutionResultSchema = z.object({
  taskId: z.string(),
  success: z.boolean(),
  receiptId: z.string().optional(),
  evidence: z.record(z.unknown()).optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
});
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

export const VerificationResultSchema = z.object({
  taskId: z.string(),
  verified: z.boolean(),
  expected: z.record(z.unknown()),
  observed: z.record(z.unknown()),
  screenshotKey: z.string().optional(),
  receiptId: z.string().optional(),
  failureReason: z.string().optional(),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const EscalationSummarySchema = z.object({
  summary: z.string(),
  originalRequest: z.string(),
  understoodIntent: z.string(),
  stepsAttempted: z.array(z.string()),
  completedActions: z.array(z.string()),
  failedActions: z.array(z.string()),
  requiredDecision: z.string(),
  recommendedNextStep: z.string(),
});
export type EscalationSummary = z.infer<typeof EscalationSummarySchema>;

export const BrowserEvidenceSchema = z.object({
  taskId: z.string(),
  actionType: z.string(),
  receiptId: z.string(),
  screenshotBeforeKey: z.string().optional(),
  screenshotAfterKey: z.string(),
  confirmationMessage: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type BrowserEvidence = z.infer<typeof BrowserEvidenceSchema>;

export const WorkflowProgressSchema = z.object({
  status: RequestStatusSchema,
  currentStep: z.string().optional(),
  completedSteps: z.array(z.string()),
  pendingApproval: z.boolean(),
  errorMessage: z.string().optional(),
});
export type WorkflowProgress = z.infer<typeof WorkflowProgressSchema>;

export const FailureInjectionConfigSchema = z.object({
  pmsMaintenanceMode: z.boolean().default(false),
  pmsLatencyMs: z.number().int().nonnegative().default(0),
  pmsErrorRate: z.number().min(0).max(1).default(0),
  pmsFailNext: z.boolean().default(false),
  browserCrashBeforeAction: z.boolean().default(false),
  browserCrashAfterAction: z.boolean().default(false),
  browserSelectorTimeout: z.boolean().default(false),
  aiProviderTimeout: z.boolean().default(false),
  aiProviderMalformedResponse: z.boolean().default(false),
  verificationMismatch: z.boolean().default(false),
  redisUnavailable: z.boolean().default(false),
  approvalTimeout: z.boolean().default(false),
  slowBrowserActivity: z.boolean().default(false),
  partialFailureMultiAction: z.boolean().default(false),
});
export type FailureInjectionConfig = z.infer<typeof FailureInjectionConfigSchema>;

export const ApprovalDecisionSignalSchema = z.object({
  approvalId: z.string(),
  approved: z.boolean(),
  resolvedBy: z.string(),
  note: z.string().optional(),
});
export type ApprovalDecisionSignal = z.infer<typeof ApprovalDecisionSignalSchema>;

export const WorkflowInputSchema = z.object({
  tenantId: z.string().uuid(),
  guestRequestId: z.string().uuid(),
  idempotencyKey: z.string(),
  channel: RequestChannelSchema,
  rawText: z.string(),
  guestName: z.string().optional(),
  roomNumber: z.string().optional(),
  reservationId: z.string().optional(),
});
export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    traceId: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
