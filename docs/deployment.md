# Deployment

## Local (Docker Compose)

Full stack with a single command:

```bash
docker compose up --build -d
pnpm db:migrate && pnpm db:seed
```

Services defined in root `docker-compose.yml`. Dockerfiles in `infrastructure/docker/`.

## Kubernetes

Manifests use Kustomize with base + overlays.

### Local Overlay

Reduced replicas, debug logging:

```bash
kubectl apply -k infrastructure/kubernetes/overlays/local
```

### Production Overlay

Higher replicas, production config:

```bash
kubectl apply -k infrastructure/kubernetes/overlays/production
```

### Prerequisites

Create secrets before deploying:

```bash
kubectl create namespace innflow
kubectl create secret generic innflow-secrets -n innflow \
  --from-literal=database-url='postgresql://...' \
  --from-literal=redis-url='redis://...' \
  --from-literal=jwt-secret='...'
```

External dependencies (Temporal, PostgreSQL, Redis, S3) must be provisioned separately or via Helm charts.

### Base Resources

| Resource | Replicas (prod) |
|----------|-----------------|
| control-api | 3 |
| workflow-worker | 4 |
| browser-worker | 2 |
| dashboard | 3 |
| mock-pms | 1 |

## AWS (Terraform)

Infrastructure in `infrastructure/terraform/aws/`.

### Modules

| Module | Resources |
|--------|-----------|
| `vpc` | VPC, subnets, NAT, security groups |
| `rds` | PostgreSQL 16, Secrets Manager credentials |
| `elasticache` | Redis 7 cluster with TLS |
| `s3` | Artifacts bucket with versioning and lifecycle |
| `eks` | Kubernetes 1.31 cluster with managed node group |

### Deploy

```bash
cd infrastructure/terraform/aws
terraform init
terraform plan -var="environment=production" -var="artifacts_bucket_name=innflow-prod-artifacts"
terraform apply
```

### Post-Terraform

1. Configure `kubectl` with EKS cluster
2. Install AWS Load Balancer Controller
3. Deploy InnFlow K8s manifests
4. Run database migrations as a K8s Job
5. Configure DNS and TLS certificates

## Container Registry

Images built by CI (`container.yml`) and pushed to `ghcr.io/<org>/innflow/<service>`.

Manual build:

```bash
docker build -f infrastructure/docker/control-api/Dockerfile -t innflow/control-api .
```

## Environment Variables

See `.env.example` for full list. Critical production variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Token signing secret (32+ chars) |
| `TEMPORAL_ADDRESS` | Temporal frontend address |
| `S3_ENDPOINT` | S3 or MinIO endpoint |
| `AI_PROVIDER` | `mock` or `openai` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel collector endpoint |

## Rollback

Kubernetes:

```bash
kubectl rollout undo deployment/control-api -n innflow
```

Database migrations are forward-only. Test migrations in staging before production apply.
