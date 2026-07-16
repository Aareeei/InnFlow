import { randomUUID } from 'crypto';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { TASK_QUEUES, WORKFLOW_NAMES } from '@innflow/config';
import type {
  ClassificationResult,
  ExecutionPlan,
  ExecutionResult,
  PolicyDecision,
  VerificationResult,
  WorkflowInput,
} from '@innflow/domain';
import type * as browserActivities from '../activities/browser-proxy.activities.js';
import type * as orchestrationActivities from '../activities/orchestration.activities.js';
import { HotelGuestRequestWorkflow } from './guest-request.workflow.js';
import { cancelSignal } from '../signals.js';
import { progressQuery } from '../queries.js';

const tenantId = '11111111-1111-1111-1111-111111111111';
const guestRequestId = '22222222-2222-2222-2222-222222222222';

const baseInput: WorkflowInput = {
  tenantId,
  guestRequestId,
  idempotencyKey: 'test-idempotency-key',
  channel: 'WEB',
  rawText: 'Please send extra towels to room 204',
  guestName: 'Alex Guest',
  roomNumber: '204',
};

const classification: ClassificationResult = {
  requestType: 'HOUSEKEEPING',
  confidence: 0.95,
  priority: 'NORMAL',
  entities: { item: 'towels', roomNumber: '204' },
  requiresHumanReview: false,
  reasoning: 'Guest requested housekeeping supplies',
};

const plan: ExecutionPlan = {
  planId: 'plan-1',
  summary: 'Deliver towels to room 204',
  estimatedDurationMs: 120000,
  tasks: [
    {
      taskId: 'task-1',
      taskType: 'CREATE_HOUSEKEEPING_REQUEST',
      parameters: { item: 'towels', quantity: 2, roomNumber: '204' },
      executionOrder: 1,
      dependencies: [],
      timeoutMs: 120000,
      maxRetries: 1,
      verificationMethod: 'pms-record',
      requiresApproval: false,
    },
  ],
};

const policy: PolicyDecision = {
  approved: true,
  requiresApproval: false,
  escalationRequired: false,
  reasons: ['Within standard housekeeping policy'],
  riskLevel: 'LOW',
  blockedTasks: [],
};

type MockActivities = typeof orchestrationActivities & typeof browserActivities;

function createMockActivities(overrides: Partial<MockActivities> = {}): MockActivities {
  return {
    initializeWorkflowExecution: async () => ({
      workflowExecutionId: randomUUID(),
      approvalTimeoutMs: 1000,
    }),
    classifyGuestRequest: async () => ({
      classification,
      agentRunId: randomUUID(),
    }),
    planGuestRequest: async () => ({
      plan,
      agentRunId: randomUUID(),
    }),
    evaluateGuestRequestPolicy: async () => ({
      policy,
      agentRunId: randomUUID(),
    }),
    updateGuestRequestStatus: async () => undefined,
    recordWorkflowStep: async () => ({ stepId: randomUUID() }),
    createHumanApproval: async () => ({ approvalId: 'approval-1' }),
    resolveHumanApproval: async () => undefined,
    recordAuditEvent: async () => undefined,
    enqueueFailureItem: async () => ({ failureQueueItemId: randomUUID() }),
    escalateGuestRequest: async () => ({
      escalationSummary: {
        summary: 'Escalation required',
        originalRequest: baseInput.rawText,
        understoodIntent: 'Housekeeping request',
        stepsAttempted: ['CLASSIFICATION'],
        completedActions: [],
        failedActions: ['execution'],
        requiredDecision: 'Operator review',
        recommendedNextStep: 'Retry manually',
      },
      agentRunId: randomUUID(),
    }),
    finalizeGuestRequest: async (input) => ({
      guestRequestId: input.guestRequestId,
      status: input.status,
    }),
    buildReceiptId: () => 'receipt-test',
    executeBrowserTask: async (input): Promise<ExecutionResult> => ({
      taskId: input.task.taskId,
      success: true,
      receiptId: 'receipt-1',
      durationMs: 1000,
    }),
    verifyBrowserTask: async (input): Promise<VerificationResult> => ({
      taskId: input.task.taskId,
      verified: true,
      expected: input.task.parameters,
      observed: input.task.parameters,
      receiptId: input.executionResult.receiptId,
    }),
    ...overrides,
  };
}

