---
phase: 12-integrations-settings-ui
plan: 01
subsystem: api
tags: [fastify, prisma, aes-256-gcm, credential-storage, azure-identity, openai, integration-routes]

requires:
  - phase: 10-schema-and-credential-foundation
    provides: IntegrationCredential table, credential-crypto.ts, system-key.ts
  - phase: 11-first-run-bootstrap
    provides: bootstrap.ts pattern for Fastify route registration with injectable dependencies

provides:
  - GET /api/integrations/:key — returns configured status without secrets
  - PUT /api/integrations/:key — saves/updates encrypted credentials with blank-secret preservation
  - POST /api/integrations/:key/test — runs test-connection probe and persists lastTestedAt + lastTestResult
  - lastTestedAt and lastTestResult columns on IntegrationCredential via migration 0004
  - Injectable probe functions (testIntuneConnection, testOpenAIConnection) for clean unit testing
  - ensureSystemKey wired into server.ts start() with systemKey injection for tests
  - 14 unit tests covering CRED-01 through CRED-04, auth guard, and invalid key

affects:
  - 12-02 (web UI will call these routes)
  - 12-03 (health badge reads lastTestedAt and lastTestResult)
  - 13-intune-device-sync (uses stored Intune credentials)
  - 14-document-ingest-pipeline (uses stored OpenAI credentials)

tech-stack:
  added:
    - "@azure/identity — ClientSecretCredential for Intune test-connection probe"
    - "openai — OpenAI SDK for OpenAI test-connection probe"
  patterns:
    - "Injectable probe dependencies: testIntuneConnection and testOpenAIConnection on IntegrationRoutesDependencies allow unit tests to mock external calls"
    - "Blank-secret preservation: PUT merges body fields; empty/blank secret strings retain existing stored secret"
    - "Three-field encryption: upsert only writes encryptedValue/iv/authTag — never touches lastTestedAt/lastTestResult"
    - "systemKey injection: BuildServerOptions accepts systemKey?: Buffer; tests use Buffer.alloc(32); start() calls ensureSystemKey async"

key-files:
  created:
    - "apps/api/src/routes/integrations.ts — GET/PUT/POST test handlers for intune and openai"
    - "apps/api/src/routes/integrations.test.ts — 14 unit tests for CRED-01 through CRED-04"
    - "prisma/migrations/20260330_0004_integration_credential_test_fields/migration.sql — lastTestedAt + lastTestResult columns"
  modified:
    - "prisma/schema.prisma — IntegrationCredential model updated with lastTestedAt and lastTestResult fields"
    - "apps/api/src/server.ts — systemKey added to BuildServerOptions, registerIntegrationRoutes registered, start() calls ensureSystemKey"
    - "apps/api/package.json — @azure/identity and openai added"

key-decisions:
  - "Injectable probes (testIntuneConnection, testOpenAIConnection) on IntegrationRoutesDependencies rather than module-level mocking — consistent with project narrow-dependency pattern from bootstrap.ts"
  - "systemKey defaults to Buffer.alloc(32) in buildServer when not provided — zero-overhead for tests, production always provides real key via start()"
  - "Blank-secret preservation: empty string on clientSecret/apiKey in PUT body preserves existing stored secret — prevents accidental credential loss on partial updates"
  - "PUT upsert clause omits lastTestedAt/lastTestResult — credential writes must not reset health state"

patterns-established:
  - "Integration route dependency type: IntegrationRoutesDependencies with prisma, authService, systemKey, and optional probe overrides"
  - "Secret masking: GET response for intune returns tenantId + clientId + configured flag; clientSecret never included"
  - "Test-connection result storage: lastTestResult = 'pass' on ok:true, error message string on ok:false"

requirements-completed: [CRED-01, CRED-02, CRED-03, CRED-04]

duration: 10min
completed: 2026-03-30
---

# Phase 12 Plan 01: Integrations Settings UI — API Layer Summary

**Fastify integration credential API with AES-256-GCM storage, blank-secret preservation, test-connection probes, and health persistence via injectable @azure/identity and openai adapters**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-30T10:07:38Z
- **Completed:** 2026-03-30T10:17:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Three Fastify routes registered at `/api/integrations/:key` — GET (status, no secrets), PUT (save with encryption), POST test (test-connection with health persistence)
- Schema migration adds `lastTestedAt` and `lastTestResult` to `IntegrationCredential`; `prisma generate` run successfully
- `ensureSystemKey` wired into production `start()` with injectable `systemKey?: Buffer` for tests; `buildServer` remains synchronous
- 14 unit tests covering all CRED-01 through CRED-04 behaviors, auth guard (401), and invalid key (404), all passing alongside existing 87-test suite (101 total)
- `@azure/identity` and `openai` packages installed; test-connection probes are injectable dependencies to avoid external network calls in tests

