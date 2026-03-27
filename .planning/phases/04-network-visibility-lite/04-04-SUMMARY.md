---
phase: 04-network-visibility-lite
plan: 04
subsystem: web
tags: [react, network, topology, detail, svg]
requires:
  - phase: 04-03
    provides: queue-first network overview, inventory routing, and typed web fetchers
provides:
  - dedicated network mapper route with explicit confidence legend
  - explanation-first network detail route with direct triage handoff
  - map and detail continuity for seeded-example disclosure and trust semantics
affects: [phase-04-network-visibility-lite, web-network-mapper, network-detail-flow]
tech-stack:
  added: []
  patterns: [lightweight SVG topology rendering, explanation-first detail panels, route-based triage handoff]
key-files:
  created:
    - apps/web/src/routes/network/NetworkMapPage.tsx
    - apps/web/src/routes/network/NetworkDetailPage.tsx
    - apps/web/src/components/network/NetworkMapCanvas.tsx
    - apps/web/src/components/network/NetworkRelationshipLegend.tsx
  modified:
    - apps/web/src/router.tsx
    - apps/web/src/routes/network/NetworkOverviewPage.tsx
    - apps/web/src/components/network/NetworkInventoryTable.tsx
    - apps/web/src/components/network/NetworkFindingsQueue.tsx
key-decisions:
  - "Used a lightweight static mapper with explicit confirmed versus inferred visuals instead of implying real-time network automation."
  - "Kept the network detail page explanation-first so scope, freshness, confidence, and next action are readable before deeper inspection."
patterns-established:
  - "Network queue and inventory rows now route directly into `/network/resources/:resourceId` for explanation-first drill-in."
  - "Seeded-example disclosure persists across overview, map, and detail routes so sample topology never looks live."
requirements-completed: [NET-01, NET-02, NET-03]
duration: 6 min
completed: 2026-03-27
---

# Phase 4 Plan 4: Network Mapper and Detail Workflow

**Phase 4 now includes a trustworthy network mapper and explanation-first detail workflow that carry triage directly into context and next action**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T16:36:16Z
- **Completed:** 2026-03-27T16:42:13Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added a dedicated `/network/map` route with a lightweight topology view, relationship confidence legend, and freshness watch panel.
- Built a routeable network detail page that explains scope, freshness, confidence posture, related infrastructure, and suggested next step.
- Linked the existing queue and inventory experiences directly into the detail route so operators can move from triage into explanation without hunting.
- Carried the seeded-example disclosure through the map and detail flows so the UI keeps being honest about trust boundaries.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the dedicated network map route with a clear confidence legend** - `1793d03` (feat)
2. **Task 2: Build the explanation-first network detail page and triage handoff links** - `7fa400b` (feat)

## Files Created/Modified

- `apps/web/src/router.tsx` - registers `/network/map` and `/network/resources/:resourceId` in the shared shell.
- `apps/web/src/routes/network/NetworkMapPage.tsx` - renders the dedicated mapper route with relationship and freshness context.
- `apps/web/src/components/network/NetworkMapCanvas.tsx` - renders the lightweight topology layout with explicit confirmed-versus-inferred treatments.
- `apps/web/src/components/network/NetworkRelationshipLegend.tsx` - explains the confidence styles in operator language.
- `apps/web/src/routes/network/NetworkDetailPage.tsx` - renders explanation-first detail sections and direct next-step guidance.
- `apps/web/src/routes/network/NetworkOverviewPage.tsx` - adds the `Open network mapper` handoff from the queue-first landing page.
- `apps/web/src/components/network/NetworkFindingsQueue.tsx` - links finding rows into `/network/resources/:resourceId`.
- `apps/web/src/components/network/NetworkInventoryTable.tsx` - links inventory rows into `/network/resources/:resourceId`.

## Decisions Made

- Treated the mapper as a context surface, not a live NMS, so the visuals emphasize confidence and freshness instead of pretending to be authoritative in every case.
- Kept the detail route focused on explanation and handoff language rather than low-level raw fields first, matching the solo-operator “what matters next” goal.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 now covers queue, inventory, map, and detail workflows end to end.
- The phase is ready for regression checks and goal verification.

## Self-Check

PASSED

- Verified `npx pnpm --filter @agentsmith/web build`
- Found commit `1793d03`
- Found commit `7fa400b`

---
*Phase: 04-network-visibility-lite*
*Completed: 2026-03-27*