function splitActivities(activities: MockActivities): {
  orchestration: typeof orchestrationActivities;
  browser: typeof browserActivities;
} {
  const {
    executeBrowserTask,
    verifyBrowserTask,
    initializeWorkflowExecution,
    classifyGuestRequest,
    planGuestRequest,
    evaluateGuestRequestPolicy,
    updateGuestRequestStatus,
    recordWorkflowStep,
    createHumanApproval,
    resolveHumanApproval,
    recordAuditEvent,
    enqueueFailureItem,
    escalateGuestRequest,
    finalizeGuestRequest,
    buildReceiptId,
  } = activities;

  return {
    orchestration: {
      initializeWorkflowExecution,
      classifyGuestRequest,
      planGuestRequest,
      evaluateGuestRequestPolicy,
      updateGuestRequestStatus,
      recordWorkflowStep,
      createHumanApproval,
      resolveHumanApproval,
      recordAuditEvent,
      enqueueFailureItem,
      escalateGuestRequest,
      finalizeGuestRequest,
      buildReceiptId,
    },
    browser: {
      executeBrowserTask,
      verifyBrowserTask,
    },
  };
}

async function runWorkflowTest(
  testEnv: TestWorkflowEnvironment,
  activities: MockActivities,
  workflowId: string,
  run: () => Promise<void>,
): Promise<void> {
  const { orchestration, browser } = splitActivities(activities);

  const orchestrationWorker = await Worker.create({
    connection: testEnv.nativeConnection,
    taskQueue: TASK_QUEUES.ORCHESTRATION,
    workflowsPath: require.resolve('./guest-request.workflow'),
    activities: orchestration,
  });

  const browserWorker = await Worker.create({
    connection: testEnv.nativeConnection,
    taskQueue: TASK_QUEUES.BROWSER,
    activities: browser,
  });

  await orchestrationWorker.runUntil(() =>
    browserWorker.runUntil(run),
  );
}

