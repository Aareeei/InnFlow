# Architecture

## System Context

InnFlow sits between guest communication channels and hotel property management systems. It receives unstructured guest requests, uses AI agents to understand intent, plans executable actions, and automates PMS updates through browser workers.

## Components

### Control API (`apps/control-api`)

NestJS REST API serving as the system entry point.

- Authentication (JWT access + refresh tokens)
- Guest request ingestion with idempotency
- Approval management
- Failure queue operations
- Admin endpoints (tenant listing, system failure injection)
- Health checks (`/health/live`, `/health/ready`)

### Workflow Worker (`apps/workflow-worker`)

Temporal worker executing the `HotelGuestRequestWorkflow`:

1. **Ingestion** — persist request, create workflow execution record
2. **Classification** — AI determines request type and entities
3. **Planning** — AI generates ordered task list
4. **Policy** — risk assessment, approval gates
5. **Execution** — dispatch browser tasks to PMS
6. **Verification** — confirm PMS state matches expected outcome
7. **Finalization** — update status, audit trail

### Browser Worker (`apps/browser-worker`)

Playwright-based worker on the `innflow-browser-automation` task queue. Executes PMS UI actions (housekeeping, maintenance, wake-up calls, restaurant bookings, reservation changes) and captures before/after screenshots stored in S3/MinIO.

### Dashboard (`apps/dashboard`)

Next.js operator UI for monitoring requests, resolving approvals, and viewing workflow progress.

### Mock PMS (`apps/mock-pms`)

Simulated PMS with seeded hotel data. Supports failure injection for resilience demos.

## Data Stores

| Store | Purpose |
|-------|---------|
| PostgreSQL (`control` schema) | Tenants, users, requests, workflows, audit |
| PostgreSQL (`pms` schema) | Hotels, rooms, guests, reservations, PMS records |
| Redis | Session cache, rate limiting, idempotency TTL |
| S3/MinIO | Workflow artifacts (screenshots, evidence) |
| Temporal | Durable workflow state and history |

## Communication Patterns

- **Sync:** Dashboard ↔ Control API (REST)
- **Async:** Control API → Temporal → Workers (task queues)
- **Browser:** Browser Worker → Mock PMS (Playwright HTTP/UI)

## Multi-Tenancy

Each tenant maps 1:1 to a hotel in the PMS schema. All control-plane queries are scoped by `tenant_id`. Cross-tenant access is blocked at the API layer via JWT claims and middleware guards.

## Failure Handling

See [failure-recovery.md](failure-recovery.md). Key patterns:

- Temporal activity retries with exponential backoff
- Circuit breakers on external dependencies
- Failure queue for operator investigation
- Human escalation for unrecoverable errors

## Observability

OpenTelemetry instrumentation across all services. Traces exported to Jaeger; metrics scraped via OTel Collector → Prometheus → Grafana.

See [observability.md](observability.md).
