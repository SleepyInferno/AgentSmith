---
phase: 05-backup-confidence-dashboard
plan: 02
subsystem: backend
tags: [backup, api, repository, fastify, tests]
requires:
  - 05-01
provides:
  - server-owned backup overview, findings, inventory, and detail read models
  - Fastify backup routes with seeded-example disclosure and read-only trust metadata
  - test coverage for confidence ranking, filter parsing, seeded fallback, and detail 404 behavior
affects: [phase-05-backup-confidence-dashboard, api-backup-module, read-only-recoverability-workflows]
tech-stack:
  added: []
  patterns:
    - server-owned backup confidence and next-step derivation
    - seeded-example fallback for empty or missing backup tables
    - route-level read-only trust-boundary mapping for backup workflows
key-files:
  created:
    - apps/api/src/modules/backup/backup.findings.ts
    - apps/api/src/modules/backup/backup.repository.ts
    - apps/api/src/routes/backup.ts
    - apps/api/src/routes/backup.test.ts
  modified:
    - apps/api/src/modules/backup/backup.types.ts
    - apps/api/src/server.ts
key-decisions:
  - "Kept backup confidence, queue ranking, and suggested-next-step logic on the server so the UI consumes one canonical truth."
  - "Used seeded-example fallback when backup tables are empty or unavailable instead of pretending live telemetry exists."
  - "Flattened the backup HTTP contract with explicit sourceHealth and isReadOnly fields so later web screens can stay explanation-first."
patterns-established:
  - "Backup routes return read-only trust metadata alongside the main payload instead of hiding the write boundary in UI copy alone."
  - "System-level backup detail is built from the worst relevant coverage and restore-proof state, not only the newest restore event."
requirements-completed: [BACK-01, BACK-02, BACK-03]
duration: 24 min
completed: 2026-03-27
---

# Phase 5 Plan 2: Backup API Summary

**Server-owned backup confidence repository and route contracts for overview, queue, inventory, and detail workflows**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-27T21:02:27-04:00
- **Completed:** 2026-03-27T21:26:24-04:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added one shared backup findings helper layer and one repository that derive confidence, queue priority, source-health disclosure, seeded fallback, and explanation-first detail data from the Phase 5 model.
- Exposed `/api/backup/overview`, `/api/backup/findings`, `/api/backup/systems`, and `/api/backup/systems/:systemId` through the shared `buildServer` pattern with route-level read-only metadata.
- Covered the repository and route contracts with targeted tests for missing coverage, stale restore proof, unknown telemetry, seeded fallback, filter parsing, and detail 404 handling.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement server-owned backup confidence, queue ranking, and repository read models**
   - `68cfb4f` (test) - added failing backup confidence tests
   - `25df638` (feat) - implemented the backup findings and repository layer
2. **Task 2: Expose backup overview, findings, inventory, and detail routes through the shared server pattern**
   - `6e6b783` (feat) - added backup routes, route tests, and server wiring

## Files Created/Modified

- `apps/api/src/modules/backup/backup.findings.ts` - derives queue ranking, overview cards, and suggested next steps from one assessment row shape.
- `apps/api/src/modules/backup/backup.repository.ts` - loads live or seeded backup data, computes honest confidence states, and serves overview, findings, inventory, and detail read models.
- `apps/api/src/modules/backup/backup.types.ts` - expands the canonical backup DTOs with the fields the repository and route layer need for inventory and detail workflows.
- `apps/api/src/routes/backup.ts` - exposes the backup module through stable Fastify routes with explicit `sourceHealth` and `isReadOnly` response fields.
- `apps/api/src/routes/backup.test.ts` - verifies seeded fallback, unknown telemetry disclosure, filter parsing, and detail 404 behavior.
- `apps/api/src/server.ts` - registers the backup route module through the existing dependency-injection server builder.

## Decisions Made

- Treated restore-proof freshness as the worst relevant state across a system's evidence set, which prevents partial workload coverage from looking falsely healthy.
- Added a route-level `state` alias on `sourceHealth` responses so later UI work can consume provider freshness without route-specific inference.
- Kept the Phase 5 route surface explicitly read-only by returning trust metadata instead of any mutation affordances.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Completed the missing repository helper layer after an interrupted executor left the implementation partial**
- **Found during:** Task 1 (Implement server-owned backup confidence, queue ranking, and repository read models)
- **Issue:** The first executor only landed the RED test commit and a partial repository file, leaving helper functions, restore-proof aggregation, and route work incomplete.
- **Fix:** Finished the helper layer locally, corrected restore-proof evaluation to use the worst relevant evidence state, and then completed the route contract work against the recovered code.
- **Files modified:** `apps/api/src/modules/backup/backup.repository.ts`, `apps/api/src/routes/backup.ts`
- **Verification:** `node --import tsx --test apps/api/src/modules/backup/backup.repository.test.ts apps/api/src/modules/backup/backup.findings.test.ts apps/api/src/routes/backup.test.ts`
- **Committed in:** `25df638`, `6e6b783`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The recovery preserved the planned API scope and test strategy while repairing an interrupted execution path.

## Issues Encountered

- `npx pnpm --filter @agentsmith/api typecheck` still reports pre-existing lifecycle typing failures outside the backup module. Those were already present before this plan's route work and were left out of scope for `05-02`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The frontend can now consume one stable backup contract for overview, findings, inventory, and detail screens.
- Backup responses already expose seeded-example disclosure, source-health context, and the read-only boundary the Phase 5 UI plans depend on.

## Self-Check

PASSED

- Verified `apps/api/src/modules/backup/backup.findings.ts`
- Verified `apps/api/src/modules/backup/backup.repository.ts`
- Verified `apps/api/src/routes/backup.ts`
- Verified `apps/api/src/routes/backup.test.ts`
- Verified `node --import tsx --test apps/api/src/modules/backup/backup.repository.test.ts apps/api/src/modules/backup/backup.findings.test.ts apps/api/src/routes/backup.test.ts`
- Found commit `68cfb4f`
- Found commit `25df638`
- Found commit `6e6b783`

---
*Phase: 05-backup-confidence-dashboard*
*Completed: 2026-03-27*
