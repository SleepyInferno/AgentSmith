---
phase: 03-lifecycle-automation
plan: 04
subsystem: ui
tags: [react, react-query, react-router, lifecycle, audit]
requires:
  - phase: 03-03
    provides: lifecycle queue route, lifecycle query helpers, and active-run overview cards
provides:
  - lifecycle run detail route and grouped step review UI
  - per-step status, exception reason, and structured evidence capture
  - close-run summary panel with separate unresolved follow-up section
affects: [phase-03-lifecycle-automation, lifecycle-ui, audit-review]
tech-stack:
  added: []
  patterns: [react-query invalidation for lifecycle mutations, grouped lifecycle detail rendering, server-derived closeout summary display]
key-files:
  created:
    - apps/web/src/components/lifecycle/LifecycleRunGroupList.tsx
    - apps/web/src/components/lifecycle/LifecycleStepEditor.tsx
    - apps/web/src/components/lifecycle/LifecycleSummaryPanel.tsx
    - apps/web/src/routes/lifecycle/LifecycleRunDetailPage.tsx
  modified:
    - apps/web/src/lib/lifecycle.ts
    - apps/web/src/router.tsx
key-decisions:
  - "Kept lifecycle detail state server-owned by invalidating run, list, and summary queries after each step mutation and on close-out."
  - "Rendered unresolved follow-up as its own close-out section so remaining manual work stays visible after closure."
  - "Corrected the web lifecycle status union to use the API's completed state so the close-out UI follows the actual server contract."
patterns-established:
  - "Lifecycle detail pages use grouped section cards with per-step editors instead of a flat checklist."
  - "Close-out UX remains audit-first: the operator records review results and the summary reflects persisted server state."
requirements-completed: [LIFE-03, LIFE-04]
duration: 6min
completed: 2026-03-26
---

# Phase 3 Plan 4: Lifecycle Run Detail and Close-Out Summary

**Grouped lifecycle run detail with per-step evidence capture and a server-derived close-out summary that isolates unresolved follow-up work**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-26T22:39:00Z
- **Completed:** 2026-03-26T22:45:12Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a routed lifecycle run detail page inside the existing app shell with grouped workflow sections for onboarding and offboarding runs.
- Shipped per-step editors for `automated`, `manual`, `skipped`, and `blocked` states with required `statusReason` handling and structured evidence fields.
- Added close-run UX that loads the server summary and highlights `Unresolved follow-up` separately from grouped totals.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build grouped run detail and per-step evidence capture** - `c2a323a` (feat)
2. **Task 2: Add close-run summary and unresolved follow-up UX** - `6e8efe5` (feat)

**Plan metadata:** pending

## Files Created/Modified

- `apps/web/src/lib/lifecycle.ts` - corrected lifecycle status typing to match the API close-out contract.
- `apps/web/src/router.tsx` - registered `path: "lifecycle/runs/:runId"` in the existing shell.
- `apps/web/src/routes/lifecycle/LifecycleRunDetailPage.tsx` - loads a run, renders grouped review state, closes runs, and keeps the summary visible after closure.
- `apps/web/src/components/lifecycle/LifecycleRunGroupList.tsx` - orders and renders lifecycle groups like `identity`, `group`, `checklist`, and `follow-up` with per-group progress chips.
- `apps/web/src/components/lifecycle/LifecycleStepEditor.tsx` - captures step status, required exception reasons, notes, and `ticketId` / `assetId` / `mailboxRef` / `handoffRef`.
- `apps/web/src/components/lifecycle/LifecycleSummaryPanel.tsx` - renders summary totals plus a separate unresolved manual-work queue.

## Decisions Made

- Kept the detail page tracking-only by framing every save and close action as recorded review work rather than live admin execution.
- Used React Query invalidation against `["lifecycle-run", runId]`, `["lifecycle-runs"]`, and `["lifecycle-run-summary", runId]` for both step updates and close-out.
- Preserved server ownership of summary truth by fetching `getLifecycleRunSummary(runId)` instead of reconstructing unresolved work client-side.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected lifecycle close-out status typing**
- **Found during:** Task 1 (Build grouped run detail and per-step evidence capture)
- **Issue:** The web lifecycle contract used `closed` while the API returns `completed`, which would cause close-out UI logic to branch on the wrong terminal state.
- **Fix:** Updated `LifecycleRunStatus` in `apps/web/src/lib/lifecycle.ts` to use `completed`, then built the detail and summary flow against that server contract.
- **Files modified:** `apps/web/src/lib/lifecycle.ts`
- **Verification:** `npx pnpm --filter @agentsmith/web build`
- **Committed in:** `c2a323a`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Required for correctness. No scope expansion.

## Issues Encountered

- PowerShell rejected `&&` in the commit command sequence, so staging and committing were rerun with PowerShell statement separators.
- `rg.exe` was not executable in this shell session, so repository text searches fell back to PowerShell `Select-String`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 lifecycle automation is now complete at the UI layer: queue, detail, evidence capture, and close-out summary flows all exist.
- The next phase can treat lifecycle runs as a finished, audit-oriented workflow slice without reopening Phase 3 route or query architecture.

## Self-Check

PASSED

- Found `.planning/phases/03-lifecycle-automation/03-04-SUMMARY.md`
- Found commit `c2a323a`
- Found commit `6e8efe5`

---
*Phase: 03-lifecycle-automation*
*Completed: 2026-03-26*
