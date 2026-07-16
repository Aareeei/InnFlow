import {
  condition,
  proxyActivities,
  setHandler,
  workflowInfo,
} from '@temporalio/workflow';
import type {
  ApprovalDecisionSignal,
  ClassificationResult,
  EscalationSummary,
  ExecutionPlan,
  ExecutionResult,
  IncomingRequest,
  PolicyDecision,
  RequestStatus,
  VerificationResult,
  WorkflowInput,
  WorkflowProgress,
  PlannedTask,
} from '@innflow/domain';
import { TASK_QUEUES } from '@innflow/config';
import type * as browserActivities from '../activities/browser-proxy.activities.js';
import type * as orchestrationActivities from '../activities/orchestration.activities.js';
import type { WorkflowResult } from '../activities/types.js';
import { progressQuery } from '../queries.js';
import {
  approvalDecisionSignal,
  cancelSignal,
  manualRetrySignal,
  type ManualRetrySignalPayload,
} from '../signals.js';

const orchestration = proxyActivities<typeof orchestrationActivities>({
  startToCloseTimeout: '2 minutes',
  retry: {
    maximumAttempts: 3,
  },
});

const browser = proxyActivities<typeof browserActivities>({
  taskQueue: TASK_QUEUES.BROWSER,
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 2,
  },
});

function buildRequest(input: WorkflowInput): IncomingRequest {
  return {
    channel: input.channel,
    rawText: input.rawText,
    guestName: input.guestName,
    roomNumber: input.roomNumber,
    reservationId: input.reservationId,
    priority: 'NORMAL',
  };
}

function sortTasksByOrder(tasks: PlannedTask[]): PlannedTask[] {
  return [...tasks].sort((left, right) => left.executionOrder - right.executionOrder);
}

function deriveExecutionStatus(
  cancelled: boolean,
  successCount: number,
  totalCount: number,
  verificationResults: VerificationResult[],
): RequestStatus {
  if (cancelled) {
    return 'CANCELLED';
  }

  if (successCount === 0 && totalCount > 0) {
    return 'FAILED';
  }

  const hasVerificationFailures = verificationResults.some((result) => !result.verified);
  if (successCount < totalCount || hasVerificationFailures) {
    return 'PARTIALLY_COMPLETED';
  }

  return 'COMPLETED';
}

async function executeTaskWithRetries(
  input: WorkflowInput,
  workflowExecutionId: string,
  temporalWorkflowId: string,
  task: PlannedTask,
  isMultiAction: boolean,
  shouldRetryTask: () => boolean,
  onManualRetryConsumed: () => void,
): Promise<ExecutionResult> {
  const maxAttempts = task.maxRetries + 1;
  let lastResult: ExecutionResult = {
    taskId: task.taskId,
    success: false,
    errorMessage: 'Task not executed',
    durationMs: 0,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (shouldRetryTask()) {
      onManualRetryConsumed();
    }

    lastResult = await browser.executeBrowserTask({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      temporalWorkflowId,
      task,
    });

    if (lastResult.success) {
      return lastResult;
    }

    if (!isMultiAction && attempt === maxAttempts) {
      return lastResult;
    }
  }

  return lastResult;
}

