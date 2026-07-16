import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestsTotal = new Counter({
  name: 'innflow_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'innflow_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const httpErrorsTotal = new Counter({
  name: 'innflow_http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const workflowsStartedTotal = new Counter({
  name: 'innflow_workflows_started_total',
  help: 'Total workflows started',
  labelNames: ['tenant_id'],
  registers: [metricsRegistry],
});

export const workflowsCompletedTotal = new Counter({
  name: 'innflow_workflows_completed_total',
  help: 'Total workflows completed',
  labelNames: ['tenant_id', 'status'],
  registers: [metricsRegistry],
});

export const workflowsFailedTotal = new Counter({
  name: 'innflow_workflows_failed_total',
  help: 'Total workflows failed',
  labelNames: ['tenant_id', 'reason'],
  registers: [metricsRegistry],
});

export const workflowsEscalatedTotal = new Counter({
  name: 'innflow_workflows_escalated_total',
  help: 'Total workflows escalated',
  labelNames: ['tenant_id'],
  registers: [metricsRegistry],
});

export const workflowDurationSeconds = new Histogram({
  name: 'innflow_workflow_duration_seconds',
  help: 'Workflow duration in seconds',
  labelNames: ['tenant_id', 'status'],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600, 1800],
  registers: [metricsRegistry],
});

export const workflowRetriesTotal = new Counter({
  name: 'innflow_workflow_retries_total',
  help: 'Total workflow retries',
  labelNames: ['tenant_id', 'step'],
  registers: [metricsRegistry],
});

export const agentRunsTotal = new Counter({
  name: 'innflow_agent_runs_total',
  help: 'Total agent runs',
  labelNames: ['agent_type', 'status'],
  registers: [metricsRegistry],
});

export const agentFailuresTotal = new Counter({
  name: 'innflow_agent_failures_total',
  help: 'Total agent failures',
  labelNames: ['agent_type', 'reason'],
  registers: [metricsRegistry],
});

export const agentDurationSeconds = new Histogram({
  name: 'innflow_agent_duration_seconds',
  help: 'Agent run duration in seconds',
  labelNames: ['agent_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

export const agentTokensTotal = new Counter({
  name: 'innflow_agent_tokens_total',
  help: 'Total agent tokens consumed',
  labelNames: ['agent_type', 'token_type'],
  registers: [metricsRegistry],
});

export const agentEstimatedCostUsdTotal = new Counter({
  name: 'innflow_agent_estimated_cost_usd_total',
  help: 'Estimated agent cost in USD',
  labelNames: ['agent_type'],
  registers: [metricsRegistry],
});

export const browserTasksTotal = new Counter({
  name: 'innflow_browser_tasks_total',
  help: 'Total browser automation tasks',
  labelNames: ['task_type', 'status'],
  registers: [metricsRegistry],
});

export const browserTaskDurationSeconds = new Histogram({
  name: 'innflow_browser_task_duration_seconds',
  help: 'Browser task duration in seconds',
  labelNames: ['task_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const browserFailuresTotal = new Counter({
  name: 'innflow_browser_failures_total',
  help: 'Total browser automation failures',
  labelNames: ['task_type', 'reason'],
  registers: [metricsRegistry],
});

export const browserRetriesTotal = new Counter({
  name: 'innflow_browser_retries_total',
  help: 'Total browser automation retries',
  labelNames: ['task_type'],
  registers: [metricsRegistry],
});

export const browserActiveSessions = new Gauge({
  name: 'innflow_browser_active_sessions',
  help: 'Active browser automation sessions',
  labelNames: ['tenant_id'],
  registers: [metricsRegistry],
});

export const approvalsRequestedTotal = new Counter({
  name: 'innflow_approvals_requested_total',
  help: 'Total approval requests',
  labelNames: ['tenant_id', 'request_type'],
  registers: [metricsRegistry],
});

export const approvalDurationSeconds = new Histogram({
  name: 'innflow_approval_duration_seconds',
  help: 'Approval duration in seconds',
  labelNames: ['tenant_id', 'decision'],
  buckets: [30, 60, 120, 300, 600, 1800, 3600],
  registers: [metricsRegistry],
});

export const approvalTimeoutsTotal = new Counter({
  name: 'innflow_approval_timeouts_total',
  help: 'Total approval timeouts',
  labelNames: ['tenant_id'],
  registers: [metricsRegistry],
});

export const databaseHealth = new Gauge({
  name: 'innflow_database_health',
  help: 'Database connection health (1=healthy, 0=unhealthy)',
  registers: [metricsRegistry],
});

export const redisHealth = new Gauge({
  name: 'innflow_redis_health',
  help: 'Redis connection health (1=healthy, 0=unhealthy)',
  registers: [metricsRegistry],
});

export const temporalHealth = new Gauge({
  name: 'innflow_temporal_health',
  help: 'Temporal connection health (1=healthy, 0=unhealthy)',
  registers: [metricsRegistry],
});

export const objectStorageHealth = new Gauge({
  name: 'innflow_object_storage_health',
  help: 'Object storage connection health (1=healthy, 0=unhealthy)',
  registers: [metricsRegistry],
});

export const circuitBreakerState = new Gauge({
  name: 'innflow_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
  labelNames: ['dependency'],
  registers: [metricsRegistry],
});

export function getMetricsText(): Promise<string> {
  return metricsRegistry.metrics();
}

export function setCircuitBreakerMetric(dependency: string, state: 'CLOSED' | 'HALF_OPEN' | 'OPEN'): void {
  const stateValue = state === 'CLOSED' ? 0 : state === 'HALF_OPEN' ? 1 : 2;
  circuitBreakerState.set({ dependency }, stateValue);
}
