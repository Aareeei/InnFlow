# Failure Recovery

InnFlow is designed to degrade gracefully and recover from failures at every layer.

## Failure Categories

| Category | Examples | Recovery |
|----------|----------|----------|
| Transient | Network timeout, PMS slow response | Activity retry with backoff |
| Dependency | PMS maintenance mode, Redis unavailable | Circuit breaker → escalation |
| Worker crash | Browser process killed mid-action | Temporal redelivery, idempotent receipts |
| Logic | Verification mismatch, AI malformed output | Failure queue + operator retry |
| Policy | High-risk action | Human approval gate |

## Temporal Retries

Activities configure retry policies per task type:

- **AI activities:** 3 attempts, 2s initial interval, 2x backoff
- **Browser activities:** 3 attempts, 5s initial interval
- **Database activities:** 5 attempts, 1s initial interval

Non-retryable errors (validation, policy block) fail immediately.

## Circuit Breakers

Implemented in `@innflow/telemetry`. Monitors PMS and AI provider calls:

- **CLOSED** — normal operation
- **OPEN** — fail fast after threshold breaches
- **HALF_OPEN** — probe recovery

State exposed as Prometheus metric `innflow_circuit_breaker_state`.

## Failure Queue

Failed operations create `FailureQueueItem` records with:

- Error code and message
- Payload snapshot for replay
- Retry count and timestamps

Operators can requeue or resolve via dashboard/API.

## Failure Injection (Demo/Testing)

Configurable per hotel via `FailureConfiguration`:

```typescript
{
  pmsMaintenanceMode: boolean;
  pmsLatencyMs: number;
  pmsErrorRate: number;
  browserCrashBeforeAction: boolean;
  browserCrashAfterAction: boolean;
  aiProviderTimeout: boolean;
  verificationMismatch: boolean;
  approvalTimeout: boolean;
  partialFailureMultiAction: boolean;
}
```

Inject via API:

```bash
pnpm demo:pms-outage
pnpm demo:crash-recovery
```

## Recovery Playbook

1. **Check health endpoints** — `/health/ready` shows dependency status
2. **Review failure queue** — dashboard or `GET /api/v1/failures?status=OPEN`
3. **Inspect Temporal UI** — workflow history at http://localhost:8233
4. **Clear failure injection** — `DELETE /api/v1/failure-injection`
5. **Manual retry** — `POST /api/v1/guest-requests/:id/retry`
6. **Resolve approval** — if stuck at WAITING_APPROVAL

## Idempotency

Browser actions use receipt IDs to prevent duplicate PMS writes on retry. API requests use `Idempotency-Key` header with 24-hour TTL in Redis/PostgreSQL.
