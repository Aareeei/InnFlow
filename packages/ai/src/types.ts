import type {
  ClassificationResult,
  ExecutionPlan,
  ExecutionResult,
  IncomingRequest,
  PolicyDecision,
  EscalationSummary,
  RequestType,
} from '@innflow/domain';

export interface GuestContext {
  guestName?: string;
  roomNumber?: string;
  reservationId?: string;
}

export interface TenantContext {
  tenantId: string;
  timezone: string;
}

export interface ClassifyInput {
  tenant: TenantContext;
  channel: IncomingRequest['channel'];
  rawText: string;
  guestContext: GuestContext;
}

export interface PlanInput {
  tenant: TenantContext;
  requestType: RequestType;
  classification: ClassificationResult;
  rawText: string;
  guestContext: GuestContext;
}

export interface PolicyInput {
  tenant: TenantContext;
  requestType: RequestType;
  plan: ExecutionPlan;
  classification: ClassificationResult;
  guestContext: GuestContext;
}

export interface EscalationInput {
  tenant: TenantContext;
  rawText: string;
  classification?: ClassificationResult;
  plan?: ExecutionPlan;
  executionResults: ExecutionResult[];
  errorMessage?: string;
}

export type AIProviderOperation =
  | 'classifyRequest'
  | 'createPlan'
  | 'evaluatePolicy'
  | 'summarizeEscalation';

export interface AIProviderUsageRecord {
  operation: AIProviderOperation;
  tokenInput: number;
  tokenOutput: number;
  estimatedCostUsd: number;
  latencyMs: number;
  promptVersion: string;
  provider: string;
  model: string;
}

export interface AIProvider {
  classifyRequest(input: ClassifyInput): Promise<ClassificationResult>;
  createPlan(input: PlanInput): Promise<ExecutionPlan>;
  evaluatePolicy(input: PolicyInput): Promise<PolicyDecision>;
  summarizeEscalation(input: EscalationInput): Promise<EscalationSummary>;
  getUsageRecords(): readonly AIProviderUsageRecord[];
}

export interface FailureInjectionFlags {
  timeout?: boolean;
  malformedResponse?: boolean;
}

export interface MockAIProviderOptions {
  latencyMs?: number;
  failureInjection?: FailureInjectionFlags;
}

export interface OpenAIProviderOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
}
