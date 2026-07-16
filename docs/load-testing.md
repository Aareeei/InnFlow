# Load Testing

## Overview

InnFlow load tests use [k6](https://k6.io/) to simulate concurrent guest request creation across multiple tenants.

## Prerequisites

```bash
# Install k6 (macOS)
brew install k6

# Or download from https://k6.io/docs/get-started/installation/
```

Ensure the full stack is running with seeded data:

```bash
pnpm dev:infra
```

## Mixed Scenario

File: `tests/load/mixed-scenario.js`

Simulates realistic mixed load:

- Random tenant operator login
- Guest request creation (housekeeping-style messages)
- Request status polling
- Health check probes

### Run

```bash
pnpm test:load

# With custom target
CONTROL_API_URL=http://localhost:4000 k6 run tests/load/mixed-scenario.js
```

### Load Profile

| Phase | Duration | VUs |
|-------|----------|-----|
| Ramp up | 30s | 0 → 10 |
| Sustain | 1m | 25 |
| Ramp down | 30s | 25 → 0 |

### Thresholds

| Metric | Threshold |
|--------|-----------|
| `http_req_failed` | < 5% |
| `http_req_duration` p95 | < 3000ms |

Failed thresholds exit with non-zero code.

### Output

Results written to `tests/load/results/summary.json` and stdout.

## Interpreting Results

Key metrics to review:

- **http_req_duration (p95, p99)** — API latency under load
- **http_req_failed** — Error rate (auth failures, 5xx, timeouts)
- **iterations** — Total scenario iterations completed
- **vus** — Virtual users active during test

Cross-reference with Grafana dashboards during test execution:

1. Open http://localhost:3002
2. Navigate to "InnFlow Platform Overview"
3. Watch request rate and latency panels during k6 run

## Benchmark Results

Formal benchmark results are tracked in [BENCHMARK_RESULTS.md](BENCHMARK_RESULTS.md).

> Status: **Pending** — run benchmarks after production-like deployment and record results.

## Tuning Recommendations

If thresholds fail:

1. **High latency** — Scale control-api replicas, check database connection pool
2. **High error rate** — Check Temporal worker capacity, Redis connection limits
3. **Auth failures** — Verify seed data, check rate limiting config
4. **Workflow backlog** — Scale workflow-worker and browser-worker replicas

## Custom Scenarios

Create additional scripts in `tests/load/` for targeted testing:

- Approval-heavy workload (cancellation requests)
- Multi-action burst
- Sustained soak test (30+ minutes)

Example:

```bash
k6 run --vus 50 --duration 5m tests/load/mixed-scenario.js
```
