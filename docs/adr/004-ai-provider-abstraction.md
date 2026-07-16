# ADR 004: AI Provider Abstraction

## Status

Accepted

## Context

InnFlow uses AI for request classification, execution planning, policy evaluation, and escalation summarization. Requirements:

- Local development without API costs
- Production use with OpenAI (or future providers)
- Token usage and cost tracking per request
- Prompt versioning for reproducibility

## Decision

Implement `@innflow/ai` package with a provider interface supporting:

- `MockProvider` — deterministic responses for dev/test/demo
- `OpenAIProvider` — production GPT-4o-mini (configurable)

Factory selects provider via `AI_PROVIDER` environment variable. All agent runs record provider, model, tokens, cost, and prompt version.

## Consequences

**Positive:**
- Zero-cost local development and CI
- Easy provider swap without workflow changes
- Cost observability per tenant/request

**Negative:**
- Mock provider may not catch edge cases visible with real LLM
- Prompt changes require version bumps for audit trail
- Additional abstraction layer to maintain
