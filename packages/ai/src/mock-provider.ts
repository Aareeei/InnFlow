import type {
  ClassificationResult,
  EscalationSummary,
  ExecutionPlan,
  PolicyDecision,
  RequestType,
} from '@innflow/domain';
import {
  ClassificationResultSchema,
  EscalationSummarySchema,
  ExecutionPlanSchema,
  PolicyDecisionSchema,
  AIProviderMalformedResponseError,
  AIProviderTimeoutError,
} from '@innflow/domain';
import { CLASSIFIER_PROMPT_VERSION } from './prompts/classifier-v1.js';
import { PLANNER_PROMPT_VERSION } from './prompts/planner-v1.js';
import { POLICY_PROMPT_VERSION } from './prompts/policy-v1.js';
import { ESCALATION_PROMPT_VERSION } from './prompts/escalation-v1.js';
import { estimateDeterministicCost } from './token-estimate.js';
import type {
  AIProvider,
  AIProviderUsageRecord,
  ClassifyInput,
  EscalationInput,
  FailureInjectionFlags,
  MockAIProviderOptions,
  PlanInput,
  PolicyInput,
} from './types.js';

const PROVIDER_NAME = 'mock';
const MODEL_NAME = 'mock-deterministic-v1';

let globalFailureInjection: FailureInjectionFlags = {};

export function setMockFailureInjection(flags: FailureInjectionFlags): void {
  globalFailureInjection = flags;
}

