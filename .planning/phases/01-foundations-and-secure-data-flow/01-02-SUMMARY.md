---
phase: 01-foundations-and-secure-data-flow
plan: 02
subsystem: auth
tags: [entra-id, oidc, react-query, fastify, session-cookie, audit]
requires:
  - phase: 01-01
    provides: workspace, shared env parsing, canonical schema, initial shell
provides:
  - Entra ID auth routes with Authorization Code + PKCE
  - server-managed operator session checks via /api/me
  - protected React shell with login route and shared browser API client
affects: [connectors, audit, dashboard-shell, phase-01-03, all-feature-routes]
tech-stack:
  added: [openid-client]
  patterns: [api-backed session gating, shared credentials-included fetch client, auth route injection tests]
key-files:
  created:
    - apps/web/src/lib/api.ts
    - apps/web/src/hooks/useSession.ts
    - apps/web/src/routes/LoginPage.tsx
    - apps/web/src/routes/ProtectedLayout.tsx
    - apps/api/src/routes/auth.test.ts
  modified:
    - apps/api/src/plugins/auth.ts
    - apps/api/src/routes/auth.ts
    - apps/api/src/routes/me.ts
    - apps/api/src/modules/audit/audit.service.ts
    - apps/api/src/server.ts
    - apps/web/src/router.tsx
key-decisions:
  - "Wrapped the current later-phase shell in a protected layout instead of rewinding the UI to an earlier placeholder, so the backfilled auth work preserved existing operator flows."
  - "Centralized browser requests through a shared credentials-included client so session-aware fetch behavior stays consistent across current and future routes."
patterns-established:
  - "API Session Pattern: the shell trusts /api/me rather than browser-local flags for authenticated state."
  - "Protected Shell Pattern: public login lives outside the app shell while authenticated routes sit behind ProtectedLayout."
requirements-completed: [PLAT-01, PLAT-02]
duration: 23min
completed: 2026-03-28
---

# Phase 1: Foundations and Secure Data Flow Summary

**Entra ID login, server-managed session cookies, API-backed operator identity checks, and a protected React shell wrapped around the current AgentSmith workspace**

## Performance

- **Duration:** 23 min
- **Started:** 2026-03-28T14:43:20-04:00
- **Completed:** 2026-03-28T15:06:56.6900107-04:00
- **Tasks:** 3
- **Files modified:** 18

## Accomplishments
- Added Microsoft Entra Authorization Code + PKCE login, callback, logout, and `/api/me` session identity routes on the API.
- Replaced ad hoc browser fetch helpers with a shared session-aware client and wrapped the existing app routes in a protected shell plus login page.
- Added auth route tests so login, callback, logout, and `/api/me` behavior are verified independently from unrelated docs and lifecycle compile issues.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Entra OIDC and secure session handling in the API** - `841ad8f` (`feat(01-02): implement Entra auth session flow`)
2. **Task 2: Add a protected React shell and login flow** - `7545ff5` (`feat(01-02): add protected web shell`)
3. **Task 3: Wire authentication events into the audit trail contract** - `50d4ced` (`fix(01-02): finish auth audit route contract`)

**Plan metadata:** pending in the next docs commit with this summary and plan-tracking updates

## Files Created/Modified
- `apps/api/src/plugins/auth.ts` - OIDC provider discovery, callback exchange, and signed session/auth-flow cookie helpers
- `apps/api/src/routes/auth.ts` - login, callback, and logout routes with audit writes and redirect completion
- `apps/api/src/routes/me.ts` - API-owned authenticated user contract for the shell
- `apps/api/src/routes/auth.test.ts` - route-level verification for login, callback, logout, and `/api/me`
- `apps/web/src/lib/api.ts` - shared browser API client that always includes session credentials
- `apps/web/src/hooks/useSession.ts` - React Query session lookup against `/api/me`
- `apps/web/src/routes/LoginPage.tsx` - public Microsoft sign-in surface with failure messaging
- `apps/web/src/routes/ProtectedLayout.tsx` - authenticated shell gate with Dashboard, Connectors, Audit, operator identity, and sign-out
- `apps/web/src/router.tsx` - public login route plus protected route tree for the existing app shell

## Decisions Made

- Preserved the later-phase UI investment by wrapping the shipped shell in auth instead of restoring the old Phase 1 placeholder experience.
- Kept session truth on the API and reused it in React through `useSession` so future routes can inherit the same boundary without local auth drift.

## Deviations from Plan

### Auto-fixed Issues

**1. Login redirect response was not completing**
- **Found during:** Task 3 verification
- **Issue:** `GET /auth/login` set redirect headers but did not finish the Fastify reply, which caused hanging auth smoke checks.
- **Fix:** Completed the redirect response explicitly in `apps/api/src/routes/auth.ts` with `reply.send()`.
- **Files modified:** `apps/api/src/routes/auth.ts`
- **Verification:** `node --import tsx --test src/routes/auth.test.ts` passes, including the login route case.

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** The fix was required for a working auth redirect flow. No scope creep was introduced.

## Issues Encountered

- `pnpm --filter @agentsmith/api build` is still blocked by pre-existing TypeScript errors in docs and lifecycle files outside this plan's scope. Targeted auth route tests, web build, and API import smoke checks were used to verify Phase 1 auth work without changing unrelated modules.

## User Setup Required

External service configuration is still required before live sign-in works:
- Set `SESSION_SECRET` to a real secret value.
- Populate `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, and `ENTRA_REDIRECT_URI`.
- Confirm the Entra app registration includes the API callback URL and the local web origin.

## Next Phase Readiness

- Wave 2 is complete and summarized.
- The protected shell now exists for `01-03` to hang connector status and audit trail pages on top of a real authenticated session boundary.
- Connector work should preserve the shared browser client and avoid leaking provider-specific payloads into the UI.

---
*Phase: 01-foundations-and-secure-data-flow*
*Completed: 2026-03-28*
