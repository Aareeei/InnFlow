import type { ExecuteBrowserTaskInput } from '@innflow/workflows';

export function buildDeterministicReceiptId(input: ExecuteBrowserTaskInput): string {
  return `receipt-${input.temporalWorkflowId}-${input.task.taskId}`;
}
