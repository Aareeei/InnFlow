# Security

## Authentication

- **JWT access tokens** (15-minute default TTL) with HS256 signing
- **Refresh tokens** (7-day default TTL) for session renewal
- Passwords hashed with **argon2id** (via `@innflow/auth`)
- Minimum JWT secret length: 16 characters (enforced by config validation)

## Authorization (RBAC)

| Role | Permissions |
|------|-------------|
| VIEWER | Read requests, read audit |
| OPERATOR | + resolve approvals, manage failures |
| TENANT_ADMIN | + write requests, retry workflows, tenant failure injection |
| SYSTEM_ADMIN | + system health, all tenants, system failure injection |

Permission checks enforced via `@innflow/auth` guards on every protected endpoint.

## Tenant Isolation

- JWT contains `tenantId` claim (null for system admin)
- All database queries filtered by tenant ID at the repository layer
- Cross-tenant resource access returns 403/404
- System admin can impersonate tenant context via `X-Tenant-Id` header

## API Security

- **Idempotency-Key** header required for mutating guest request endpoints
- Rate limiting via Redis (per-tenant, per-endpoint)
- CORS restricted to configured origins (`CORS_ORIGINS`)
- Input validation via Zod schemas from `@innflow/domain`
- Structured error responses without internal stack traces in production

## Secrets Management

| Secret | Local | Production |
|--------|-------|------------|
| JWT_SECRET | `.env` | AWS Secrets Manager / K8s Secret |
| DATABASE_URL | `.env` | RDS via Secrets Manager |
| S3 credentials | `.env` | IAM roles (IRSA on EKS) |
| OPENAI_API_KEY | `.env` | Secrets Manager |

Never commit `.env` files. Use `.env.example` as template.

## Container Security

All Dockerfiles run as non-root user (`innflow:1001`):

- Read-only root filesystem where supported
- No privileged containers
- Minimal base images (Alpine / Playwright official)

## Network Security (Production)

- Control API behind ALB with TLS termination
- Internal services (workers, Temporal, Redis, RDS) in private subnets
- Security groups restrict database/Redis access to VPC CIDR
- EKS nodes in private subnets with NAT gateway egress

## Audit Trail

All significant actions recorded in `audit_events`:

- Actor type (USER, SYSTEM, AGENT)
- Action, resource type, resource ID
- Metadata JSON and trace ID
- Immutable — no updates or deletes

## Dependency Scanning

- `pnpm audit` in CI (PR workflow)
- Trivy container scanning in container build workflow
- Dependabot recommended for automated dependency updates

## Security Checklist (Production)

- [ ] Rotate JWT secret and database credentials
- [ ] Enable RDS encryption at rest and in transit
- [ ] Enable Redis TLS (`transit_encryption_enabled`)
- [ ] Configure WAF on ALB
- [ ] Set `AI_PROVIDER=openai` with API key in secrets manager
- [ ] Disable failure injection endpoints in production
- [ ] Enable Grafana authentication (OAuth/LDAP)
