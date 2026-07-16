import type {
  ApprovalStatus,
  FailureInjectionConfig,
  FailureQueueStatus,
  RequestStatus,
  RequestType,
  UserRole,
} from '@innflow/domain';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  tenantName?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type GuestRequestSummary = {
  id: string;
  channel: string;
  rawText: string;
  requestType: RequestType | null;
  status: RequestStatus;
  priority: string;
  guestName: string | null;
  roomNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuestRequestDetail = GuestRequestSummary & {
  normalizedText: string | null;
  reservationId: string | null;
  externalRequestId: string | null;
  workflowExecutionId: string | null;
  timeline: TimelineEvent[];
  agentRuns: AgentRunSummary[];
  artifacts: ExecutionArtifact[];
};

export type TimelineEvent = {
  id: string;
  stepType: string;
  stepName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage?: string;
};

export type AgentRunSummary = {
  id: string;
  guestRequestId: string;
  agentType: string;
  provider: string;
  model: string;
  status: string;
  tokenInput: number;
  tokenOutput: number;
  estimatedCostUsd: number;
  latencyMs: number;
  errorMessage: string | null;
  createdAt: string;
  outputJson: Record<string, unknown> | null;
};

export type ExecutionArtifact = {
  id: string;
  artifactType: string;
  storageKey: string;
  contentType: string;
  url?: string;
  createdAt: string;
};

export type WorkflowExecutionDetail = {
  id: string;
  guestRequestId: string;
  temporalWorkflowId: string;
  temporalRunId: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  retryCount: number;
  totalDurationMs: number | null;
  steps: TimelineEvent[];
  artifacts: ExecutionArtifact[];
};

export type HumanApproval = {
  id: string;
  guestRequestId: string;
  workflowExecutionId: string;
  actionType: string;
  reason: string;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
  guestName?: string;
  roomNumber?: string;
};

export type FailureQueueItem = {
  id: string;
  guestRequestId: string;
  workflowExecutionId: string;
  failureType: string;
  errorCode: string;
  errorMessage: string;
  status: FailureQueueStatus;
  retryCount: number;
  firstFailedAt: string;
  lastFailedAt: string;
  resolvedAt: string | null;
};

export type AuditEvent = {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadataJson: Record<string, unknown> | null;
  traceId: string | null;
  createdAt: string;
};

export type OverviewMetrics = {
  kpis: {
    activeRequests: number;
    completedToday: number;
    pendingApprovals: number;
    openFailures: number;
    avgCompletionMs: number;
    successRate: number;
  };
  requestVolume: Array<{ date: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    resourceId?: string;
  }>;
};

export type SystemHealth = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    latencyMs?: number;
    message?: string;
  }>;
  circuits: Array<{
    name: string;
    state: string;
    failureCount: number;
  }>;
};

export type TenantSettings = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  failureInjection?: FailureInjectionConfig;
};

export type StreamEvent = {
  type: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    traceId?: string;
  };
};
