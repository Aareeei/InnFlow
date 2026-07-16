# Testing

## Test Pyramid

```
        ┌─────────┐
        │  E2E    │  Playwright (PMS browser)
       ┌┴─────────┴┐
       │ Integration │  Jest (API against running stack)
      ┌┴─────────────┴┐
      │  Unit / Workflow │  Jest (packages, Temporal test env)
      └─────────────────┘
```

## Unit Tests

Package-level tests co-located with source:

```bash
pnpm test:unit
```

Coverage includes:
- `@innflow/domain` — schema validation, utilities
- `@innflow/ai` — mock provider behavior
- `@innflow/telemetry` — circuit breaker state machine

## Workflow Tests

Temporal workflow tests using `@temporalio/testing`:

```bash
pnpm test:workflow
```

Tests time-skip through approval waits and verify compensation logic.

## Integration Tests

Located in `tests/integration/`. Require running Control API and seeded database.

```bash
# Start stack first
pnpm dev:infra

# Run integration tests
pnpm test:integration
```

| Test File | Coverage |
|-----------|----------|
| `auth.test.ts` | Login, invalid credentials, unauthenticated access |
| `tenant-isolation.test.ts` | Cross-tenant access prevention |
| `idempotency.test.ts` | Duplicate idempotency key handling |
| `health.test.ts` | Live and ready health endpoints |

Configuration: `tests/integration/jest.config.ts`

## E2E Tests

Playwright tests against Mock PMS UI:

```bash
pnpm test:e2e
```

Configuration: `tests/e2e/playwright.config.ts`

Scenarios:
- Staff login
- Room list display
- Housekeeping request creation

## Load Tests

k6 mixed scenario in `tests/load/mixed-scenario.js`:

```bash
pnpm test:load
```

See [load-testing.md](load-testing.md).

## CI Pipelines

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `pr.yml` | Pull request | Lint, typecheck, unit tests, format, audit |
| `integration.yml` | Push/PR | Migrate, seed, integration + workflow tests |
| `container.yml` | Push/PR/tags | Build all 5 Docker images, Trivy scan |

## Writing New Tests

1. **Unit:** Add `*.test.ts` next to source in `packages/`
2. **Integration:** Add to `tests/integration/`, use `apiUrl` from setup
3. **E2E:** Add spec to `tests/e2e/specs/`
4. **Load:** Extend `tests/load/mixed-scenario.js` or add new scenario file

## Test Data

Integration and demo tests use seeded data from `pnpm db:seed`. Password: `InnFlow2025!`.

Reset test database:

```bash
pnpm db:reset
```