## Task Commits

1. **Task 1: Schema migration + ensureSystemKey startup wiring + integration routes** - `ded2b06` (feat)
2. **Task 2: Integration route unit tests** - `d2a124a` (test)

**Plan metadata:** (this commit)

## Files Created/Modified

- `prisma/schema.prisma` — `lastTestedAt DateTime?` and `lastTestResult String?` added to `IntegrationCredential`
- `prisma/migrations/20260330_0004_integration_credential_test_fields/migration.sql` — `ALTER TABLE "IntegrationCredential"` adds both columns
- `apps/api/src/routes/integrations.ts` — `registerIntegrationRoutes` with GET/PUT/POST test, injectable probes, secret masking
- `apps/api/src/routes/integrations.test.ts` — 14 tests (CRED-01–04, auth guard, invalid key)
- `apps/api/src/server.ts` — `systemKey` in `BuildServerOptions`, `registerIntegrationRoutes` registered, `start()` calls `ensureSystemKey`
- `apps/api/package.json` — `@azure/identity` and `openai` added to dependencies
- `pnpm-lock.yaml` — lockfile updated

## Decisions Made

- **Injectable probes over module mocking**: `testIntuneConnection` and `testOpenAIConnection` are optional fields on `IntegrationRoutesDependencies`, defaulting to real implementations. Consistent with the `bootstrap.ts` narrow-dependency injection pattern; no mock framework needed.
- **systemKey defaults to Buffer.alloc(32)**: Zero overhead for tests that don't call integration routes; production always resolves a real key in `start()` before `app.listen()`.
- **Blank-secret preservation**: PUT merges body fields; if `clientSecret` or `apiKey` is empty/blank, the existing stored value is preserved. Prevents accidental credential loss on partial form saves.
- **PUT upsert never writes lastTestedAt/lastTestResult**: The `update` clause sets only `encryptedValue`, `iv`, `authTag`, and `updatedAt` — health state is not reset by credential saves.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged main into worktree before Task 1**
- **Found during:** Pre-task setup
- **Issue:** Worktree branch `worktree-agent-ae36c837` was at `f1b8cfa` (v1.1 milestone close), missing all Phase 10/11 code (credential-crypto.ts, system-key.ts, bootstrap.ts, IntegrationCredential schema). Plan requires these as prerequisites.
- **Fix:** `git merge main` to bring the worktree to `10f7b9f` (Phase 12 plan files committed); stash/pop applied cleanly for the newly installed packages.
- **Files modified:** 60 files (Phase 10/11 additions from main branch merge)
- **Verification:** All 87 pre-existing tests passed after merge
- **Committed in:** merge commit (fast-forward, no new commit needed)

**2. [Rule 3 - Blocking] Built @agentsmith/shared dist before running tests**
- **Found during:** Task 1 verification (first test run)
- **Issue:** `@agentsmith/shared/dist/env.js` not found — shared package hadn't been built in the worktree's node_modules
- **Fix:** `npx pnpm install && npx pnpm --filter @agentsmith/shared build`
- **Files modified:** packages/shared/dist/ (generated, not committed)
- **Verification:** All 87 tests passed after build

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were environment setup prerequisites. No scope creep, no plan content changed.

## Issues Encountered

None beyond the two blocking environment issues documented above.

## User Setup Required

None — no external service configuration required for this plan. API routes exist and encrypt/decrypt correctly with the system key. Actual Intune/OpenAI credentials are entered via the UI built in Plan 02.

## Next Phase Readiness

- All three integration routes are registered and tested: `GET /api/integrations/:key`, `PUT /api/integrations/:key`, `POST /api/integrations/:key/test`
- Secrets never reach GET responses — ready for Plan 02 web UI
- `lastTestedAt` and `lastTestResult` persist — ready for Plan 03 health badge display
- `@azure/identity` and `openai` are installed — Plan 13/14 can import these packages

---
*Phase: 12-integrations-settings-ui*
*Completed: 2026-03-30*
