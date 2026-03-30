# Claude Handoff: v1.2 Intune Integration

v1.1 Operator Experience is complete and archived. v1.2 is the active milestone.

## Read This First

1. `AGENTS.md`
2. `.planning/PROJECT.md`
3. `.planning/REQUIREMENTS.md`
4. `.planning/ROADMAP.md`
5. `.planning/STATE.md`
6. `.planning/MILESTONES.md`

## Current Status

- v1.0 complete and archived.
- v1.1 complete and archived. Phase 07 (Operator Shell Refresh) shipped. Phases 08–09 deferred to v1.2.
- v1.2 Intune Integration is active. Requirements and roadmap are being defined.
- The standard automated regression path currently passes:
  - `npx pnpm test`
- That green path currently covers:
  - API tests
  - Web unit and route-smoke tests
  - Playwright browser tests for auth, shell navigation, inventory/detail handoffs, and key lifecycle/docs workflows
- The browser UI tests use mocked `/api` and `/auth` responses. They are not a real browser-to-API integration profile yet.
- Full API typecheck still has pre-existing docs/lifecycle TypeScript debt outside this milestone.

## Deferred from v1.1

These requirements were planned but not executed in v1.1. They carry forward to v1.2:

- **FLOW-01→04**: Queue-to-detail and detail-to-queue navigation consistency
- **QUAL-01→03**: Keyboard/accessibility, accessible labels, responsive layouts
- **TEST-01→02**: Automated shell/workflow UI coverage

Phase directories `08-queue-and-detail-refresh` and `09-interface-consistency-and-hardening` exist with README stubs.

## Commands

Install and run:

- `npx pnpm test`
- `npx pnpm --filter @agentsmith/web test`
- `npx pnpm --filter @agentsmith/web test:e2e`
- `npx pnpm --filter @agentsmith/api test`

## Guardrails

- Preserve the five-tool scope unless planning docs are explicitly updated.
- Favor guided workflows and clear risk queues over dashboard sprawl.
- Keep connector-specific logic isolated from internal domain models.
- Treat write actions as high-trust operations that require explicit review and auditability.
- Credentials must never be held in the browser — server-side storage only.
- Do not revert unrelated work in the tree.
