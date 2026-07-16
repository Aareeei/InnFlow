import { ApplicationFailure } from '@temporalio/activity';
import { BrowserAutomationError } from '@innflow/domain';
import type { ExecutionResult, VerificationResult } from '@innflow/domain';
import type { ExecuteBrowserTaskInput, VerifyBrowserTaskInput } from './types.js';

export async function executeBrowserTask(
  input: ExecuteBrowserTaskInput,
): Promise<ExecutionResult> {
  throw ApplicationFailure.nonRetryable(
    new BrowserAutomationError(
      'executeBrowserTask must be executed by the innflow-browser-automation worker',
      {
        taskId: input.task.taskId,
        taskType: input.task.taskType,
        temporalWorkflowId: input.temporalWorkflowId,
      },
    ).message,
    'BROWSER_WORKER_REQUIRED',
  );
}

export async function verifyBrowserTask(
  input: VerifyBrowserTaskInput,
): Promise<VerificationResult> {
  throw ApplicationFailure.nonRetryable(
    new BrowserAutomationError(
      'verifyBrowserTask must be executed by the innflow-browser-automation worker',
      {
        taskId: input.task.taskId,
        taskType: input.task.taskType,
        temporalWorkflowId: input.temporalWorkflowId,
      },
    ).message,
    'BROWSER_WORKER_REQUIRED',
  );
}
