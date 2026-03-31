---
phase: 12-integrations-settings-ui
plan: 03
subsystem: web/e2e
tags: [playwright, e2e, mock-api, settings, integration-tests, checkpoint]

requires:
  - phase: 12-01
    provides: GET/PUT/POST /api/integrations/:key routes
  - phase: 12-02
    provides: IntegrationsPage at /settings with Intune + OpenAI sections

provides:
  - Playwright E2E tests for /settings route (7 tests)
  - mockApi.ts integration route handlers (6 endpoints)
  - Human verification checkpoint for visual sign-off

affects:
  - Full test suite: 23 Playwright E2E tests total (up from 16)

tech-stack:
  added: []
  patterns:
    - "mockApi.ts single-handler pattern: one route handler per URL, method check inside"
    - "settings.spec.ts follows shell-navigation.spec.ts structure (beforeEach setupMockApi)"

key-files:
  created:
    - "apps/web/tests/settings.spec.ts — 7 Playwright E2E tests for /settings route"
  modified:
    - "apps/web/src/test/mockApi.ts — 6 integration endpoint mock handlers"

key-decisions:
  - "Single handler per URL endpoint checking method internally — matches existing mockApi.ts pattern"
  - "GET /api/integrations/intune mock returns configured:true so Configured badge test is deterministic"
  - "GET /api/integrations/openai mock returns configured:false to exercise both badge states"

requirements-completed: [CRED-01, CRED-02, CRED-03, CRED-04]

duration: ~5min (Task 1 was pre-committed in prior session)
completed: 2026-03-31
---

# Phase 12 Plan 03: Playwright E2E Tests + Human Verification

**7 Playwright E2E tests covering /settings navigation, Intune/OpenAI section rendering, health badges, test-connection flow, and secret masking. 6 mockApi.ts integration handlers. Human checkpoint pending.**

## Performance

- **Duration:** ~5 min (Task 1 pre-committed; test suite verification 2m)
- **Completed:** 2026-03-31
- **Tasks:** 2 (Task 1 auto, Task 2 human checkpoint)
- **Files modified:** 2

## Accomplishments

- `apps/web/tests/settings.spec.ts`: 7 E2E tests covering:
  1. Navigate to /settings via sidebar
  2. Renders Intune section with pre-filled fields (tenantId, clientId)
  3. Renders OpenAI section
  4. Shows Configured badge when `configured: true`
  5. Shows "Not yet verified" health status row on page load
  6. Test connection shows "Connected successfully" result
  7. No secret values visible in page content
- `apps/web/src/test/mockApi.ts`: 6 integration mock handlers (GET+PUT intune, POST intune/test, GET+PUT openai, POST openai/test)
- Full test suite: all 23 Playwright E2E tests pass (up from 16), 41 web unit tests, all API tests green

## Task Commits

1. **Task 1: Playwright E2E tests** - `7bf213b` (feat)
2. **Task 1: mockApi integration handlers** - `32601a9` (feat)

## Files Created/Modified

- `apps/web/tests/settings.spec.ts` — 7 Playwright E2E tests for /settings route
- `apps/web/src/test/mockApi.ts` — 6 integration endpoint mock handlers added

## Deviations from Plan

None.

## Self-Check: PASSED

- FOUND: apps/web/tests/settings.spec.ts
- FOUND: commit 7bf213b (feat: Playwright E2E tests)
- FOUND: commit 32601a9 (feat: mockApi handlers)
- mockApi.ts contains `api/integrations/intune` handlers
- mockApi.ts contains `api/integrations/openai` handlers
- mockApi.ts contains `api/integrations/intune/test` handler
- settings.spec.ts contains navigation to `/settings`
- settings.spec.ts contains assertion for "Microsoft Intune"
- settings.spec.ts contains assertion for "Configured"
- settings.spec.ts contains assertion for "Not yet verified"
- All 23 Playwright E2E tests pass (npx pnpm --filter @agentsmith/web test:e2e)
- All 41 web unit tests pass
- All API tests pass

---
*Phase: 12-integrations-settings-ui*
*Completed: 2026-03-31*
