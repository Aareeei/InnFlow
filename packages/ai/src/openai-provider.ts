import type { ZodTypeAny } from 'zod';
import { estimateTokenCost } from '@innflow/domain';
import type {
  ClassificationResult,
  EscalationSummary,
  ExecutionPlan,
  PolicyDecision,
} from '@innflow/domain';
import {
  ClassificationResultSchema,
  EscalationSummarySchema,
  ExecutionPlanSchema,
  PolicyDecisionSchema,
  AIProviderMalformedResponseError,
  AIProviderTimeoutError,
  DependencyUnavailableError,
} from '@innflow/domain';
import {
  CLASSIFIER_PROMPT,
  CLASSIFIER_PROMPT_VERSION,
} from './prompts/classifier-v1.js';
import { PLANNER_PROMPT, PLANNER_PROMPT_VERSION } from './prompts/planner-v1.js';
import { POLICY_PROMPT, POLICY_PROMPT_VERSION } from './prompts/policy-v1.js';
import {
  ESCALATION_PROMPT,
  ESCALATION_PROMPT_VERSION,
} from './prompts/escalation-v1.js';
import { estimateDeterministicCost } from './token-estimate.js';
import type {
  AIProvider,
  AIProviderUsageRecord,
  ClassifyInput,
  EscalationInput,
  OpenAIProviderOptions,
  PlanInput,
  PolicyInput,
} from './types.js';

const PROVIDER_NAME = 'openai';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new AIProviderMalformedResponseError('OpenAI response was not valid JSON');
  }
}

function validateStructuredOutput<T>(schema: ZodTypeAny, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new AIProviderMalformedResponseError(
      `OpenAI response failed schema validation: ${parsed.error.message}`,
    );
  }
  return parsed.data as T;
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly usageRecords: AIProviderUsageRecord[] = [];

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  getUsageRecords(): readonly AIProviderUsageRecord[] {
    return this.usageRecords;
  }

  private recordUsage(
    operation: AIProviderUsageRecord['operation'],
    inputText: string,
    outputText: string,
    promptVersion: string,
    latencyMs: number,
    usage?: { prompt_tokens?: number; completion_tokens?: number },
  ): void {
    const estimate = estimateDeterministicCost(inputText, operation, outputText);
    const tokenInput = usage?.prompt_tokens ?? estimate.tokenInput;
    const tokenOutput = usage?.completion_tokens ?? estimate.tokenOutput;
    this.usageRecords.push({
      operation,
      tokenInput,
      tokenOutput,
      estimatedCostUsd: estimateTokenCost(tokenInput, tokenOutput),
      latencyMs,
      promptVersion,
      provider: PROVIDER_NAME,
      model: this.model,
    });
  }

  private async requestCompletion(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ content: string; usage?: ChatCompletionResponse['usage'] }> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (isRetryableStatus(response.status) && attempt < this.maxRetries) {
            continue;
          }
          throw new DependencyUnavailableError(
            `OpenAI request failed with status ${response.status}`,
          );
        }

        const payload = (await response.json()) as ChatCompletionResponse;
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
          throw new AIProviderMalformedResponseError('OpenAI response missing content');
        }

        return { content, usage: payload.usage };
      } catch (error) {
        if (error instanceof AIProviderMalformedResponseError) {
          throw error;
        }
        if (error instanceof DependencyUnavailableError) {
          throw error;
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw new AIProviderTimeoutError();
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new DependencyUnavailableError(
      lastError?.message ?? 'OpenAI request failed after retries',
    );
  }

  async classifyRequest(input: ClassifyInput): Promise<ClassificationResult> {
    const startedAt = Date.now();
    const userPrompt = JSON.stringify({
      channel: input.channel,
      rawText: input.rawText,
      guestContext: input.guestContext,
      tenantId: input.tenant.tenantId,
    });
    const { content, usage } = await this.requestCompletion(CLASSIFIER_PROMPT, userPrompt);
    const parsed = validateStructuredOutput<ClassificationResult>(
      ClassificationResultSchema,
      parseJsonContent(content),
    );
    this.recordUsage(
      'classifyRequest',
      userPrompt,
      content,
      CLASSIFIER_PROMPT_VERSION,
      Date.now() - startedAt,
      usage,
    );
    return parsed;
  }

  async createPlan(input: PlanInput): Promise<ExecutionPlan> {
    const startedAt = Date.now();
    const userPrompt = JSON.stringify({
      requestType: input.requestType,
      classification: input.classification,
      rawText: input.rawText,
      guestContext: input.guestContext,
      tenant: input.tenant,
    });
    const { content, usage } = await this.requestCompletion(PLANNER_PROMPT, userPrompt);
    const parsed = validateStructuredOutput<ExecutionPlan>(
      ExecutionPlanSchema,
      parseJsonContent(content),
    );
    this.recordUsage(
      'createPlan',
      userPrompt,
      content,
      PLANNER_PROMPT_VERSION,
      Date.now() - startedAt,
      usage,
    );
    return parsed;
  }

  async evaluatePolicy(input: PolicyInput): Promise<PolicyDecision> {
    const startedAt = Date.now();
    const userPrompt = JSON.stringify({
      requestType: input.requestType,
      plan: input.plan,
      classification: input.classification,
      guestContext: input.guestContext,
      tenant: input.tenant,
    });
    const { content, usage } = await this.requestCompletion(POLICY_PROMPT, userPrompt);
    const parsed = validateStructuredOutput<PolicyDecision>(
      PolicyDecisionSchema,
      parseJsonContent(content),
    );
    this.recordUsage(
      'evaluatePolicy',
      userPrompt,
      content,
      POLICY_PROMPT_VERSION,
      Date.now() - startedAt,
      usage,
    );
    return parsed;
  }

  async summarizeEscalation(input: EscalationInput): Promise<EscalationSummary> {
    const startedAt = Date.now();
    const userPrompt = JSON.stringify({
      rawText: input.rawText,
      classification: input.classification,
      plan: input.plan,
      executionResults: input.executionResults,
      errorMessage: input.errorMessage,
      tenant: input.tenant,
    });
    const { content, usage } = await this.requestCompletion(ESCALATION_PROMPT, userPrompt);
    const parsed = validateStructuredOutput<EscalationSummary>(
      EscalationSummarySchema,
      parseJsonContent(content),
    );
    this.recordUsage(
      'summarizeEscalation',
      userPrompt,
      content,
      ESCALATION_PROMPT_VERSION,
      Date.now() - startedAt,
      usage,
    );
    return parsed;
  }
}

export function isOpenAIProviderEnabled(
  aiProvider: string,
  apiKey: string | undefined,
): boolean {
  return aiProvider === 'openai' && Boolean(apiKey);
}
