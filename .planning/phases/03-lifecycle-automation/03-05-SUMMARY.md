---
phase: 03-lifecycle-automation
plan: 05
subsystem: ui
tags: [react, react-query, react-router, lifecycle, navigation]
requires:
  - phase: 03-03
    provides: lifecycle queue launch flow and active-run overview cards
  - phase: 03-04
    provides: lifecycle run detail route, step editor, and close-out summary
provides:
  - post-launch navigation from lifecycle queue into run detail
  - active-run card CTA into the existing lifecycle detail route
  - queue copy aligned to the shipped detail workflow
affects: [phase-03-lifecycle-automation, lifecycle-ui, queue-first-workflows]
tech-stack:
  added: []
  patterns: [post-mutation route handoff after react-query invalidation, review-first lifecycle card navigation]
key-files:
  created: []
  modified:
    - apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx
    - apps/web/src/components/lifecycle/ActiveLifecycleRuns.tsx
key-decisions:
  - "Kept the launch handoff in the existing mutation success path so cache invalidation still completes before navigation."
  - "Placed the active-run detail link next to unresolved follow-up review context to preserve the audit-first lifecycle workflow."
patterns-established:
  - "Lifecycle queue launches now hand operators directly into the existing detail route instead of stopping at the list refresh."
  - "Queue-side lifecycle cards expose detail navigation as a visible text CTA rather than a destructive-looking action."
requirements-completed: [LIFE-01, LIFE-02, LIFE-03, LIFE-04]
duration: 2min
completed: 2026-03-26
---

# Phase 3 Plan 5: Queue-to-Detail Lifecycle Handoff

**Lifecycle queue launches and active-run cards now route straight into the existing run detail workflow for step updates and close-out review**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T22:20:12Z
- **Completed:** 2026-03-26T22:22:11Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added direct navigation to `/lifecycle/runs/:runId` after a successful lifecycle launch from the queue.
- Added a visible `Open run details` CTA to every active lifecycle run card.
- Removed stale queue copy that implied lifecycle detail routing had not shipped yet.

## Task Commits

Each task was committed atomically:

1. **Task 1: Navigate directly into run detail after lifecycle launch** - `97462ce` (fix)
2. **Task 2: Add a visible queue-side CTA from active-run cards into run detail** - `de6c088` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx` - imports `useNavigate`, invalidates lifecycle queries, and routes newly created runs into the detail page.
- `apps/web/src/components/lifecycle/ActiveLifecycleRuns.tsx` - imports `Link` and exposes `Open run details` beside unresolved follow-up review context on each card.

## Decisions Made

- Kept the queue launch mutation server-owned by preserving all existing invalidations before the route handoff.
- Used a plain routed CTA on active cards instead of a button treatment so the queue remains review-first and tracking-only.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `rg.exe` was not executable in this shell session, so stub scanning and text searches fell back to PowerShell `Select-String`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 now has an uninterrupted queue-first lifecycle path from launch through run detail, step updates, and close-out summary review.
- Phase 4 can treat lifecycle automation as a completed guided workflow slice without adding manual route bridging.

## Self-Check

PASSED

- Found `.planning/phases/03-lifecycle-automation/03-05-SUMMARY.md`
- Found commit `97462ce`
- Found commit `de6c088`

---
*Phase: 03-lifecycle-automation*
*Completed: 2026-03-26*
