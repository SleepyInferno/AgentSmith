---
phase: 05-backup-confidence-dashboard
plan: 04
subsystem: ui
tags: [backup, react, react-query, react-router, detail]
requires:
  - phase: 05-02
    provides: stable backup overview, findings, inventory, and detail APIs
  - phase: 05-03
    provides: queue-first backup overview and inventory routes with detail handoff
provides:
  - explanation-first backup detail route for protected systems
  - client-side detail adapter with policy-window and timeline fields
  - reusable confidence, evidence-timeline, and source-health disclosure components
affects: [phase-05-backup-confidence-dashboard, ui-backup-detail, backup-trust-context]
tech-stack:
  added: []
  patterns:
    - client-side detail adapters enrich stable API contracts without widening the server route surface
    - explanation-first backup review stacks policy window, evidence timeline, and source-health disclosure on one route
key-files:
  created:
    - apps/web/src/routes/backup/BackupDetailPage.tsx
    - apps/web/src/components/backup/BackupEvidenceTimeline.tsx
    - apps/web/src/components/backup/BackupConfidenceBreakdown.tsx
    - apps/web/src/components/backup/BackupSourceHealthCard.tsx
  modified:
    - apps/web/src/lib/backup.ts
    - apps/web/src/router.tsx
key-decisions:
  - "Adapted the existing backup detail API response in the web client so the page could consume explicit policyWindow and timeline fields without widening the backend contract."
  - "Kept the backup detail route strictly navigation-only, limiting top-level actions to returning to overview or inventory."
  - "Merged backup, failure, restore-proof, and operator-attested events into one chronological timeline so trust evidence stays readable."
patterns-established:
  - "Backup detail pages explain coverage, freshness, restore proof, and source health together before showing any next-step copy."
  - "Read-only backup workflows can use client-side parsing of scope summaries to keep policy windows explicit without inventing new write paths."
requirements-completed: [BACK-01, BACK-03]
duration: 11 min
completed: 2026-03-27
---

# Phase 5 Plan 4: Backup Detail Workflow Summary

**Explanation-first backup system detail route with policy-window parsing, evidence timeline, and source-health disclosure**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-27T21:46:00-04:00
- **Completed:** 2026-03-27T21:57:06-04:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a dedicated backup detail route that turns the existing API response into explicit `policyWindow`, `timeline`, and freshness fields for the UI.
- Built an explanation-first detail page with readable sections for confidence breakdown, coverage evidence, restore proof, source health, and policy window.
- Added reusable components that disclose provider freshness, connector freshness, restore-proof provenance, and operator-attested evidence without implying live backup actions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the backup detail route and typed detail fetch contract** - `06ea0f5` (feat)
2. **Task 2: Build the explanation-first backup detail page and trust-context components** - `eb1b4d5` (feat)

## Files Created/Modified

- `apps/web/src/lib/backup.ts` - adapts the raw backup detail response into policy-window, timeline, and freshness data for the page.
- `apps/web/src/router.tsx` - wires `/backup/systems/:systemId` into the app shell and final detail route.
- `apps/web/src/routes/backup/BackupDetailPage.tsx` - renders the explanation-first backup detail workflow and navigation-only actions.
- `apps/web/src/components/backup/BackupConfidenceBreakdown.tsx` - explains why the current confidence state was assigned using policy thresholds and evidence timing.
- `apps/web/src/components/backup/BackupEvidenceTimeline.tsx` - renders backup, failure, restore-proof, and operator-attested events in chronological order.
- `apps/web/src/components/backup/BackupSourceHealthCard.tsx` - discloses provider freshness, connector freshness, evidence source, and read-only posture.

## Decisions Made

- Kept the API contract stable and derived `policyWindow` plus `timeline` in the web client because Phase 5 already had a canonical detail route from `05-02`.
- Limited the detail page actions to `Back to overview` and `Open protected-system inventory` so the route stays within the module's read-only trust boundary.
- Reused the established panel, pill, and explanation-first layout patterns from the network detail route so the new backup flow stays visually aligned with the console.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a temporary router-local detail placeholder to satisfy Task 1 verification**
- **Found during:** Task 1 (Add the backup detail route and typed detail fetch contract)
- **Issue:** Task 1 had to register `BackupDetailPage` and pass a full web build before Task 2 created the real page file.
- **Fix:** Added a temporary `BackupDetailPage` inside `router.tsx` for Task 1 verification, then replaced it with the real route component during Task 2.
- **Files modified:** `apps/web/src/router.tsx`
- **Verification:** `npx pnpm --filter @agentsmith/web build`
- **Committed in:** `06ea0f5`, `eb1b4d5`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The temporary placeholder preserved the task split and verification order without changing the final scope or behavior.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Queue and inventory now hand off into a usable explanation-first detail route with explicit policy windows, restore proof, and source-health context.
- Phase `05-05` can focus on trust-boundary closure and edge-case polish instead of building foundational detail UI.

## Self-Check

PASSED

- Verified `.planning/phases/05-backup-confidence-dashboard/05-04-SUMMARY.md`
- Verified `apps/web/src/lib/backup.ts`
- Verified `apps/web/src/router.tsx`
- Verified `apps/web/src/routes/backup/BackupDetailPage.tsx`
- Verified `apps/web/src/components/backup/BackupConfidenceBreakdown.tsx`
- Verified `apps/web/src/components/backup/BackupEvidenceTimeline.tsx`
- Verified `apps/web/src/components/backup/BackupSourceHealthCard.tsx`
- Verified `npx pnpm --filter @agentsmith/web build`
- Found commit `06ea0f5`
- Found commit `eb1b4d5`

---
*Phase: 05-backup-confidence-dashboard*
*Completed: 2026-03-27*
