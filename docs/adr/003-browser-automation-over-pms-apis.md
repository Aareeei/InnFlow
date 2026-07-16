# ADR 003: Browser Automation over PMS APIs

## Status

Accepted

## Context

Hotel PMS systems often lack modern APIs. Many properties use legacy web interfaces as the only programmatic access point. InnFlow must execute housekeeping requests, maintenance tickets, wake-up calls, and reservation changes.

Options considered:

- **Direct PMS API integration** — ideal but unavailable for demo/target PMS
- **Browser automation (Playwright)** — works with any web UI, captures visual evidence
- **RPA tools (UiPath, etc.)** — heavier infrastructure, less developer-friendly

## Decision

Use Playwright for PMS interaction via a dedicated browser worker on a separate Temporal task queue. Capture before/after screenshots as execution artifacts stored in S3.

## Consequences

**Positive:**
- Works with any web-based PMS without API partnership
- Visual evidence for verification and audit
- Failure injection simulates real browser crash scenarios

**Negative:**
- Fragile to UI changes (selectors must be maintained)
- Higher resource usage (browser processes)
- Slower than direct API calls
- Requires Playwright-specific Docker image with browser dependencies
