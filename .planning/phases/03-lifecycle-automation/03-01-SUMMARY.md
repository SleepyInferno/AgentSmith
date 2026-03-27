---
phase: 03-lifecycle-automation
plan: 01
subsystem: api
tags: [prisma, lifecycle, workflow, tsx, testing]
requires:
  - phase: 02-asset-health-dashboard
    provides: queue-first API patterns, source-run node:test execution, route-layer DTO discipline
provides:
  - lifecycle run, group, and step persistence models
  - reusable onboarding and offboarding template definitions
  - immutable lifecycle snapshot, validation, and summary helper functions
affects: [03-02-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md, lifecycle-routes, lifecycle-ui]
tech-stack:
  added: [tsx]
  patterns: [template-to-run snapshotting, server-owned lifecycle summaries, required exception reasons]
key-files:
  created:
    - apps/api/src/modules/lifecycle/lifecycle.types.ts
    - apps/api/src/modules/lifecycle/lifecycle.templates.ts
    - apps/api/src/modules/lifecycle/lifecycle.service.ts
    - apps/api/src/modules/lifecycle/lifecycle.service.test.ts
    - apps/api/src/modules/lifecycle/lifecycle-summary.test.ts
  modified:
    - prisma/schema.prisma
    - package.json
    - pnpm-lock.yaml
key-decisions:
  - "Kept onboarding and offboarding as code-seeded grouped templates so later routes and UI can launch immutable snapshots without template admin scope."
  - "Derived unresolved follow-up strictly from persisted run-step state, with blocked and skipped steps always treated as unresolved items."
  - "Declared tsx at the workspace root because the plan's required verification command runs from the repo root."
patterns-established:
  - "Lifecycle snapshots copy ordered group and step definitions into run-ready records with pending default state."
  - "Step updates normalize optional evidence fields and require explicit reasons for skipped and blocked outcomes."
requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]
duration: 5min
completed: 2026-03-26
---

# Phase 3 Plan 1: Lifecycle Engine Contracts Summary

**Grouped onboarding and offboarding templates backed by Prisma lifecycle run models and tested snapshot, validation, and unresolved follow-up helpers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T18:17:47Z
- **Completed:** 2026-03-26T18:22:30Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added Prisma lifecycle persistence for runs, groups, and steps with explicit status enums and `updatedAt` tracking.
- Seeded reusable `employee-onboarding` and `employee-offboarding` grouped templates with the required coverage for joiner and leaver workflows.
- Implemented and tested immutable snapshot building, skipped or blocked reason validation, and unresolved follow-up summary aggregation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lifecycle run persistence, statuses, and template contracts** - `5e53570` (feat)
2. **Task 2: Implement snapshot launch, reason validation, and unresolved summary helpers** - `e1f8f6e` (test, RED)
3. **Task 2: Implement snapshot launch, reason validation, and unresolved summary helpers** - `fb314b7` (feat, GREEN)

## Files Created/Modified
- `prisma/schema.prisma` - lifecycle enums plus run, group, and step persistence models
- `apps/api/src/modules/lifecycle/lifecycle.types.ts` - local lifecycle template, run detail, list row, step update, and summary contracts
- `apps/api/src/modules/lifecycle/lifecycle.templates.ts` - reusable onboarding and offboarding grouped templates
- `apps/api/src/modules/lifecycle/lifecycle.service.ts` - snapshot builder, step-update validation, and summary aggregation helpers
- `apps/api/src/modules/lifecycle/lifecycle.service.test.ts` - snapshot and required-reason coverage
- `apps/api/src/modules/lifecycle/lifecycle-summary.test.ts` - unresolved follow-up summary coverage
- `package.json` - root `tsx` declaration for repo-root verification
- `pnpm-lock.yaml` - lockfile update for the root `tsx` declaration

## Decisions Made
- Seeded the lifecycle templates in code for this phase so the engine contract is stable before any template-management UI exists.
- Treated blocked and skipped steps as unresolved work in summaries, and also surfaced pending `follow-up` steps as unresolved items.
- Kept lifecycle contracts local to the API module, matching the repo’s current pattern of avoiding premature shared-package expansion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Declared `tsx` at the workspace root**
- **Found during:** Task 2 (Implement snapshot launch, reason validation, and unresolved summary helpers)
- **Issue:** The plan's required verification command `node --import tsx --test ...` failed from `F:\\AI\\AgentSmith` because `tsx` was only declared in `apps/api`.
- **Fix:** Added `tsx` to the root `devDependencies` and refreshed the lockfile so repo-root verification resolves correctly.
- **Files modified:** `package.json`, `pnpm-lock.yaml`
- **Verification:** `node --import tsx --test apps/api/src/modules/lifecycle/lifecycle.service.test.ts apps/api/src/modules/lifecycle/lifecycle-summary.test.ts`
- **Committed in:** `fb314b7`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to make the planned verification command runnable from the workspace root. No scope expansion.

## Issues Encountered
- Root-level verification initially failed because `tsx` was not resolvable from the workspace root. The workspace dependency declaration fixed it cleanly without changing the lifecycle design.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Lifecycle routes can now persist and return grouped run data against stable schema and DTO contracts.
- The web phase can consume active-run `updatedAt` and summary contracts without re-deriving lifecycle rules in the client.

## Self-Check: PASSED

- Found `.planning/phases/03-lifecycle-automation/03-01-SUMMARY.md`
- Found commit `5e53570`
- Found commit `e1f8f6e`
- Found commit `fb314b7`

---
*Phase: 03-lifecycle-automation*
*Completed: 2026-03-26*
