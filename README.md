# InnFlow

**Fault-tolerant infrastructure for autonomous hotel operations.**

InnFlow orchestrates AI-powered guest request handling across multiple hotel tenants. It classifies incoming requests, plans multi-step actions, executes browser automation against property management systems (PMS), verifies outcomes, and recovers gracefully from failures.

## Features

- **Multi-tenant control plane** with role-based access (admin, operator, viewer, system admin)
- **Temporal-backed workflows** for durable, retryable guest request processing
- **Browser automation workers** (Playwright) for PMS interaction with evidence capture
- **Human-in-the-loop approvals** for high-risk actions (cancellations, modifications)
- **Failure injection & recovery** for demo and resilience testing
- **Full observability stack** — Prometheus, Grafana, Jaeger, OpenTelemetry
- **Production-ready infrastructure** — Docker, Kubernetes (Kustomize), Terraform (AWS)

## Architecture Overview

```
Guest Request → Control API → Temporal Workflow → AI Agents → Browser Worker → Mock PMS
                     ↓              ↓                              ↓
                  PostgreSQL    Workflow Steps              Screenshots → S3/MinIO
                     ↓
                  Redis (cache, idempotency)
```

See [docs/architecture.md](docs/architecture.md) for details.

## Quick Start

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- pnpm 9+
- Docker & Docker Compose

### Local Development

```bash
# Clone and install
pnpm install

# Copy environment config
cp .env.example .env

# Start full stack (infra + apps + observability)
pnpm dev:infra

# Or start infrastructure only
docker compose up -d

# Run migrations and seed demo data
pnpm db:migrate
pnpm db:seed
```

### Demo Credentials

All seeded users share the password **`InnFlow2025!`**

| Role | Email |
|------|-------|
| System Admin | `admin@innflow.local` |
| Harbor Grand Admin | `admin@harbor-grand.innflow.local` |
| Harbor Grand Operator | `operator@harbor-grand.innflow.local` |
| Sierra Vista Operator | `operator@sierra-vista.innflow.local` |
| MetroStay Operator | `operator@metrostay-downtown.innflow.local` |

### Service URLs (Local)

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| Control API | http://localhost:4000 |
| Mock PMS | http://localhost:3001 |
| Temporal UI | http://localhost:8233 |
| Grafana | http://localhost:3002 (admin/admin) |
| Prometheus | http://localhost:9090 |
| Jaeger | http://localhost:16686 |

## Demo Scripts

```bash
pnpm demo:housekeeping      # Single housekeeping request
pnpm demo:multi-action      # Multi-step guest request
pnpm demo:approval          # Human approval workflow
pnpm demo:pms-outage        # PMS failure + escalation
pnpm demo:crash-recovery    # Browser crash + retry
pnpm demo:duplicate         # Idempotency verification
pnpm demo:unsupported       # Unsupported request escalation
```

See [docs/demo-script.md](docs/demo-script.md) for a full walkthrough.

## Testing

```bash
pnpm test:unit              # Package unit tests
pnpm test:integration       # API integration tests (requires running stack)
pnpm test:e2e               # Playwright PMS browser tests
pnpm test:load              # k6 load test
pnpm test:workflow          # Temporal workflow tests
```

See [docs/testing.md](docs/testing.md) and [docs/load-testing.md](docs/load-testing.md).

## Project Structure

```
innflow/
├── apps/                   # Application services
│   ├── control-api/        # NestJS REST API
│   ├── workflow-worker/    # Temporal orchestration worker
│   ├── browser-worker/     # Playwright PMS automation
│   ├── dashboard/          # Next.js operator dashboard
│   └── mock-pms/           # Simulated PMS for demos
├── packages/               # Shared libraries
│   ├── ai/                 # AI provider abstraction
│   ├── auth/               # JWT, RBAC, password hashing
│   ├── config/             # Environment configuration
│   ├── database/           # Prisma schema, migrations, seed
│   ├── domain/             # Shared types and Zod schemas
│   ├── storage/            # S3/MinIO artifact storage
│   ├── telemetry/          # Logging, metrics, tracing
│   ├── ui/                 # Shared React components
│   └── workflows/          # Temporal workflows & activities
├── infrastructure/         # Docker, K8s, Terraform, observability
├── scripts/demo/           # Demo automation scripts
├── tests/                  # Integration, e2e, load tests
└── docs/                   # Architecture & operational docs
```

## Deployment

- **Local:** `docker compose up --build`
- **Kubernetes:** `kubectl apply -k infrastructure/kubernetes/overlays/local`
- **AWS:** See [docs/deployment.md](docs/deployment.md) and `infrastructure/terraform/aws/`

## Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](docs/architecture.md) | System design and component interactions |
| [data-model.md](docs/data-model.md) | Database schemas and relationships |
| [workflows.md](docs/workflows.md) | Temporal workflow stages and signals |
| [failure-recovery.md](docs/failure-recovery.md) | Failure modes and recovery patterns |
| [observability.md](docs/observability.md) | Metrics, traces, dashboards |
| [security.md](docs/security.md) | Auth, RBAC, tenant isolation |
| [testing.md](docs/testing.md) | Test strategy and CI |
| [deployment.md](docs/deployment.md) | Docker, K8s, AWS deployment |
| [load-testing.md](docs/load-testing.md) | k6 scenarios and thresholds |
| [demo-script.md](docs/demo-script.md) | Demo walkthrough |
| [troubleshooting.md](docs/troubleshooting.md) | Common issues |
| [adr/](docs/adr/) | Architecture Decision Records |

## License

See [LICENSE](LICENSE).

## Portfolio and Resume Summary

InnFlow is a fault-tolerant multi-tenant infrastructure platform for autonomous hotel operations. It combines durable Temporal workflows, AI-agent planning, Playwright computer-use automation, distributed tracing, failure recovery, human approvals, and production-style deployment infrastructure.

**Resume bullets:**

- Architected a multi-tenant TypeScript control plane orchestrating autonomous AI agents and Playwright browser workers across simulated hotel reservation and operational workflows.
- Implemented durable Temporal workflows with idempotency, retries, circuit breaking, human approvals, failure requeueing, and crash recovery for reliable task execution.
- Instrumented distributed services using OpenTelemetry, Prometheus, Grafana, and Jaeger to expose workflow latency, agent behavior, browser failures, and cross-service traces.
- Containerized the platform with Docker and added Kubernetes, Terraform, GitHub Actions, automated tests, and k6 load-testing infrastructure.

Measurable performance values should only be added after the benchmark suite has been executed locally (`pnpm test:load` → `docs/BENCHMARK_RESULTS.md`).
