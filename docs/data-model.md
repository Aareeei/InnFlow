# Data Model

InnFlow uses PostgreSQL with two schemas managed by Prisma.

## Control Schema (`control`)

### Core Entities

**Tenant** — Hotel organization. Fields: `id`, `name`, `slug` (unique), `timezone`.

**User** — Platform users. Scoped to a tenant (nullable for system admin). Unique on `(tenant_id, email)`. Roles: `TENANT_ADMIN`, `OPERATOR`, `VIEWER`, `SYSTEM_ADMIN`.

**GuestRequest** — Incoming guest message. Key fields:
- `idempotency_key` — deduplication per tenant
- `channel` — WEB, SMS, EMAIL, VOICE_TRANSCRIPT
- `status` — lifecycle state (RECEIVED → COMPLETED/FAILED/ESCALATED)
- `request_type` — classified intent

### Workflow Entities

**WorkflowExecution** — Links a guest request to a Temporal workflow. Tracks `temporal_workflow_id`, status, duration.

**WorkflowStep** — Individual pipeline stage with input/output JSON, timing, attempt count.

**AgentRun** — AI invocation record with token usage, cost estimate, latency.

**ToolCall** — Individual tool invocation within an agent run.

**HumanApproval** — Pending/resolved approval for high-risk actions.

**ExecutionArtifact** — S3 reference for screenshots and evidence files.

**FailureQueueItem** — Failed operations awaiting operator action.

**IdempotencyRecord** — Cached API responses keyed by `(tenant_id, idempotency_key)`.

**AuditEvent** — Immutable audit log with actor, action, resource, trace ID.

**SystemConfiguration** — Key-value config per tenant or global.

## PMS Schema (`pms`)

**Hotel** — 1:1 with tenant via `tenant_id`.

**Room** — Physical room inventory. Status: AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE.

**Guest** — Guest profile linked to a hotel.

**Reservation** — Booking with check-in/out dates, confirmation code, assigned room.

**HousekeepingRequest**, **MaintenanceTicket**, **WakeUpCall**, **RestaurantBooking** — Action records created by browser automation.

**FailureConfiguration** — Per-hotel failure injection settings (JSON).

**BrowserActionReceipt** — Idempotency receipts for browser actions.

**PmsUser** — Mock PMS staff credentials.

## Relationships

```
Tenant 1──* User
Tenant 1──* GuestRequest 1──* WorkflowExecution 1──* WorkflowStep
GuestRequest 1──* AgentRun 1──* ToolCall
GuestRequest 1──* HumanApproval
WorkflowExecution 1──* ExecutionArtifact

Hotel 1──* Room
Hotel 1──* Guest 1──* Reservation *──1 Room
```

## Seed Data

Three tenants with 22 rooms, 18 guests, and 18 reservations each. Demo password hashed with argon2id. See `packages/database/src/seed.ts`.

## Migrations

Managed via Prisma Migrate. Initial migration: `20250712000000_init`.

```bash
pnpm db:migrate    # Apply pending migrations
pnpm db:seed       # Seed demo data
pnpm db:reset      # Drop, migrate, seed
```
