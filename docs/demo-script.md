# Demo Script

Step-by-step walkthrough for demonstrating InnFlow capabilities.

## Prerequisites

```bash
pnpm install
cp .env.example .env
pnpm dev:infra
```

Wait for all services to be healthy (~2 minutes). Verify:

- Dashboard: http://localhost:3000
- Control API health: http://localhost:4000/health/live
- Temporal UI: http://localhost:8233

**Demo password:** `InnFlow2025!`

## Demo 1: Housekeeping Request (5 min)

Simple single-action request flow.

```bash
pnpm demo:housekeeping
```

**Narration points:**
1. Guest sends unstructured message via web channel
2. AI classifies as HOUSEKEEPING, extracts room and items
3. Browser worker logs into PMS and creates housekeeping request
4. Verification confirms request in PMS
5. Status transitions to COMPLETED

**Dashboard:** Show request in list with timeline of workflow steps.

## Demo 2: Multi-Action Request (7 min)

Guest request spanning multiple PMS actions.

```bash
pnpm demo:multi-action
```

**Narration points:**
1. Single message triggers multiple tasks (towels + wake-up call + restaurant)
2. Planner orders tasks with dependencies
3. Partial completion handling if one task fails

## Demo 3: Human Approval (8 min)

High-risk cancellation requiring operator approval.

```bash
pnpm demo:approval
```

**Narration points:**
1. Policy engine flags reservation cancellation as high-risk
2. Workflow pauses at WAITING_APPROVAL
3. Operator reviews in dashboard, approves/rejects
4. Workflow resumes via Temporal signal

## Demo 4: PMS Outage (5 min)

Resilience when PMS is unavailable.

```bash
pnpm demo:pms-outage
```

**Narration points:**
1. Admin injects PMS maintenance mode failure
2. Request fails gracefully, enters failure queue
3. Circuit breaker opens on PMS dependency
4. Clear injection, retry succeeds

## Demo 5: Crash Recovery (7 min)

Browser worker crash mid-action.

```bash
pnpm demo:crash-recovery
```

**Narration points:**
1. Inject browser crash before action
2. Temporal redelivers activity
3. Idempotent receipt prevents duplicate PMS write
4. Manual retry after clearing injection

## Demo 6: Idempotency (2 min)

Duplicate request handling.

```bash
pnpm demo:duplicate
```

**Narration points:**
1. Same Idempotency-Key returns identical resource
2. Safe for client retries and webhook deduplication

## Demo 7: Unsupported Request (3 min)

Graceful escalation for out-of-scope requests.

```bash
pnpm demo:unsupported
```

**Narration points:**
1. AI classifies as UNSUPPORTED
2. Escalation agent generates summary for operator
3. Status becomes ESCALATED with recommended next steps

## Observability Tour (5 min)

1. Open Grafana: http://localhost:3002 (admin/admin)
2. Show "InnFlow Platform Overview" dashboard
3. Open Jaeger: http://localhost:16686
4. Search traces for a completed request
5. Show correlation between API → workflow → browser → PMS

## Multi-Tenant Demo (3 min)

1. Log in as `operator@harbor-grand.innflow.local`
2. Create a request, note tenant scoping
3. Log in as `operator@sierra-vista.innflow.local`
4. Verify Harbor Grand requests are not visible

## Total Demo Time: ~45 minutes

Adjust by skipping demos 6-7 for a shorter 30-minute version.
