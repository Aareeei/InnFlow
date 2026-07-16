# ADR 002: Multi-Schema PostgreSQL

## Status

Accepted

## Context

InnFlow manages two distinct data domains:

1. **Control plane** — tenants, users, workflows, audit (InnFlow-owned)
2. **PMS data** — hotels, rooms, reservations (mirrors/simulates external PMS)

These domains have different access patterns, ownership boundaries, and potential future separation (PMS data may eventually come from external APIs rather than local tables).

## Decision

Use a single PostgreSQL database with two schemas (`control` and `pms`) managed by Prisma multi-schema support.

## Consequences

**Positive:**
- Single database connection pool and migration pipeline
- Transactional consistency when control plane writes reference PMS state
- Clear schema-level separation for future extraction

**Negative:**
- Prisma multi-schema adds configuration complexity
- Cannot independently scale schemas without migration
- Cross-schema joins possible but discouraged by convention
