# Workflows

## HotelGuestRequestWorkflow

The primary Temporal workflow orchestrating guest request processing.

### Input

```typescript
{
  tenantId: string;
  guestRequestId: string;
  idempotencyKey: string;
  channel: RequestChannel;
  rawText: string;
  guestName?: string;
  roomNumber?: string;
  reservationId?: string;
}
```

### Stages

| Step | Activity | Description |
|------|----------|-------------|
| INGESTION | `initializeWorkflow` | Create execution record, audit event |
| CLASSIFICATION | `classifyGuestRequest` | AI classifies request type and extracts entities |
| PLANNING | `planGuestRequest` | AI generates ordered task list |
| POLICY | `evaluatePolicy` | Risk assessment, approval determination |
| APPROVAL | `createHumanApproval` | Wait for operator signal (if required) |
| EXECUTION | `executeBrowserTasks` | Dispatch to browser worker queue |
| VERIFICATION | `verifyExecution` | Confirm PMS state matches plan |
| FINALIZATION | `finalizeGuestRequest` | Set final status, record metrics |

### Signals

| Signal | Purpose |
|--------|---------|
| `approvalDecision` | Operator approves/rejects pending action |
| `cancel` | Cancel in-flight workflow |
| `manualRetry` | Retry after failure resolution |

### Queries

| Query | Returns |
|-------|---------|
| `progress` | Current status, completed steps, pending approval flag |

### Task Queues

- `innflow-orchestration` — workflow + orchestration activities
- `innflow-browser-automation` — Playwright browser activities

### Status Transitions

```
RECEIVED → CLASSIFYING → PLANNING → POLICY_REVIEW
  → WAITING_APPROVAL (optional)
  → EXECUTING → VERIFYING
  → COMPLETED | PARTIALLY_COMPLETED | FAILED | ESCALATED
```

### Multi-Action Requests

When classification returns `MULTI_ACTION`, the planner generates multiple tasks with dependency ordering. Partial failures result in `PARTIALLY_COMPLETED` with failed tasks enqueued to the failure queue.

### Timeouts

- Approval wait: 30 minutes (configurable)
- Browser activity: 120 seconds per task (default)
- Workflow overall: no hard limit (Temporal durable execution)

## Testing Workflows

```bash
pnpm test:workflow
```

Uses `@temporalio/testing` with time-skipping for approval and retry scenarios.