export async function HotelGuestRequestWorkflow(
  input: WorkflowInput,
): Promise<WorkflowResult> {
  const temporalWorkflowId = workflowInfo().workflowId;
  const temporalRunId = workflowInfo().runId;
  const request = buildRequest(input);

  let progress: WorkflowProgress = {
    status: 'RECEIVED',
    currentStep: 'INGESTION',
    completedSteps: [],
    pendingApproval: false,
  };

  let cancelled = false;
  let approvalDecision: ApprovalDecisionSignal | null = null;
  let manualRetryPayload: ManualRetrySignalPayload | undefined;
  let escalationSummary: EscalationSummary | undefined;

  setHandler(approvalDecisionSignal, (decision) => {
    approvalDecision = decision;
  });

  setHandler(cancelSignal, () => {
    cancelled = true;
  });

  setHandler(manualRetrySignal, (payload) => {
    manualRetryPayload = payload;
  });

  setHandler(progressQuery, () => progress);

  const initialization = await orchestration.initializeWorkflowExecution({
    input,
    temporalWorkflowId,
    temporalRunId,
  });

  const { workflowExecutionId, approvalTimeoutMs } = initialization;
  const stepsAttempted: string[] = [];

  if (cancelled) {
    const status: RequestStatus = 'CANCELLED';
    progress = {
      ...progress,
      status,
      currentStep: 'FINALIZATION',
      errorMessage: 'Workflow cancelled before processing',
    };

    const finalized = await orchestration.finalizeGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      status,
      failureReason: progress.errorMessage,
      totalDurationMs: 0,
      executionResults: [],
      verificationResults: [],
    });

    progress.completedSteps.push('FINALIZATION');

    return {
      guestRequestId: finalized.guestRequestId,
      status: finalized.status,
      progress,
      executionResults: [],
      verificationResults: [],
    };
  }

  progress = {
    ...progress,
    status: 'CLASSIFYING',
    currentStep: 'CLASSIFICATION',
  };

  const classificationResult = await orchestration.classifyGuestRequest({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    workflowExecutionId,
    request,
  });

  const classification: ClassificationResult = classificationResult.classification;
  stepsAttempted.push('CLASSIFICATION');
  progress.completedSteps.push('CLASSIFICATION');

  if (classification.requestType === 'UNSUPPORTED') {
    const escalation = await orchestration.escalateGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      reason: 'Unsupported guest request',
      stepsAttempted,
      completedActions: [],
      failedActions: ['classification'],
      rawText: input.rawText,
    });

    escalationSummary = escalation.escalationSummary;
    progress = {
      ...progress,
      status: 'ESCALATED',
      currentStep: 'ESCALATION',
      errorMessage: classification.reasoning,
    };
    progress.completedSteps.push('ESCALATION');

    const finalized = await orchestration.finalizeGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      status: 'ESCALATED',
      failureReason: classification.reasoning,
      totalDurationMs: 0,
      executionResults: [],
      verificationResults: [],
    });

    progress.completedSteps.push('FINALIZATION');

    return {
      guestRequestId: finalized.guestRequestId,
      status: finalized.status,
      progress,
      executionResults: [],
      verificationResults: [],
      escalationSummary,
    };
  }

  progress = {
    ...progress,
    status: 'PLANNING',
    currentStep: 'PLANNING',
  };

  const planResult = await orchestration.planGuestRequest({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    workflowExecutionId,
    request,
    classification,
  });

  const plan: ExecutionPlan = planResult.plan;
  stepsAttempted.push('PLANNING');
  progress.completedSteps.push('PLANNING');

  progress = {
    ...progress,
    status: 'POLICY_REVIEW',
    currentStep: 'POLICY',
  };

  const policyResult = await orchestration.evaluateGuestRequestPolicy({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    workflowExecutionId,
    request,
    classification,
    plan,
  });

  const policy: PolicyDecision = policyResult.policy;
  stepsAttempted.push('POLICY');
  progress.completedSteps.push('POLICY');

  if (!policy.approved && !policy.requiresApproval) {
    const escalation = await orchestration.escalateGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      reason: policy.reasons.join('; ') || 'Policy rejected request',
      stepsAttempted,
      completedActions: ['classification', 'planning'],
      failedActions: ['policy'],
      rawText: input.rawText,
    });

    escalationSummary = escalation.escalationSummary;
    progress = {
      ...progress,
      status: 'ESCALATED',
      currentStep: 'ESCALATION',
      errorMessage: policy.reasons.join('; '),
    };
    progress.completedSteps.push('ESCALATION');

    const finalized = await orchestration.finalizeGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      status: 'ESCALATED',
      failureReason: progress.errorMessage,
      totalDurationMs: 0,
      executionResults: [],
      verificationResults: [],
    });

    progress.completedSteps.push('FINALIZATION');

    return {
      guestRequestId: finalized.guestRequestId,
      status: finalized.status,
      progress,
      executionResults: [],
      verificationResults: [],
      escalationSummary,
    };
  }

  const requiresApproval =
    policy.requiresApproval || plan.tasks.some((task) => task.requiresApproval);

  if (requiresApproval && !cancelled) {
    progress = {
      ...progress,
      status: 'WAITING_APPROVAL',
      currentStep: 'APPROVAL',
      pendingApproval: true,
    };

    const approval = await orchestration.createHumanApproval({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      actionType: classification.requestType,
      reason: policy.reasons.join('; ') || 'Human approval required before execution',
    });

    const approvalReceived = await condition(
      () => cancelled || approvalDecision !== null,
      approvalTimeoutMs,
    );

    if (!approvalReceived) {
      await orchestration.resolveHumanApproval({
        tenantId: input.tenantId,
        approvalId: approval.approvalId,
        decision: {
          approvalId: approval.approvalId,
          approved: false,
          resolvedBy: 'system',
          note: 'Approval timed out',
        },
        status: 'TIMED_OUT',
      });

      const escalation = await orchestration.escalateGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        reason: 'Human approval timed out',
        stepsAttempted: [...stepsAttempted, 'APPROVAL'],
        completedActions: stepsAttempted,
        failedActions: ['approval'],
        rawText: input.rawText,
      });

      escalationSummary = escalation.escalationSummary;
      progress = {
        ...progress,
        status: 'ESCALATED',
        currentStep: 'ESCALATION',
        pendingApproval: false,
        errorMessage: 'Human approval timed out',
      };
      progress.completedSteps.push('ESCALATION');

      const finalized = await orchestration.finalizeGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        status: 'ESCALATED',
        failureReason: progress.errorMessage,
        totalDurationMs: 0,
        executionResults: [],
        verificationResults: [],
      });

      progress.completedSteps.push('FINALIZATION');

      return {
        guestRequestId: finalized.guestRequestId,
        status: finalized.status,
        progress,
        executionResults: [],
        verificationResults: [],
        escalationSummary,
      };
    }

    if (cancelled) {
      const status: RequestStatus = 'CANCELLED';
      progress = {
        ...progress,
        status,
        currentStep: 'FINALIZATION',
        pendingApproval: false,
        errorMessage: 'Workflow cancelled while waiting for approval',
      };

      const finalized = await orchestration.finalizeGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        status,
        failureReason: progress.errorMessage,
        totalDurationMs: 0,
        executionResults: [],
        verificationResults: [],
      });

      progress.completedSteps.push('FINALIZATION');

      return {
        guestRequestId: finalized.guestRequestId,
        status: finalized.status,
        progress,
        executionResults: [],
        verificationResults: [],
      };
    }

    if (approvalDecision === null) {
      throw new Error('Approval decision missing after condition resolved');
    }

    const decision: ApprovalDecisionSignal = approvalDecision;

    if (decision.approvalId !== approval.approvalId) {
      progress = {
        ...progress,
        status: 'ESCALATED',
        currentStep: 'ESCALATION',
        pendingApproval: false,
        errorMessage: 'Approval decision did not match pending approval',
      };

      const escalation = await orchestration.escalateGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        reason: progress.errorMessage ?? 'Approval mismatch',
        stepsAttempted: [...stepsAttempted, 'APPROVAL'],
        completedActions: stepsAttempted,
        failedActions: ['approval'],
        rawText: input.rawText,
      });

      escalationSummary = escalation.escalationSummary;
      progress.completedSteps.push('ESCALATION');

      const finalized = await orchestration.finalizeGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        status: 'ESCALATED',
        failureReason: progress.errorMessage,
        totalDurationMs: 0,
        executionResults: [],
        verificationResults: [],
      });

      progress.completedSteps.push('FINALIZATION');

      return {
        guestRequestId: finalized.guestRequestId,
        status: finalized.status,
        progress,
        executionResults: [],
        verificationResults: [],
        escalationSummary,
      };
    }

    if (!decision.approved) {
      await orchestration.resolveHumanApproval({
        tenantId: input.tenantId,
        approvalId: approval.approvalId,
        decision,
        status: 'REJECTED',
      });

      const escalation = await orchestration.escalateGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        reason: decision.note ?? 'Human approval rejected',
        stepsAttempted: [...stepsAttempted, 'APPROVAL'],
        completedActions: stepsAttempted,
        failedActions: ['approval'],
        rawText: input.rawText,
      });

      escalationSummary = escalation.escalationSummary;
      progress = {
        ...progress,
        status: 'ESCALATED',
        currentStep: 'ESCALATION',
        pendingApproval: false,
        errorMessage: decision.note ?? 'Human approval rejected',
      };
      progress.completedSteps.push('ESCALATION');

      const finalized = await orchestration.finalizeGuestRequest({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        status: 'ESCALATED',
        failureReason: progress.errorMessage,
        totalDurationMs: 0,
        executionResults: [],
        verificationResults: [],
      });

      progress.completedSteps.push('FINALIZATION');

      return {
        guestRequestId: finalized.guestRequestId,
        status: finalized.status,
        progress,
        executionResults: [],
        verificationResults: [],
        escalationSummary,
      };
    }

    await orchestration.resolveHumanApproval({
      tenantId: input.tenantId,
      approvalId: approval.approvalId,
      decision,
      status: 'APPROVED',
    });

    stepsAttempted.push('APPROVAL');
    progress = {
      ...progress,
      pendingApproval: false,
    };
    progress.completedSteps.push('APPROVAL');
  }

  if (cancelled) {
    const status: RequestStatus = 'CANCELLED';
    progress = {
      ...progress,
      status,
      currentStep: 'FINALIZATION',
      errorMessage: 'Workflow cancelled before execution',
    };

    const finalized = await orchestration.finalizeGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      status,
      failureReason: progress.errorMessage,
      totalDurationMs: 0,
      executionResults: [],
      verificationResults: [],
    });

    progress.completedSteps.push('FINALIZATION');

    return {
      guestRequestId: finalized.guestRequestId,
      status: finalized.status,
      progress,
      executionResults: [],
      verificationResults: [],
      escalationSummary,
    };
  }

  progress = {
    ...progress,
    status: 'EXECUTING',
    currentStep: 'EXECUTION',
  };

  const isMultiAction = classification.requestType === 'MULTI_ACTION';
  const executableTasks = sortTasksByOrder(
    plan.tasks.filter((task) => !policy.blockedTasks.includes(task.taskId)),
  );

  const executionResults: ExecutionResult[] = [];
  const completedActions: string[] = [];
  const failedActions: string[] = [];

  for (const task of executableTasks) {
    if (cancelled) {
      break;
    }

    const shouldRetryTask = (): boolean => {
      if (!manualRetryPayload?.taskIds || manualRetryPayload.taskIds.length === 0) {
        return false;
      }
      return manualRetryPayload.taskIds.includes(task.taskId);
    };

    const result = await executeTaskWithRetries(
      input,
      workflowExecutionId,
      temporalWorkflowId,
      task,
      isMultiAction,
      shouldRetryTask,
      () => {
        manualRetryPayload = undefined;
      },
    );

    executionResults.push(result);

    if (result.success) {
      completedActions.push(task.taskId);
    } else {
      failedActions.push(task.taskId);

      await orchestration.enqueueFailureItem({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        failureType: 'TASK_EXECUTION',
        errorCode: 'EXECUTION_FAILED',
        errorMessage: result.errorMessage ?? `Task ${task.taskId} failed`,
        payload: {
          taskId: task.taskId,
          taskType: task.taskType,
        },
      });

      if (!isMultiAction) {
        break;
      }
    }
  }

  stepsAttempted.push('EXECUTION');
  progress.completedSteps.push('EXECUTION');

  progress = {
    ...progress,
    status: 'VERIFYING',
    currentStep: 'VERIFICATION',
  };

  const verificationResults: VerificationResult[] = [];

  for (const result of executionResults.filter((entry) => entry.success)) {
    const task = executableTasks.find((entry) => entry.taskId === result.taskId);
    if (!task) {
      continue;
    }

    const verification = await browser.verifyBrowserTask({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      temporalWorkflowId,
      task,
      executionResult: result,
    });

    verificationResults.push(verification);

    if (!verification.verified) {
      failedActions.push(`${task.taskId}:verification`);
      await orchestration.enqueueFailureItem({
        tenantId: input.tenantId,
        guestRequestId: input.guestRequestId,
        workflowExecutionId,
        failureType: 'TASK_VERIFICATION',
        errorCode: 'VERIFICATION_FAILED',
        errorMessage: verification.failureReason ?? `Verification failed for ${task.taskId}`,
        payload: {
          taskId: task.taskId,
          verification,
        },
      });
    }
  }

  stepsAttempted.push('VERIFICATION');
  progress.completedSteps.push('VERIFICATION');

  const successCount = executionResults.filter((entry) => entry.success).length;
  let finalStatus = deriveExecutionStatus(
    cancelled,
    successCount,
    executableTasks.length,
    verificationResults,
  );

  if (finalStatus === 'FAILED' || finalStatus === 'PARTIALLY_COMPLETED') {
    const escalation = await orchestration.escalateGuestRequest({
      tenantId: input.tenantId,
      guestRequestId: input.guestRequestId,
      workflowExecutionId,
      reason:
        finalStatus === 'FAILED'
          ? 'All executable tasks failed'
          : 'One or more tasks failed or failed verification',
      stepsAttempted,
      completedActions,
      failedActions,
      rawText: input.rawText,
    });

    escalationSummary = escalation.escalationSummary;
    progress.completedSteps.push('ESCALATION');

    if (finalStatus === 'FAILED') {
      finalStatus = 'ESCALATED';
    }
  }

  progress = {
    ...progress,
    status: finalStatus,
    currentStep: 'FINALIZATION',
    errorMessage:
      finalStatus === 'COMPLETED'
        ? undefined
        : failedActions.length > 0
          ? `Failed actions: ${failedActions.join(', ')}`
          : progress.errorMessage,
  };

  const finalized = await orchestration.finalizeGuestRequest({
    tenantId: input.tenantId,
    guestRequestId: input.guestRequestId,
    workflowExecutionId,
    status: finalStatus,
    failureReason: progress.errorMessage,
    totalDurationMs: 0,
    executionResults,
    verificationResults,
  });

  progress.completedSteps.push('FINALIZATION');

  return {
    guestRequestId: finalized.guestRequestId,
    status: finalized.status,
    progress,
    executionResults,
    verificationResults,
    escalationSummary,
  };
}
