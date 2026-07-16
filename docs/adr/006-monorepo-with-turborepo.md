# ADR 006: Monorepo with Turborepo

## Status

Accepted

## Context

InnFlow consists of 5 applications and 10+ shared packages with interdependencies (domain types, auth, database, workflows). We need:

- Shared TypeScript types across API, workers, and dashboard
- Coordinated builds and dependency ordering
- Single CI pipeline with caching
- Consistent tooling (lint, format, typecheck)

Options:

- **Polyrepo** — independent repos per service, published packages
- **Monorepo (pnpm workspaces + Turborepo)** — single repo, workspace protocol
- **Monorepo (Nx)** — more features but heavier setup

## Decision

Use pnpm workspaces with Turborepo for task orchestration and build caching. Package naming: `@innflow/<name>`. Apps in `apps/`, shared code in `packages/`.

## Consequences

**Positive:**
- Atomic changes across API and shared packages
- Turborepo remote caching in CI
- Workspace protocol (`workspace:*`) for zero-publish dependency management
- Single PR can update schema, API, and dashboard together

**Negative:**
- Larger repository clone size
- All developers need monorepo tooling (pnpm, turbo)
- Docker builds copy entire monorepo context
