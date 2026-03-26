---
phase: 02-asset-health-dashboard
plan: 02
subsystem: api
tags: [fastify, prisma, asset-health, api-routes, filtering, testing]
requires:
  - phase: 02-asset-health-dashboard
    provides: asset-health DTOs, repository queries, and deterministic scoring from plan 01
provides:
  - protected-ready asset queue, inventory, and device detail endpoints
  - server-side inventory filter and sort parsing for dashboard triage
  - route-level contract tests for queue ordering, stale-only inventory, and device detail payloads
affects: [asset-api, asset-dashboard, device-detail, triage-queue]
tech-stack:
  added: [none]
  patterns: [injectable-fastify-route-dependencies, server-owned-filter-parsing, app-owned-asset-response-dtos]
key-files:
  created:
    - apps/api/src/routes/assets.ts
    - apps/api/src/routes/assets.test.ts
  modified:
    - apps/api/src/server.ts
    - apps/api/src/modules/assets/asset-health.repository.ts
    - apps/api/src/modules/assets/asset-health.types.ts
key-decisions:
  - "Kept the public asset API contract in the route layer so HTTP field names can be stable without rewriting the internal asset DTOs from plan 01."
  - "Used repository injection in buildServer so Fastify route tests can verify contracts without a live database or connector dependency."
  - "Implemented inventory sorting and stale-only filtering server-side to preserve one triage definition for both queue and inventory views."
patterns-established:
  - "Asset routes map internal asset rows to explicit HTTP DTOs with deviceId/deviceName and sourceFreshnessState fields."
  - "Fastify route tests use injected repositories plus app.inject instead of mocking connectors or opening network listeners."
requirements-completed: [ASST-01, ASST-02, ASST-03, ASST-04]
duration: 18 min
completed: 2026-03-26
---

# Phase 02 Plan 02: Asset API Summary

**Fastify asset queue, inventory, and detail endpoints with server-side triage filters and injection-tested response contracts**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-26T17:15:00Z
- **Completed:** 2026-03-26T17:33:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added `GET /api/assets/queue`, `GET /api/assets/devices`, and `GET /api/assets/devices/:deviceId` to the API server with dashboard-ready response shapes.
- Implemented exact inventory query parsing for `search`, ownership and site filters, risk filters, `staleOnly`, and the supported sort fields and directions.
- Added Fastify injection tests covering queue ordering, stale-only inventory behavior, and device detail signal/freshness payloads.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add asset API routes to the Fastify server** - `b7ee830` (feat)
2. **Task 2: Implement server-side filter and sort parsing for the inventory endpoint** - `9b8f8bf` (feat)
3. **Task 3: Add route-level tests for queue ordering, filters, and device detail** - `0c5c655` (test)

## Files Created/Modified

- `apps/api/src/routes/assets.ts` - registers queue, inventory, and detail routes, parses inventory query params, and maps HTTP DTOs
- `apps/api/src/routes/assets.test.ts` - verifies queue ordering, `staleOnly=true`, and detail payload fields through Fastify injection
- `apps/api/src/server.ts` - registers asset routes, supports injected dependencies, and avoids auto-starting on import
- `apps/api/src/modules/assets/asset-health.repository.ts` - applies risk-signal filtering, stale-only filtering, and supported inventory sorting
- `apps/api/src/modules/assets/asset-health.types.ts` - adds exact inventory sort and filter types for the API layer

## Decisions Made

- Kept the route contract separate from the internal scoring DTOs so HTTP payload naming can stay stable while domain types evolve.
- Injected the asset repository into `buildServer` for route tests, which keeps verification local and avoids database coupling.
- Left auth guarding optional in the route registration because no Phase 1 session pre-handler exists in the current workspace state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made the API server import-safe for route injection tests**
- **Found during:** Task 1 (Add asset API routes to the Fastify server)
- **Issue:** Importing `buildServer` for route tests would immediately execute `start()` and try to open a listener.
- **Fix:** Guarded startup behind an entrypoint check and added route dependency injection so tests can build the app without runtime side effects.
- **Files modified:** `apps/api/src/server.ts`
- **Verification:** `npm exec pnpm -- --filter @agentsmith/api build`, `npm exec pnpm -- --filter @agentsmith/api test`
- **Committed in:** `b7ee830`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the plan's mandated Fastify injection testing. No scope expansion.

## Issues Encountered

- `pnpm` was not available directly on `PATH`, so verification commands were run via `npm exec pnpm -- ...`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The web dashboard can now consume stable queue, inventory, and detail APIs without re-ranking data client-side.
- Device detail screens already receive explicit signal explanations plus freshness state needed for stale and incomplete-data UX.

## Self-Check: PASSED

- Verified summary file exists at `.planning/phases/02-asset-health-dashboard/02-02-SUMMARY.md`.
- Verified task commits `b7ee830`, `9b8f8bf`, and `0c5c655` exist in git history.
