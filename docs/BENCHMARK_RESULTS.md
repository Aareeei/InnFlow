# Benchmark Results

> **Status: Pending**

Formal performance benchmarks have not yet been executed. This document will be updated with results from production-like load testing.

## Planned Benchmark Scenarios

| Scenario | Target | Metric |
|----------|--------|--------|
| Steady-state throughput | 50 concurrent VUs | Requests/minute |
| Peak burst | 100 VUs for 2 minutes | p95 latency |
| Multi-tenant mix | 3 tenants, 25 VUs each | Error rate |
| Approval workflow | 20 cancellation requests | End-to-end time |
| Browser automation | 10 concurrent PMS actions | p95 browser duration |

## Environment Template

Record the following when benchmarks are run:

```
Date:
Environment: [local | staging | production]
Infrastructure:
  - control-api replicas:
  - workflow-worker replicas:
  - browser-worker replicas:
  - RDS instance class:
  - Redis node type:
  - EKS node type/count:
k6 version:
InnFlow version/commit:
```

## Results Template

### Throughput

| VUs | Requests/min | p50 (ms) | p95 (ms) | p99 (ms) | Error % |
|-----|-------------|----------|----------|----------|---------|
| 10  | TBD         | TBD      | TBD      | TBD      | TBD     |
| 25  | TBD         | TBD      | TBD      | TBD      | TBD     |
| 50  | TBD         | TBD      | TBD      | TBD      | TBD     |

### Workflow Completion

| Request Type | Avg Duration (s) | p95 Duration (s) | Success Rate |
|-------------|-----------------|-----------------|--------------|
| Housekeeping | TBD | TBD | TBD |
| Multi-action | TBD | TBD | TBD |
| Cancellation | TBD | TBD | TBD |

## How to Run

```bash
# Ensure production-like stack is running
pnpm dev:infra

# Run load test
pnpm test:load

# Record results from tests/load/results/summary.json
# and Grafana dashboards into this document
```

See [load-testing.md](load-testing.md) for detailed instructions.
