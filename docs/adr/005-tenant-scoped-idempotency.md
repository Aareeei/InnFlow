# ADR 005: Tenant-Scoped Idempotency

## Status

Accepted

## Context

Guest requests arrive via webhooks, SMS gateways, and email parsers that may deliver duplicates. Browser actions retried by Temporal must not create duplicate PMS records. API clients may retry on network failures.

Requirements:

- Idempotency scoped per tenant (same key across tenants is allowed)
- 24-hour TTL for API idempotency records
- Permanent idempotency for browser action receipts

## Decision

Two-layer idempotency:

1. **API layer:** `Idempotency-Key` header → `idempotency_records` table with request hash and cached response. Unique constraint on `(tenant_id, idempotency_key)`.

2. **Browser layer:** Receipt IDs stored in `browser_action_receipts` with unique constraint on `(hotel_id, receipt_id)`.

Guest requests also enforce unique `(tenant_id, idempotency_key)` and `(tenant_id, external_request_id)`.

## Consequences

**Positive:**
- Safe client retries without duplicate workflows
- Browser activity retries are PMS-safe
- Tenant isolation prevents cross-tenant idempotency collisions

**Negative:**
- Storage overhead for cached responses
- TTL cleanup job needed for expired records
- Clients must generate and persist idempotency keys
