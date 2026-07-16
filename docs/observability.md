# Observability

## Stack

| Component | Purpose | Local URL |
|-----------|---------|-----------|
| OpenTelemetry SDK | Instrumentation in all services | — |
| OTel Collector | Receives OTLP, exports to backends | :4317 (gRPC), :4318 (HTTP) |
| Jaeger | Distributed tracing | http://localhost:16686 |
| Prometheus | Metrics storage | http://localhost:9090 |
| Grafana | Dashboards and alerting | http://localhost:3002 |

Start observability stack:

```bash
pnpm observability:up
```

## Instrumentation

All services initialize OpenTelemetry via `@innflow/telemetry`:

- **Traces:** HTTP requests, Temporal activities, AI calls, browser actions
- **Metrics:** Request latency, workflow counts, circuit breaker state, token usage
- **Logs:** Structured JSON via Pino, correlated with trace IDs

## Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_server_duration` | Histogram | API request latency |
| `innflow_workflow_started_total` | Counter | Workflows initiated |
| `innflow_workflow_completed_total` | Counter | Workflows by final status |
| `innflow_browser_action_duration` | Histogram | PMS action timing |
| `innflow_circuit_breaker_state` | Gauge | Breaker state per dependency |
| `innflow_approval_pending_total` | Counter | Approvals awaiting action |
| `innflow_failure_queue_items_total` | Counter | Failures by type |

## Grafana Dashboards

Pre-provisioned dashboards in `infrastructure/observability/grafana/dashboards/`:

1. **InnFlow Platform Overview** — HTTP rates, error rates, latency, circuit breakers
2. **InnFlow Workflow Operations** — Workflow outcomes, approvals, browser actions, failure queue

## Trace Correlation

Every API request generates a trace ID propagated via:

- `X-Trace-Id` response header
- Stored in `audit_events.trace_id`
- Visible in Jaeger with service name filter

## Alerting Recommendations

Production alerts to configure in Grafana:

- Control API 5xx rate > 1% for 5 minutes
- Workflow failure rate > 5% for 15 minutes
- Circuit breaker OPEN for any dependency
- Approval queue depth > 10 for 30 minutes
- Browser action p95 latency > 60 seconds

## Configuration Files

- Prometheus: `infrastructure/observability/prometheus/prometheus.yml`
- OTel Collector: `infrastructure/observability/otel-collector/config.yaml`
- Grafana datasources: `infrastructure/observability/grafana/provisioning/datasources/`
