---
phase: 11-first-run-bootstrap
plan: 02
subsystem: web-auth
tags: [react, react-query, first-run, bootstrap, local-auth, login, setup-page]

# Dependency graph
requires:
  - phase: 11-01
    provides: GET /api/bootstrap-status, POST /api/bootstrap, POST /api/auth/local/login

provides:
  - useBootstrapStatus hook — /api/bootstrap-status query with staleTime Infinity
  - SetupPage — first-run admin creation form at /setup (pre-auth route)
  - ProtectedLayout bootstrap redirect — checks bootstrapRequired before session auth
  - LoginPage local auth form — username/password below existing Microsoft sign-in button
  - /setup route registered outside ProtectedLayout

affects:
  - phase-12-integrations-settings (auth flow is now fully wired end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bootstrap status cached with staleTime: Infinity (changes at most once per app lifetime)
    - ProtectedLayout priority order: bootstrapRequired check before session auth check
    - LoginPage dual-mode: local form always visible alongside Microsoft sign-in button
    - Mock API extended with bootstrapRequired option defaulting to false (backward compatible)

key-files:
  created:
    - apps/web/src/hooks/useBootstrapStatus.ts — useBootstrapStatus export
    - apps/web/src/routes/SetupPage.tsx — SetupPage export
    - apps/web/src/routes/SetupPage.test.tsx — 4 tests covering all SetupPage behaviors
  modified:
    - apps/web/src/routes/ProtectedLayout.tsx — added useBootstrapStatus, bootstrap redirect before auth check
    - apps/web/src/routes/LoginPage.tsx — added useBootstrapStatus + local login form with POST /api/auth/local/login
    - apps/web/src/router.tsx — added /setup route before ProtectedLayout
    - apps/web/src/test/mockApi.ts — bootstrapRequired option + bootstrap-status, bootstrap, auth/local/login handlers
    - apps/web/src/routes/ProtectedLayout.test.tsx — mock useBootstrapStatus in all 4 tests
    - apps/web/src/routes/auth-routing.test.tsx — mock useBootstrapStatus (LoginPage + ProtectedLayout both use it now)

key-decisions:
  - "SetupPage redirects to /login when bootstrapRequired === false (not undefined check — explicit false guards against loading state)"
  - "LoginPage always shows local form once bootstrap is complete — operator may want local login even with Entra configured"
  - "mockApi.ts bootstrapRequired defaults to false so all 29 existing tests continue to work without changes"
  - "ProtectedLayout.test.tsx and auth-routing.test.tsx mock useBootstrapStatus at module level — consistent with useSession mock pattern"

patterns-established:
  - "Pattern: bootstrap check in ProtectedLayout before session check — bootstrapRequired → /setup, then !authenticated → /login"
  - "Pattern: useBootstrapStatus staleTime: Infinity — boot state is immutable after first admin creation"

requirements-completed: [BOOT-01, BOOT-02, BOOT-03]

# Metrics
duration: 7min
completed: 2026-03-30
---

# Phase 11 Plan 02: First-Run Bootstrap Web UI Summary

**React setup page and local login form so the operator can create the initial admin and sign in without Entra ID configured**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-30T20:37:00Z
- **Completed:** 2026-03-30T20:44:00Z
- **Tasks:** 2
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- `useBootstrapStatus` hook queries `GET /api/bootstrap-status` with `staleTime: Infinity` — bootstrap state is immutable after first admin creation
- `SetupPage` renders admin creation form (username/password/confirm), redirects to `/login` when bootstrap already complete, updates query cache on success and navigates to `/`
- `ProtectedLayout` now checks `bootstrapRequired` before `!authenticated` — users land on `/setup` before they can land on `/login`
- `LoginPage` shows local username/password form below the existing Microsoft sign-in button; redirects to `/setup` if bootstrap not yet done
- `/setup` route registered at the top level (outside `ProtectedLayout`) so it is accessible without a session
- `mockApi.ts` extended with `bootstrapRequired` option (default `false`) and three new handlers: `GET /api/bootstrap-status`, `POST /api/bootstrap`, `POST /api/auth/local/login`
- All existing 29 web tests pass unchanged; 4 new `SetupPage.test.tsx` tests cover: redirect-when-complete, form rendering, password mismatch validation, and successful submit+navigate
- Full suite green: 33 web tests, API tests, 16 Playwright E2E tests

## Task Commits

1. **Task 1: Create useBootstrapStatus hook, SetupPage, update ProtectedLayout + LoginPage, add /setup route, extend mockApi** - `b033273` (feat)
2. **Task 2: Write SetupPage.test.tsx with 4 test cases** - `1a80ded` (test)

## Files Created/Modified

- `apps/web/src/hooks/useBootstrapStatus.ts` — `useBootstrapStatus`, `bootstrapStatusQueryKey`
- `apps/web/src/routes/SetupPage.tsx` — `SetupPage` with form, redirect logic, error handling
- `apps/web/src/routes/SetupPage.test.tsx` — 4 tests: redirect, form visible, password mismatch, success flow
- `apps/web/src/routes/ProtectedLayout.tsx` — added `useBootstrapStatus` import, bootstrap check before auth
- `apps/web/src/routes/LoginPage.tsx` — added `useBootstrapStatus`, `useNavigate`, local login form
- `apps/web/src/router.tsx` — added `/setup` route before `ProtectedLayout`
- `apps/web/src/test/mockApi.ts` — `bootstrapRequired` option + 3 new route handlers
- `apps/web/src/routes/ProtectedLayout.test.tsx` — added `useBootstrapStatus` mock + return values in 4 tests
- `apps/web/src/routes/auth-routing.test.tsx` — added `useBootstrapStatus` module-level mock

## Decisions Made

- `SetupPage` checks `bootstrapRequired === false` (not `!bootstrapRequired`) to avoid redirecting during the loading state when `data` is still `undefined`
- `LoginPage` always renders local form once bootstrap is complete — Entra may or may not be configured, both paths coexist on the same page
- `ProtectedLayout` tests mock `useBootstrapStatus` at the mock factory level (consistent with `useSession` pattern) with `{ data: { bootstrapRequired: false }, isLoading: false }` default
- `auth-routing.test.tsx` uses a module-level `vi.fn()` factory returning the same default — simpler because the test never needs to vary bootstrap state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ProtectedLayout.test.tsx and auth-routing.test.tsx failures after adding useBootstrapStatus**
- **Found during:** Task 1 verification (web test run)
- **Issue:** ProtectedLayout now calls `useBootstrapStatus` which was not mocked — 2 tests stuck on LoadingShell indefinitely because `bootstrapLoading` was never resolved
- **Fix:** Added `vi.mock("../hooks/useBootstrapStatus", ...)` to both test files; added `useBootstrapStatusMock.mockReturnValue(...)` with `{ data: { bootstrapRequired: false }, isLoading: false }` to each affected test
- **Files modified:** `ProtectedLayout.test.tsx`, `auth-routing.test.tsx`
- **Committed in:** `b033273` (Task 1 commit)

**2. [Rule 3 - Blocking] Regenerated Prisma client to fix API test failures**
- **Found during:** Task 2 full-suite verification
- **Issue:** Worktree Prisma client missing `Prisma` named export — all API tests failing with `SyntaxError: The requested module '@prisma/client' does not provide an export named 'Prisma'`
- **Fix:** Ran `npx prisma generate` — same pre-existing worktree issue as Plan 11-01
- **Files modified:** No source files — generated artifacts only
- **Committed in:** Not committed (generated artifacts)

---

**Total deviations:** 2 auto-fixed (one bug in tests, one blocking build artifact issue)

## Known Stubs

None — all UI flows are wired to real API endpoints. No hardcoded empty values or placeholder returns.

## Self-Check: PASSED

- FOUND: `apps/web/src/hooks/useBootstrapStatus.ts`
- FOUND: `apps/web/src/routes/SetupPage.tsx`
- FOUND: `apps/web/src/routes/SetupPage.test.tsx`
- FOUND: commit `b033273` (feat — Task 1)
- FOUND: commit `1a80ded` (test — Task 2)
