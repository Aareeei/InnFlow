export class InnFlowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 500,
    public readonly retryable: boolean = false,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends InnFlowError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, false, details);
  }
}

export class AuthenticationError extends InnFlowError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, false);
  }
}

export class AuthorizationError extends InnFlowError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403, false);
  }
}

export class TenantIsolationError extends InnFlowError {
  constructor(message = 'Cross-tenant access denied') {
    super(message, 'TENANT_ISOLATION_ERROR', 403, false);
  }
}

export class IdempotencyConflictError extends InnFlowError {
  constructor(message = 'Idempotency key conflict') {
    super(message, 'IDEMPOTENCY_CONFLICT', 409, false);
  }
}

export class DependencyUnavailableError extends InnFlowError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DEPENDENCY_UNAVAILABLE', 503, true, details);
  }
}

export class BrowserAutomationError extends InnFlowError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BROWSER_AUTOMATION_ERROR', 500, true, details);
  }
}

export class BrowserVerificationError extends InnFlowError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BROWSER_VERIFICATION_ERROR', 500, true, details);
  }
}

export class AIProviderTimeoutError extends InnFlowError {
  constructor(message = 'AI provider timeout') {
    super(message, 'AI_PROVIDER_TIMEOUT', 504, true);
  }
}

export class AIProviderMalformedResponseError extends InnFlowError {
  constructor(message = 'AI provider returned malformed response') {
    super(message, 'AI_PROVIDER_MALFORMED', 502, false);
  }
}

export class PolicyRejectedError extends InnFlowError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'POLICY_REJECTED', 422, false, details);
  }
}

export class ApprovalTimeoutError extends InnFlowError {
  constructor(message = 'Human approval timed out') {
    super(message, 'APPROVAL_TIMEOUT', 408, false);
  }
}

export class NonRetryableWorkflowError extends InnFlowError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NON_RETRYABLE_WORKFLOW_ERROR', 500, false, details);
  }
}

export class CircuitOpenError extends InnFlowError {
  constructor(message = 'Circuit breaker is open') {
    super(message, 'CIRCUIT_OPEN', 503, true);
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof InnFlowError) return error.retryable;
  return false;
}
