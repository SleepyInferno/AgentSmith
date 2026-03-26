---
phase: 03-lifecycle-automation
plan: 03
subsystem: ui
tags: [react, react-query, react-router, lifecycle, queue]
requires:
  - phase: 03-02
    provides: lifecycle API routes, run summaries, and tracking-only lifecycle mutations
  - phase: 02-03
    provides: app shell routing, queue-first page structure, and React Query web patterns
provides:
  - lifecycle web fetch and mutation helpers
  - lifecycle queue route in the shared app shell
  - template launch cards for onboarding and offboarding
  - active-run cards with grouped progress and unresolved follow-up visibility
affects: [phase-03-plan-04, lifecycle-ui, operator-workflows]
tech-stack:
  added: []
  patterns: [local web DTO helpers, React Query invalidation after lifecycle launch, queue-first lifecycle landing page]
key-files:
  created:
    - apps/web/src/lib/lifecycle.ts
    - apps/web/src/components/lifecycle/LifecycleTemplateCards.tsx
    - apps/web/src/components/lifecycle/ActiveLifecycleRuns.tsx
  modified:
    - apps/web/src/router.tsx
    - apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx
key-decisions:
  - "Kept lifecycle DTOs local to the web package to match the Phase 2 contract pattern and avoid expanding shared package scope mid-phase."
  - "Satisfied the API's current requestedBy requirement with a fixed operator label so the UI still only asks for subject name and email."
  - "Loaded run summaries per active run so grouped progress and unresolved follow-up stay server-derived instead of being recomputed in the browser."
patterns-established:
  - "Lifecycle web data uses the same thin fetch-helper plus React Query pattern as asset health."
  - "Queue-first lifecycle pages surface launch actions and unresolved work before deep-detail navigation exists."
requirements-completed: [LIFE-01, LIFE-02]
duration: 5 min
completed: 2026-03-26
---

# Phase 03 Plan 03: Lifecycle Queue Summary

**Lifecycle launch cards and active-run queue wired into the app shell with tracking-only copy and server-derived follow-up visibility**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-26T22:32:00Z
- **Completed:** 2026-03-26T22:36:54Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added lifecycle web contracts and mutations that mirror the existing asset fetch-helper pattern.
- Registered a `/lifecycle` entry point in the shared shell and updated the primary navigation so lifecycle sits beside asset queue workflows.
- Built a queue-first lifecycle landing page with onboarding/offboarding launch cards, grouped active-run progress, and unresolved follow-up visibility.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add lifecycle web contracts and route entry points** - `6876a4e` (feat)
2. **Task 2: Build the lifecycle landing page with template launch and active-run cards** - `2fe9903` (feat)

## Files Created/Modified
- `apps/web/src/lib/lifecycle.ts` - Local lifecycle DTOs plus fetch and mutation helpers for templates, runs, summaries, and step updates.
- `apps/web/src/router.tsx` - Shared shell copy, primary navigation, and `/lifecycle` route registration.
- `apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx` - Queue-first lifecycle landing page with launch and active-run sections.
- `apps/web/src/components/lifecycle/LifecycleTemplateCards.tsx` - Template launch cards for `employee-onboarding` and `employee-offboarding`.
- `apps/web/src/components/lifecycle/ActiveLifecycleRuns.tsx` - Read-only active-run cards with grouped progress counts, `updatedAt`, and unresolved follow-up rendering.

## Decisions Made
- Kept lifecycle DTOs local to the web package so the UI could ship without reopening shared-package export work.
- Preserved the plan's minimum-input UX by sending a fixed operator label for `requestedBy` instead of asking for more launch fields.
- Used per-run summary queries for grouped progress so unresolved counts remain API-derived and consistent with later detail/summary views.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a minimal lifecycle page stub during Task 1**
- **Found during:** Task 1 (Add lifecycle web contracts and route entry points)
- **Issue:** The new router entry could not build without a concrete `LifecycleQueuePage` export, but the full page implementation belonged to Task 2.
- **Fix:** Added a minimal tracking-only page stub, then replaced it with the full queue UI in Task 2.
- **Files modified:** `apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx`
- **Verification:** `npx pnpm --filter @agentsmith/web build`
- **Committed in:** `6876a4e`

**2. [Rule 1 - Bug] Fixed `useQueries` typing fallback in active-run cards**
- **Found during:** Task 2 (Build the lifecycle landing page with template launch and active-run cards)
- **Issue:** TypeScript treated `summaryQueries[index]` as possibly undefined, which blocked the web build.
- **Fix:** Added a typed fallback object before reading query state and summary data.
- **Files modified:** `apps/web/src/components/lifecycle/ActiveLifecycleRuns.tsx`
- **Verification:** `npx pnpm --filter @agentsmith/web build`
- **Committed in:** `2fe9903`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were required to complete the planned UI slice cleanly. No scope creep.

## Issues Encountered
- The lifecycle API currently requires `requestedBy` on run launch, so the UI had to provide a fixed operator label to keep the launch form aligned with the plan's minimum input fields.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 04 can now wire the lifecycle run detail route onto an existing queue page and reuse the same lifecycle helper/query keys.
- The landing page already exposes server-derived summary state, so detail and close-out flows can share the same summary query contract.

## Self-Check: PASSED
- Found `.planning/phases/03-lifecycle-automation/03-03-SUMMARY.md`
- Found commit `6876a4e`
- Found commit `2fe9903`

---
*Phase: 03-lifecycle-automation*
*Completed: 2026-03-26*
