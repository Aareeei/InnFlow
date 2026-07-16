# Troubleshooting

## Common Issues

### Services won't start

**Symptom:** `docker compose up` fails or services exit immediately.

**Checks:**
1. Ports not in use: `5432`, `6379`, `7233`, `4000`, `3000`, `3001`
2. Docker has sufficient memory (8GB+ recommended)
3. Review logs: `docker compose logs control-api`

**Fix:**
```bash
docker compose down -v
pnpm dev:infra
```

### Database migration fails

**Symptom:** `pnpm db:migrate` errors on schema creation.

**Checks:**
1. PostgreSQL is running and reachable
2. `DATABASE_URL` in `.env` is correct
3. Schemas `control` and `pms` don't conflict with existing data

**Fix:**
```bash
pnpm db:reset   # WARNING: destroys all data
```

### Control API health check fails

**Symptom:** `/health/ready` returns 503.

**Checks:**
1. PostgreSQL connection: `docker compose logs postgres`
2. Redis connection: `docker compose logs redis`
3. Temporal connection: `docker compose logs temporal`

**Fix:** Wait for dependencies to become healthy (Temporal takes ~30s on first start).

### Temporal worker not processing

**Symptom:** Requests stuck in RECEIVED or CLASSIFYING.

**Checks:**
1. Workflow worker running: `docker compose logs workflow-worker`
2. Temporal UI shows pending tasks: http://localhost:8233
3. Task queue names match (`innflow-orchestration`)

**Fix:**
```bash
docker compose restart workflow-worker browser-worker
```

### Browser worker failures

**Symptom:** Requests fail at EXECUTING stage.

**Checks:**
1. Mock PMS healthy: http://localhost:3001/api/health
2. Playwright browsers installed in container
3. Browser worker logs: `docker compose logs browser-worker`

**Fix:**
```bash
docker compose build browser-worker --no-cache
docker compose up -d browser-worker
```

### Authentication errors in demo scripts

**Symptom:** Login returns 401.

**Checks:**
1. Database seeded: `pnpm db:seed`
2. Using correct password: `InnFlow2025!`
3. Email matches seed data (see README)

### Integration tests fail locally

**Symptom:** `pnpm test:integration` timeouts or 401 errors.

**Checks:**
1. Control API running on port 4000
2. Database migrated and seeded
3. `CONTROL_API_URL` environment variable

**Fix:**
```bash
pnpm dev:infra
sleep 30
pnpm test:integration
```

### Grafana dashboards empty

**Symptom:** No data in Grafana panels.

**Checks:**
1. OTel Collector running: `docker compose logs otel-collector`
2. Prometheus scraping: http://localhost:9090/targets
3. Services exporting metrics (generate traffic first)

**Fix:**
```bash
pnpm observability:up
pnpm demo:housekeeping   # generate metrics
```

### k6 load test failures

**Symptom:** Threshold violations or connection refused.

**Checks:**
1. Stack running under load capacity
2. `CONTROL_API_URL` reachable from k6
3. Rate limiting not blocking test traffic

**Fix:** Reduce VUs or extend ramp-up duration in `mixed-scenario.js`.

## Getting Help

1. Check service logs: `docker compose logs <service>`
2. Review Temporal workflow history in UI
3. Search audit events in database
4. Inspect traces in Jaeger for failed requests

## Debug Mode

Enable verbose logging:

```bash
LOG_LEVEL=debug docker compose up control-api workflow-worker
```

Reset everything to clean state:

```bash
docker compose down -v
pnpm db:reset
pnpm dev:infra
```
