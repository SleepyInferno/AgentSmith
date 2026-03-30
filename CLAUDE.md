# Claude Handoff: v1.1 Operator Experience

This repository is ready for the next milestone: `v1.1 Operator Experience`.

The goal of this milestone is to refresh the existing five-tool UI so the solo operator can move through the app faster, with clearer hierarchy, stronger consistency, better responsive and accessibility behavior, and broader non-human UI verification.

## Read This First

1. `AGENTS.md`
2. `.planning/PROJECT.md`
3. `.planning/REQUIREMENTS.md`
4. `.planning/ROADMAP.md`
5. `.planning/STATE.md`
6. `.planning/MILESTONES.md`

## Current Status

- v1.0 is complete and archived.
- v1.1 is active and starts at Phase 07: `Operator Shell Refresh`.
- The standard automated regression path currently passes:
  - `npx pnpm test`
- That green path currently covers:
  - API tests
  - Web unit and route-smoke tests
  - Playwright browser tests for auth, shell navigation, inventory/detail handoffs, and key lifecycle/docs workflows
- The browser UI tests use mocked `/api` and `/auth` responses. They validate frontend behavior, but they are not a real browser-to-API integration profile yet.
- Full API typecheck still has pre-existing docs/lifecycle TypeScript debt outside this milestone.

## Milestone Scope

Preserve the existing five-tool surface:

- Asset health
- Lifecycle automation
- Network visibility
- Backup confidence
- Documentation assistant

Do not expand the product into new modules during this milestone.

## Phase Plan

### Phase 07: Operator Shell Refresh

Focus:
- Shared shell navigation
- Primary and utility route clarity
- Active-state and route context
- Shared page chrome and review-side infrastructure

Primary requirements:
- `SHELL-01`
- `SHELL-02`
- `SHELL-03`

### Phase 08: Queue and Detail Refresh

Focus:
- Consistent queue-to-detail and queue-to-inventory handoffs
- Back-links and return navigation
- Shared layout rhythm across queue, table, detail, and review surfaces
- Consistent state treatment for loading, empty, stale, error, and read-only UI

Primary requirements:
- `FLOW-01`
- `FLOW-02`
- `FLOW-03`
- `FLOW-04`

### Phase 09: Interface Consistency and Hardening

Focus:
- Keyboard and accessibility hardening
- Responsive refinements
- Component-level UI regression coverage
- Broader shell and workflow automation

Primary requirements:
- `QUAL-01`
- `QUAL-02`
- `QUAL-03`
- `TEST-01`
- `TEST-02`

## High-Signal Files

Shared shell and routing:
- `apps/web/src/router.tsx`
- `apps/web/src/routes/ProtectedLayout.tsx`
- `apps/web/src/routes/LoginPage.tsx`
- `apps/web/src/routes/dashboard/AssetDashboardPage.tsx`

Current web test infrastructure:
- `apps/web/vitest.config.ts`
- `apps/web/playwright.config.ts`
- `apps/web/src/test/mockApi.ts`
- `apps/web/src/test/renderApp.tsx`
- `apps/web/src/test/router.smoke.test.tsx`
- `apps/web/tests/app-smoke.spec.ts`
- `apps/web/tests/auth.spec.ts`
- `apps/web/tests/inventory-and-detail.spec.ts`
- `apps/web/tests/shell-navigation.spec.ts`
- `apps/web/tests/workflows.spec.ts`

Planning docs:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

## Known Remaining Automation Gaps

These surfaced in Claude and subagent review and should guide the next testing wave:

- Shared shell chrome is only lightly asserted beyond presence and basic navigation.
- Some dashboard hotspots and panel-level links are still untested.
- Queue-first handoffs on network and lifecycle need deeper interaction coverage.
- Network map content and its secondary links are only lightly covered.
- Many detail-page return links and secondary navigation flows are still unasserted.
- Filter reset and clean-URL restoration flows need coverage.
- Lifecycle coverage is strong for onboarding happy paths, but weaker for offboarding, reopening existing runs, and post-close read-only behavior.
- Docs metadata review needs deeper assertions around changed fields, history updates, and close-without-save behavior.
- Connectors and audit pages only have light behavioral coverage.
- Non-happy states across route surfaces still need stronger automated checks.
- There is not yet a real API-backed browser test profile.

## Recommended Start Sequence

1. Start with Phase 07 and audit the shared shell before touching page-level polish.
2. Tighten navigation, active-state, spacing, route context, and persistent chrome first.
3. Extend tests alongside each shell change so `npx pnpm test` stays green.
4. Move into queue/detail consistency only after the shell pattern is stable.
5. Leave accessibility, responsive hardening, and deeper automation expansion for Phase 09 unless a Phase 07 change requires immediate support.

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
- Do not revert unrelated work in the tree.

## Suggested First Task

Begin with `Phase 07: Operator Shell Refresh` and produce one coherent pass over:

- persistent navigation
- active-route styling
- shell hierarchy and spacing
- shared browser chrome
- review-side layout consistency
- companion test updates for shell and navigation behavior