export function resetMockFailureInjection(): void {
  globalFailureInjection = {};
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function hasWakeUpIntent(normalized: string): boolean {
  return (
    normalized.includes('wake-up call') ||
    normalized.includes('wake up call') ||
    normalized.includes('wake me up') ||
    normalized.includes('wake-up') ||
    normalized.includes('wakeup') ||
    normalized.includes('wake up')
  );
}

function hasHousekeepingIntent(normalized: string): boolean {
  return normalized.includes('towel') || normalized.includes('housekeeping');
}

export function classifyByPattern(text: string): RequestType {
  const normalized = normalizeText(text);

  if (normalized.includes('helicopter')) {
    return 'UNSUPPORTED';
  }

  if (hasHousekeepingIntent(normalized) && hasWakeUpIntent(normalized)) {
    return 'MULTI_ACTION';
  }

  if (
    normalized.includes('cancel') &&
    (normalized.includes('reservation') || normalized.includes('booking'))
  ) {
    return 'RESERVATION_CANCELLATION';
  }

  if (
    normalized.includes('modify') &&
    (normalized.includes('reservation') || normalized.includes('booking'))
  ) {
    return 'RESERVATION_MODIFICATION';
  }

  if (normalized.includes('restaurant') || normalized.includes('dinner')) {
    return 'RESTAURANT_BOOKING';
  }

  if (hasWakeUpIntent(normalized)) {
    return 'WAKE_UP_CALL';
  }

  if (normalized.includes('maintenance') || normalized.includes('broken')) {
    return 'MAINTENANCE';
  }

  if (hasHousekeepingIntent(normalized)) {
    return 'HOUSEKEEPING';
  }

  return 'UNSUPPORTED';
}

function extractRoomNumber(text: string, fallback?: string): string | undefined {
  const match = text.match(/room\s*#?\s*(\d{3,4})/i);
  return match?.[1] ?? fallback;
}

function extractQuantity(text: string): number {
  const match = text.match(/(\d+)\s+(towel|pillow|item)/i);
  return match ? parseInt(match[1]!, 10) : 2;
}

function extractWakeUpTime(text: string): string {
  const match = text.match(/(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/i);
  if (!match) {
    return '06:30';
  }
  let time = match[1]!.toLowerCase().replace(/\s+/g, '');
  if (!time.includes(':')) {
    time = time.replace(/(am|pm)/, ':00$1');
  }
  return time;
}

function priorityForRequestType(requestType: RequestType): ClassificationResult['priority'] {
  switch (requestType) {
    case 'MAINTENANCE':
      return 'HIGH';
    case 'UNSUPPORTED':
      return 'LOW';
    default:
      return 'NORMAL';
  }
}

export class MockAIProvider implements AIProvider {
  private readonly latencyMs: number;
  private readonly failureInjection: FailureInjectionFlags;
  private readonly usageRecords: AIProviderUsageRecord[] = [];

  constructor(options: MockAIProviderOptions = {}) {
    this.latencyMs = options.latencyMs ?? 50;
    this.failureInjection = options.failureInjection ?? {};
  }

  getUsageRecords(): readonly AIProviderUsageRecord[] {
    return this.usageRecords;
  }

  private resolveFailureInjection(): FailureInjectionFlags {
    return {
      timeout: globalFailureInjection.timeout ?? this.failureInjection.timeout,
      malformedResponse:
        globalFailureInjection.malformedResponse ?? this.failureInjection.malformedResponse,
    };
  }

  private async applyLatency(): Promise<void> {
    const injection = this.resolveFailureInjection();
    if (injection.timeout) {
      throw new AIProviderTimeoutError();
    }
    if (injection.malformedResponse) {
      throw new AIProviderMalformedResponseError();
    }
    if (this.latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.latencyMs));
    }
  }

  private recordUsage(
    operation: AIProviderUsageRecord['operation'],
    inputText: string,
    outputText: string,
    promptVersion: string,
    latencyMs: number,
  ): void {
    const estimate = estimateDeterministicCost(inputText, operation, outputText);
    this.usageRecords.push({
      operation,
      tokenInput: estimate.tokenInput,
      tokenOutput: estimate.tokenOutput,
      estimatedCostUsd: estimate.estimatedCostUsd,
      latencyMs,
      promptVersion,
      provider: PROVIDER_NAME,
      model: MODEL_NAME,
    });
  }

  async classifyRequest(input: ClassifyInput): Promise<ClassificationResult> {
    const startedAt = Date.now();
    await this.applyLatency();

    const requestType = classifyByPattern(input.rawText);
    const roomNumber = extractRoomNumber(input.rawText, input.guestContext.roomNumber);

    const result: ClassificationResult = {
      requestType,
      confidence: requestType === 'UNSUPPORTED' ? 0.4 : 0.95,
      priority: priorityForRequestType(requestType),
      entities: {
        roomNumber,
        guestName: input.guestContext.guestName,
        reservationId: input.guestContext.reservationId,
        quantity: extractQuantity(input.rawText),
        wakeUpTime: extractWakeUpTime(input.rawText),
      },
      requiresHumanReview: requestType === 'RESERVATION_CANCELLATION',
      reasoning: `Classified as ${requestType} using deterministic keyword rules (${CLASSIFIER_PROMPT_VERSION})`,
    };

    const parsed = ClassificationResultSchema.parse(result);
    this.recordUsage(
      'classifyRequest',
      input.rawText,
      JSON.stringify(parsed),
      CLASSIFIER_PROMPT_VERSION,
      Date.now() - startedAt,
    );
    return parsed;
  }

  async createPlan(input: PlanInput): Promise<ExecutionPlan> {
    const startedAt = Date.now();
    await this.applyLatency();

    const room =
      (input.classification.entities.roomNumber as string | undefined) ??
      input.guestContext.roomNumber ??
      '407';
    const tasks: ExecutionPlan['tasks'] = [];

    switch (input.requestType) {
      case 'HOUSEKEEPING':
        tasks.push({
          taskId: 'task-1',
          taskType: 'CREATE_HOUSEKEEPING_REQUEST',
          parameters: {
            roomNumber: room,
            item: 'towels',
            quantity: (input.classification.entities.quantity as number | undefined) ?? 2,
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 60_000,
          maxRetries: 3,
          verificationMethod: 'ui_confirmation',
          requiresApproval: false,
        });
        break;

      case 'MAINTENANCE':
        tasks.push({
          taskId: 'task-1',
          taskType: 'CREATE_MAINTENANCE_TICKET',
          parameters: {
            roomNumber: room,
            issue: input.rawText,
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 60_000,
          maxRetries: 3,
          verificationMethod: 'ui_confirmation',
          requiresApproval: false,
        });
        break;

      case 'WAKE_UP_CALL':
        tasks.push({
          taskId: 'task-1',
          taskType: 'CREATE_WAKE_UP_CALL',
          parameters: {
            roomNumber: room,
            time: (input.classification.entities.wakeUpTime as string | undefined) ?? '06:30',
            timezone: input.tenant.timezone,
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 60_000,
          maxRetries: 3,
          verificationMethod: 'ui_confirmation',
          requiresApproval: false,
        });
        break;

      case 'RESTAURANT_BOOKING':
        tasks.push({
          taskId: 'task-1',
          taskType: 'CREATE_RESTAURANT_BOOKING',
          parameters: {
            guestName: input.guestContext.guestName ?? 'Guest',
            partySize: 2,
            bookingTime: '2026-07-13T19:00:00.000Z',
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 60_000,
          maxRetries: 3,
          verificationMethod: 'ui_confirmation',
          requiresApproval: false,
        });
        break;

      case 'RESERVATION_MODIFICATION':
        tasks.push({
          taskId: 'task-1',
          taskType: 'MODIFY_RESERVATION',
          parameters: {
            reservationId: input.guestContext.reservationId,
            notes: 'Modified per guest request',
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 60_000,
          maxRetries: 3,
          verificationMethod: 'ui_confirmation',
          requiresApproval: false,
        });
        break;

      case 'RESERVATION_CANCELLATION':
        tasks.push({
          taskId: 'task-1',
          taskType: 'CANCEL_RESERVATION',
          parameters: {
            reservationId: input.guestContext.reservationId,
            reason: 'Guest requested cancellation',
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 60_000,
          maxRetries: 3,
          verificationMethod: 'ui_confirmation',
          requiresApproval: true,
        });
        break;

      case 'MULTI_ACTION':
        tasks.push(
          {
            taskId: 'task-1',
            taskType: 'CREATE_HOUSEKEEPING_REQUEST',
            parameters: {
              roomNumber: room,
              item: 'towels',
              quantity: (input.classification.entities.quantity as number | undefined) ?? 2,
            },
            executionOrder: 1,
            dependencies: [],
            timeoutMs: 60_000,
            maxRetries: 3,
            verificationMethod: 'ui_confirmation',
            requiresApproval: false,
          },
          {
            taskId: 'task-2',
            taskType: 'CREATE_WAKE_UP_CALL',
            parameters: {
              roomNumber: room,
              time: (input.classification.entities.wakeUpTime as string | undefined) ?? '06:30',
              timezone: input.tenant.timezone,
            },
            executionOrder: 2,
            dependencies: ['task-1'],
            timeoutMs: 60_000,
            maxRetries: 3,
            verificationMethod: 'ui_confirmation',
            requiresApproval: false,
          },
        );
        break;

      default:
        tasks.push({
          taskId: 'task-1',
          taskType: 'CREATE_HOUSEKEEPING_REQUEST',
          parameters: {
            roomNumber: room,
            item: 'assistance',
            quantity: 1,
          },
          executionOrder: 1,
          dependencies: [],
          timeoutMs: 30_000,
          maxRetries: 0,
          verificationMethod: 'none',
          requiresApproval: false,
        });
    }

    const plan: ExecutionPlan = {
      planId: `plan-${input.tenant.tenantId}-001`,
      tasks,
      estimatedDurationMs: tasks.length * 30_000,
      summary: `Execute ${tasks.length} task(s) for ${input.requestType}`,
    };

    const parsed = ExecutionPlanSchema.parse(plan);
    this.recordUsage(
      'createPlan',
      input.rawText,
      JSON.stringify(parsed),
      PLANNER_PROMPT_VERSION,
      Date.now() - startedAt,
    );
    return parsed;
  }

  async evaluatePolicy(input: PolicyInput): Promise<PolicyDecision> {
    const startedAt = Date.now();
    await this.applyLatency();

    if (input.requestType === 'UNSUPPORTED') {
      const decision: PolicyDecision = {
        approved: false,
        requiresApproval: false,
        escalationRequired: true,
        reasons: ['Request type is not supported by automated operations'],
        riskLevel: 'HIGH',
        blockedTasks: input.plan.tasks.map((task) => task.taskId),
      };
      const parsed = PolicyDecisionSchema.parse(decision);
      this.recordUsage(
        'evaluatePolicy',
        input.plan.summary,
        JSON.stringify(parsed),
        POLICY_PROMPT_VERSION,
        Date.now() - startedAt,
      );
      return parsed;
    }

    const requiresApproval =
      input.plan.tasks.some((task) => task.requiresApproval) ||
      input.requestType === 'RESERVATION_CANCELLATION';

    const decision: PolicyDecision = {
      approved: !requiresApproval,
      requiresApproval,
      escalationRequired: false,
      reasons: requiresApproval
        ? ['High-risk action requires human approval']
        : ['All policy checks passed'],
      riskLevel: requiresApproval ? 'HIGH' : 'LOW',
      blockedTasks: [],
    };

    const parsed = PolicyDecisionSchema.parse(decision);
    this.recordUsage(
      'evaluatePolicy',
      input.plan.summary,
      JSON.stringify(parsed),
      POLICY_PROMPT_VERSION,
      Date.now() - startedAt,
    );
    return parsed;
  }

  async summarizeEscalation(input: EscalationInput): Promise<EscalationSummary> {
    const startedAt = Date.now();
    await this.applyLatency();

    const completedActions = input.executionResults
      .filter((result) => result.success)
      .map((result) => result.taskId);
    const failedActions = input.executionResults
      .filter((result) => !result.success)
      .map((result) => result.taskId);

    const summary: EscalationSummary = {
      summary: `Guest request requires operator attention${input.errorMessage ? `: ${input.errorMessage}` : ''}`,
      originalRequest: input.rawText,
      understoodIntent: input.classification?.reasoning ?? 'Could not determine intent',
      stepsAttempted: input.executionResults.map((result) => result.taskId),
      completedActions,
      failedActions,
      requiredDecision: 'Operator review required',
      recommendedNextStep: 'Contact guest and resolve manually',
    };

    const parsed = EscalationSummarySchema.parse(summary);
    this.recordUsage(
      'summarizeEscalation',
      input.rawText,
      JSON.stringify(parsed),
      ESCALATION_PROMPT_VERSION,
      Date.now() - startedAt,
    );
    return parsed;
  }
}