describe('HotelGuestRequestWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('completes a standard housekeeping request', async () => {
    const activities = createMockActivities();

    await runWorkflowTest(testEnv, activities, 'housekeeping', async () => {
      const handle = await testEnv.client.workflow.start(HotelGuestRequestWorkflow, {
        taskQueue: TASK_QUEUES.ORCHESTRATION,
        workflowId: `guest-request-${tenantId}-${baseInput.idempotencyKey}`,
        args: [baseInput],
      });

      const result = await handle.result();
      const progress = await handle.query(progressQuery);

      expect(result.status).toBe('COMPLETED');
      expect(result.executionResults).toHaveLength(1);
      expect(result.executionResults[0]?.success).toBe(true);
      expect(result.verificationResults).toHaveLength(1);
      expect(progress.status).toBe('COMPLETED');
      expect(progress.completedSteps).toContain('FINALIZATION');
    });
  });

  it('escalates when approval times out', async () => {
    const approvalPolicy: PolicyDecision = {
      ...policy,
      requiresApproval: true,
      reasons: ['High-risk modification requires approval'],
    };

    const approvalPlan: ExecutionPlan = {
      ...plan,
      tasks: plan.tasks.map((task) => ({
        ...task,
        requiresApproval: true,
      })),
    };

    const activities = createMockActivities({
      evaluateGuestRequestPolicy: async () => ({
        policy: approvalPolicy,
        agentRunId: randomUUID(),
      }),
      planGuestRequest: async () => ({
        plan: approvalPlan,
        agentRunId: randomUUID(),
      }),
    });

    await runWorkflowTest(testEnv, activities, 'approval-timeout', async () => {
      const handle = await testEnv.client.workflow.start(HotelGuestRequestWorkflow, {
        taskQueue: TASK_QUEUES.ORCHESTRATION,
        workflowId: `guest-request-${tenantId}-approval-timeout`,
        args: [baseInput],
      });

      const result = await handle.result();

      expect(result.status).toBe('ESCALATED');
      expect(result.escalationSummary?.summary).toBe('Escalation required');
      expect(result.executionResults).toHaveLength(0);
    });
  });

  it('handles partial completion for multi-action requests', async () => {
    const multiActionClassification: ClassificationResult = {
      ...classification,
      requestType: 'MULTI_ACTION',
      reasoning: 'Guest requested towels and a wake-up call',
    };

    const multiActionPlan: ExecutionPlan = {
      planId: 'plan-multi',
      summary: 'Towels and wake-up call',
      estimatedDurationMs: 180000,
      tasks: [
        {
          taskId: 'task-housekeeping',
          taskType: 'CREATE_HOUSEKEEPING_REQUEST',
          parameters: { item: 'towels', quantity: 2, roomNumber: '204' },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 120000,
          maxRetries: 0,
          verificationMethod: 'pms-record',
          requiresApproval: false,
        },
        {
          taskId: 'task-wakeup',
          taskType: 'CREATE_WAKE_UP_CALL',
          parameters: { roomNumber: '204', callTime: '06:30' },
          executionOrder: 2,
          dependencies: [],
          timeoutMs: 120000,
          maxRetries: 0,
          verificationMethod: 'pms-record',
          requiresApproval: false,
        },
      ],
    };

    const activities = createMockActivities({
      classifyGuestRequest: async () => ({
        classification: multiActionClassification,
        agentRunId: randomUUID(),
      }),
      planGuestRequest: async () => ({
        plan: multiActionPlan,
        agentRunId: randomUUID(),
      }),
      executeBrowserTask: async (input): Promise<ExecutionResult> => {
        if (input.task.taskId === 'task-wakeup') {
          return {
            taskId: input.task.taskId,
            success: false,
            errorMessage: 'Wake-up call scheduling failed',
            durationMs: 500,
          };
        }

        return {
          taskId: input.task.taskId,
          success: true,
          receiptId: 'receipt-housekeeping',
          durationMs: 1000,
        };
      },
    });

    await runWorkflowTest(testEnv, activities, 'multi-action', async () => {
      const handle = await testEnv.client.workflow.start(HotelGuestRequestWorkflow, {
        taskQueue: TASK_QUEUES.ORCHESTRATION,
        workflowId: `guest-request-${tenantId}-multi-action`,
        args: [baseInput],
      });

      const result = await handle.result();

      expect(result.status).toBe('PARTIALLY_COMPLETED');
      expect(result.executionResults).toHaveLength(2);
      expect(result.executionResults[0]?.success).toBe(true);
      expect(result.executionResults[1]?.success).toBe(false);
      expect(result.escalationSummary).toBeDefined();
    });
  });

  it('cancels while waiting for approval', async () => {
    const approvalPolicy: PolicyDecision = {
      ...policy,
      requiresApproval: true,
      reasons: ['Manual approval required'],
    };

    const activities = createMockActivities({
      evaluateGuestRequestPolicy: async () => ({
        policy: approvalPolicy,
        agentRunId: randomUUID(),
      }),
      createHumanApproval: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { approvalId: 'approval-1' };
      },
    });

    await runWorkflowTest(testEnv, activities, 'cancel-approval', async () => {
      const handle = await testEnv.client.workflow.start(HotelGuestRequestWorkflow, {
        taskQueue: TASK_QUEUES.ORCHESTRATION,
        workflowId: `guest-request-${tenantId}-cancel`,
        args: [baseInput],
      });

      await handle.signal(cancelSignal);
      const result = await handle.result();

      expect(result.status).toBe('CANCELLED');
      expect(result.executionResults).toHaveLength(0);
    });
  });

  it('exports the configured workflow name', () => {
    expect(WORKFLOW_NAMES.HOTEL_GUEST_REQUEST).toBe('HotelGuestRequestWorkflow');
    expect(TASK_QUEUES.ORCHESTRATION).toBe('innflow-orchestration');
    expect(TASK_QUEUES.BROWSER).toBe('innflow-browser-automation');
  });
});
