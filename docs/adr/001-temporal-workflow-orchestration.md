# ADR 001: Temporal for Workflow Orchestration

## Status

Accepted

## Context

InnFlow processes guest requests through a multi-stage pipeline (classify → plan → policy → execute → verify) that may take minutes to hours. Requests can require human approval, survive worker crashes, and need exactly-once semantics for PMS writes.

We evaluated:

- **Custom state machine in PostgreSQL** — simpler but requires building retry, timeout, and signal handling
- **AWS Step Functions** — vendor lock-in, limited local dev experience
- **Temporal** — purpose-built for durable execution with signals, queries, and replay

## Decision

Use Temporal as the workflow orchestration engine with two task queues:

- `innflow-orchestration` for AI and coordination activities
- `innflow-browser-automation` for Playwright browser activities

## Consequences

**Positive:**
- Automatic retry and timeout handling
- Workflow history for debugging and audit
- Signal-based human approval without polling
- Deterministic replay for testing

**Negative:**
- Additional infrastructure dependency (Temporal server)
- Learning curve for workflow determinism constraints
- Separate worker deployment and scaling considerations
