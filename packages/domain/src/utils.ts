import { createHash } from 'crypto';

export function hashRequestBody(body: unknown): string {
  const normalized = JSON.stringify(body, Object.keys(body as object).sort());
  return createHash('sha256').update(normalized).digest('hex');
}

export function buildWorkflowId(tenantId: string, idempotencyKey: string): string {
  return `guest-request-${tenantId}-${idempotencyKey}`;
}

export function buildBrowserReceiptKey(
  tenantId: string,
  workflowId: string,
  taskId: string,
): string {
  return `${tenantId}:${workflowId}:${taskId}`;
}

export function estimateTokenCost(inputTokens: number, outputTokens: number): number {
  const inputRate = 0.00015 / 1000;
  const outputRate = 0.0006 / 1000;
  return inputTokens * inputRate + outputTokens * outputRate;
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[\w.-]+/gi, 'Bearer [REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'api_key=[REDACTED]');
}
