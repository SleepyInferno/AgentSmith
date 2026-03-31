---
phase: 11-first-run-bootstrap
plan: 01
subsystem: auth
tags: [bcrypt, fastify, session-cookie, local-auth, bootstrap, prisma]

# Dependency graph
requires:
  - phase: 10-schema-and-credential-foundation
    provides: User.passwordHash and User.role fields in Prisma schema

provides:
  - Bootstrap status endpoint (GET /api/bootstrap-status) — DB-locked admin count check
  - Bootstrap creation endpoint (POST /api/bootstrap) — one-time admin creation with bcrypt
  - Local login endpoint (POST /api/auth/local/login) — timing-safe credential check
  - loginLocal method on AgentSmithAuthService — session cookie with fresh UUID
  - Entra ID guard in createAuthService — server starts without Entra env vars

affects:
  - 11-02 (frontend bootstrap UI and LocalAuthProvider depend on these API endpoints)
  - phase-12-integrations-settings (credential masking patterns follow same auth model)

# Tech tracking
tech-stack:
  added:
    - bcrypt@6 — password hashing with configurable work factor
    - "@types/bcrypt@6" — TypeScript types for bcrypt
  patterns:
    - TDD (RED -> GREEN) for all auth and bootstrap behaviors
    - Timing-safe credential comparison using DUMMY_HASH fallback
    - DB-locked bootstrap guard (prisma.user.count, not a config flag)
    - Session ID regeneration on every local login (randomUUID per CLAUDE.md invariant)

key-files:
  created:
    - apps/api/src/routes/bootstrap.ts — registerBootstrapRoutes export
    - apps/api/src/routes/bootstrap.test.ts — 9 tests covering all bootstrap behaviors
    - apps/api/src/plugins/auth.test.ts — 3 tests for Entra guard and loginLocal
  modified:
    - apps/api/src/plugins/auth.ts — loginLocal added to interface and both implementations, Entra guard, TODO removal
    - apps/api/src/server.ts — registerBootstrapRoutes registered
    - apps/api/package.json — bcrypt and @types/bcrypt added

key-decisions:
  - "bootstrap.ts keeps local login route separate from auth.ts to isolate Entra-coupled code from local auth"
  - "DUMMY_HASH used in local login for timing-safe comparison when username not found — prevents user enumeration"
  - "createAuthService guards MicrosoftEntraAuthProvider construction — server starts cleanly without Entra env vars"
  - "loginLocal generates fresh randomUUID sessionId on every call — enforces session regeneration per security invariant"

patterns-established:
  - "Pattern 1: DB-locked bootstrap guard — always use prisma.user.count as the gate, never a config flag"
  - "Pattern 2: Timing-safe local auth — always run bcrypt.compare even when user is not found"
  - "Pattern 3: Entra optional — check entraConfigured before constructing MicrosoftEntraAuthProvider"
  - "Pattern 4: Session regeneration — loginLocal always uses randomUUID(), never reuses an existing session ID"

requirements-completed: [BOOT-01, BOOT-02, BOOT-03]

# Metrics
duration: 35min
completed: 2026-03-30
---

# Phase 11 Plan 01: First-Run Bootstrap API Summary

**bcrypt-hashed admin bootstrap and timing-safe local login API with Entra guard so server runs without Microsoft credentials**

## Performance

- **Duration:** 35 min
- **Started:** 2026-03-30T00:20:00Z
- **Completed:** 2026-03-30T00:55:00Z
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- Server starts without any Entra environment variables configured — `createAuthService` guards `MicrosoftEntraAuthProvider` construction and returns 503 on `beginLogin` when Entra is absent
- `loginLocal(reply, userId)` added to `AgentSmithAuthService` interface and both implementations (standard and dev-bypass) — sets session cookie with a fresh `randomUUID()` on every call
- `GET /api/bootstrap-status` returns `{ bootstrapRequired: true|false }` based on DB admin count — zero config flags
- `POST /api/bootstrap` creates admin with bcrypt work factor 12, returns 409 if admin already exists (DB-locked, not config-locked)
- `POST /api/auth/local/login` uses timing-safe `bcrypt.compare` with `DUMMY_HASH` fallback when user not found — prevents user enumeration
- All 12 new tests pass; full suite (87 API + 16 Playwright) stays green

## Task Commits

Each task was committed atomically:

1. **Task 1: Install bcrypt and add loginLocal to auth service + Entra guard** - `299ed38` (feat)
2. **Task 2: Create bootstrap routes, local login route, register in server, and write tests** - `7368d45` (feat)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks have test-write commit combined with implementation commit due to tight coupling._

## Files Created/Modified

- `apps/api/src/plugins/auth.ts` — Added `loginLocal` to interface and two implementations; added `entraConfigured` guard; fixed `completeCallback` to guard `ENTRA_REDIRECT_URI`; removed TODO Phase 11 comments
- `apps/api/src/plugins/auth.test.ts` — 3 tests: createAuthService no-Entra, loginLocal cookie, beginLogin 503
- `apps/api/src/routes/bootstrap.ts` — `registerBootstrapRoutes` with status, create, and local login endpoints
- `apps/api/src/routes/bootstrap.test.ts` — 9 tests covering all bootstrap + login behaviors
- `apps/api/src/server.ts` — Import and register `registerBootstrapRoutes`
- `apps/api/package.json` — Added `bcrypt@6` and `@types/bcrypt@6`

## Decisions Made

- Kept local login route in `bootstrap.ts` rather than `auth.ts` to isolate Entra-coupled code — `auth.ts` remains Entra-only, `bootstrap.ts` owns local auth
- Used `DUMMY_HASH` constant for timing-safe fallback — prevents username enumeration via response timing differences
- Guarded `MicrosoftEntraAuthProvider` construction with `entraConfigured` boolean — avoids crash when Entra env vars are absent
- `loginLocal` always regenerates session ID with `randomUUID()` — matches CLAUDE.md security invariant

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built @agentsmith/shared package to resolve test ERR_MODULE_NOT_FOUND**
- **Found during:** Task 2 verification
- **Issue:** Worktree's shared package had no `dist/` directory — all route tests failing with `Cannot find module '@agentsmith/shared/dist/env.js'`
- **Fix:** Ran `npx pnpm install` then `npx pnpm --filter @agentsmith/shared build`; also ran `prisma generate` to regenerate Prisma client for `Prisma` named export
- **Files modified:** No source files modified — build artifacts only
- **Verification:** 87 API tests pass after regeneration
- **Committed in:** Not committed (generated artifacts)

---

**Total deviations:** 1 auto-fixed (blocking build artifact issue)
**Impact on plan:** Required to run tests at all. No scope creep, no source file changes.

## Issues Encountered

- Worktree was initialized from `f1b8cfa` (pre-v1.2 state) — had to `git merge main` to bring in Phase 10 schema and Phase 11 plan files before execution could begin
- `@agentsmith/shared` and Prisma client needed rebuilding in the worktree for tests to resolve imports correctly

## User Setup Required

None - no external service configuration required. Bootstrap is an in-app workflow.

## Known Stubs

None — all endpoints are fully implemented and tested. No hardcoded empty values or placeholder returns.

## Next Phase Readiness

- `POST /api/bootstrap`, `GET /api/bootstrap-status`, and `POST /api/auth/local/login` are ready for Plan 11-02 (frontend bootstrap UI and `LocalAuthProvider`)
- `loginLocal` interface method is available for `LocalAuthProvider` to call during the login flow
- Entra ID guard ensures server can start in bootstrap mode without any Microsoft configuration

---
*Phase: 11-first-run-bootstrap*
*Completed: 2026-03-30*
