---
phase: 12-integrations-settings-ui
plan: 02
subsystem: web
tags: [react, react-query, credential-forms, toast, health-badge, settings-page, vitest]

requires:
  - phase: 12-01
    provides: GET/PUT/POST /api/integrations/:key routes, IntegrationCredential with lastTestedAt/lastTestResult

provides:
  - IntegrationsPage at /settings route with Intune + OpenAI sections
  - useToast hook with auto-dismiss timer
  - Toast overlay component (success/error variants)
  - Sidebar nav entry for Integrations
  - 8 unit tests covering CRED-01 through CRED-04 UI behaviors

affects:
  - 12-03 (health badge display reads same query data; test-connection flow complete)
  - shell navigation (Integrations link in sidebar utility nav)

tech-stack:
  added: []
  patterns:
    - "IntegrationSection reusable component: takes fields array + integrationKey; encapsulates query, save mutation, test mutation, toast, inline result"
    - "Secret masking at UI layer: secret fields always render with value='' regardless of server response"
    - "Non-secret pre-fill: tenantId/clientId use server value when local state is empty string"
    - "Blank-secret preservation on save: only includes secret in PUT body if user typed something"
    - "Three-layer test-connection feedback: toast (auto-dismiss) + inline result (stays) + health badge (query invalidation)"

key-files:
  created:
    - "apps/web/src/routes/settings/IntegrationsPage.tsx — full integrations settings page, Intune + OpenAI sections"
    - "apps/web/src/hooks/useToast.ts — useToast hook with auto-dismiss"
    - "apps/web/src/components/Toast.tsx — toast overlay component"
    - "apps/web/src/routes/settings/IntegrationsPage.test.tsx — 8 unit tests"
  modified:
    - "apps/web/src/router.tsx — Integrations nav item + /settings route"

key-decisions:
  - "IntegrationSection component used for both Intune and OpenAI — takes fields array to avoid duplication while accommodating different field sets"
  - "Secret masking enforced at render time (value always from local state, initialized to '') not at query response parsing"
  - "Test connection button disabled when not configured — avoids confusing 'test not configured' errors"
  - "Toast rendered inside IntegrationSection rather than page level — each section has independent toast state"

requirements-completed: [CRED-01, CRED-02, CRED-03, CRED-04]

duration: 8min
completed: 2026-03-31
---

# Phase 12 Plan 02: Integrations Settings UI — Web Layer Summary

**React integrations settings page with secret-masking credential forms, three-layer test-connection feedback (toast + inline + health badge), and 8 vitest unit tests covering CRED-01 through CRED-04**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T02:22:25Z
- **Completed:** 2026-03-31T02:30:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `IntegrationsPage` renders at `/settings` via sidebar "Integrations" utility nav entry
- Intune section: `tenantId` (pre-filled), `clientId` (pre-filled), `clientSecret` (always empty) with Configured badge, health row, save/test buttons
- OpenAI section: `apiKey` (always empty) with Configured badge, health row, save/test buttons
- Toast hook (`useToast`) with configurable auto-dismiss; Toast overlay component with success/error variants
- Three-layer test-connection feedback: toast fires on response, inline result stays visible, health badge updates via query invalidation
- 8 unit tests passing alongside existing 33-test suite (41 total web tests)
- Full test suite: 101 API tests + 41 web tests + 16 Playwright E2E all green

## Task Commits

1. **Task 1: IntegrationsPage + Toast + router wiring** - `eb68736` (feat)
2. **Task 2: IntegrationsPage unit tests** - `d1b7d49` (test)

**Plan metadata:** (this commit)

## Files Created/Modified

- `apps/web/src/routes/settings/IntegrationsPage.tsx` — full integrations settings page (272 lines)
- `apps/web/src/hooks/useToast.ts` — useToast hook with auto-dismiss
- `apps/web/src/components/Toast.tsx` — toast overlay component
- `apps/web/src/routes/settings/IntegrationsPage.test.tsx` — 8 unit tests
- `apps/web/src/router.tsx` — Integrations nav item + settings route

## Decisions Made

- **IntegrationSection reusable component**: Both Intune and OpenAI sections use the same `IntegrationSection` component with a `fields` prop array. Avoids duplicating mutation/query/toast logic while accommodating different field layouts.
- **Secret masking at render time**: Secret fields render with `value={formValues[field.name] ?? ""}` where form values are initialized to `""` — server data is never read for secret fields. This enforces D-01 without any conditional logic.
- **Blank-secret preservation on save**: PUT body only includes a secret field if the local state is non-empty. Empty means "keep existing" per D-11.
- **Test button disabled when unconfigured**: Prevents confusing network errors when no credential exists yet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma client not generated in worktree**
- **Found during:** Full test suite run after Task 2
- **Issue:** `@prisma/client` Prisma named export error on docs.repository and route tests — identical to the pre-existing issue fixed in Plan 01 (different worktree, same environment gap)
- **Fix:** `npx prisma generate --schema prisma/schema.prisma` from worktree root
- **Files modified:** node_modules only (not committed)
- **Verification:** All 101 API tests passed after generation

---

**Total deviations:** 1 auto-fixed (1 blocking environment setup)
**Impact on plan:** Environment-only; no scope or content change.

## Known Stubs

None. All API calls wire to real endpoints from Plan 01. The test-connection buttons are disabled (not hidden) when not yet configured — this is intentional behavior per CONTEXT.md D-03.

## Self-Check: PASSED

- FOUND: apps/web/src/routes/settings/IntegrationsPage.tsx
- FOUND: apps/web/src/hooks/useToast.ts
- FOUND: apps/web/src/components/Toast.tsx
- FOUND: apps/web/src/routes/settings/IntegrationsPage.test.tsx
- FOUND: commit eb68736 (feat: Task 1)
- FOUND: commit d1b7d49 (test: Task 2)
- All 41 web tests pass (npx pnpm --filter @agentsmith/web test)
- All 101 API tests pass (npx pnpm --filter @agentsmith/api test)
- All 16 Playwright E2E tests pass (npx pnpm test)

---
*Phase: 12-integrations-settings-ui*
*Completed: 2026-03-31*
