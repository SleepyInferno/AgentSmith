---
phase: 06-documentation-assistant
plan: 04
subsystem: ui
tags: [react, react-query, react-router, documentation, detail-view]
requires:
  - phase: 06-02
    provides: API docs overview, search, and detail contracts with seeded fallback
  - phase: 06-03
    provides: docs query keys plus overview/search routes that hand off route state
provides:
  - Docs detail route at /docs/:documentId inside the existing app shell
  - Client-side docs detail adapter with review age, next review status, and history highlights
  - Explanation-first detail page with route-state handoff, linked systems, and review history
affects: [06-05, documentation-review, docs-routing]
tech-stack:
  added: []
  patterns: [client-side detail adaptation, explanation-first read-only detail routes, reusable docs detail cards]
key-files:
  created:
    - apps/web/src/routes/docs/DocumentationDetailPage.tsx
    - apps/web/src/components/docs/DocumentHistoryTimeline.tsx
    - apps/web/src/components/docs/DocumentMetadataSummaryCard.tsx
    - apps/web/src/components/docs/DocumentLinkedSystemsCard.tsx
  modified:
    - apps/web/src/router.tsx
    - apps/web/src/lib/docs.ts
key-decisions:
  - "Adapt docs detail responses in the web client so review age and summary helpers exist without widening the backend DTO."
  - "Keep document detail read-only with only overview and search navigation while surfacing trust-boundary copy on the route."
  - "Preserve queue and search handoff context through route state so the surfaced reason survives into detail."
patterns-established:
  - "Docs detail pages should derive presentation helpers in lib/docs.ts rather than duplicating review-age logic in components."
  - "Queue and search routes should pass explicit origin context into detail pages for explanation-first UX."
requirements-completed: [DOCS-01, DOCS-03]
duration: 13 min
completed: 2026-03-28
---

# Phase 06 Plan 04: Documentation Detail Summary

**Explanation-first documentation detail route with client-adapted review aging, linked-system context, and readable review history**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-28T12:20:00-04:00
- **Completed:** 2026-03-28T12:33:16-04:00
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `/docs/:documentId` to the shared shell and kept the router-owned read-only trust boundary visible on the detail route.
- Adapted documentation detail responses in `apps/web/src/lib/docs.ts` so review age, next-review status, history highlights, and linked-system summaries come from one shared client helper.
- Built the explanation-first detail page plus reusable cards for linked systems, next review window, and chronological review history.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the docs detail route and client-side detail adapter** - `2fbd13f` (feat)
2. **Task 2: Build the explanation-first document detail page with history and linked-system context** - `e1b115f` (feat)

## Files Created/Modified

- `apps/web/src/router.tsx` - registers the docs detail route and passes router-owned trust-boundary copy
- `apps/web/src/lib/docs.ts` - adapts detail payloads into review-age and history summaries
- `apps/web/src/routes/docs/DocumentationDetailPage.tsx` - explanation-first detail workflow with route-state handoff notes
- `apps/web/src/components/docs/DocumentHistoryTimeline.tsx` - readable history timeline for source sync, metadata review, and review completion events
- `apps/web/src/components/docs/DocumentMetadataSummaryCard.tsx` - owner/site/category and next-review summary card
- `apps/web/src/components/docs/DocumentLinkedSystemsCard.tsx` - linked-system context card with relationship labels

## Decisions Made

- Kept the backend detail contract unchanged and derived UI-only helper fields in the web adapter instead.
- Limited top-level detail navigation to `Back to docs overview` and `Open search inventory` so content editing stayed out of scope.
- Used route-state context plus derived stale-signal fallbacks to populate the `Why this surfaced` section even on direct loads.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a minimal detail page during Task 1 so the new route could compile**
- **Found during:** Task 1 (Add the docs detail route and client-side detail adapter)
- **Issue:** Registering `/docs/:documentId` in the router would have broken the required build until a route component existed.
- **Fix:** Added a minimal `DocumentationDetailPage.tsx` in Task 1, then expanded it fully in Task 2.
- **Files modified:** `apps/web/src/routes/docs/DocumentationDetailPage.tsx`, `apps/web/src/router.tsx`
- **Verification:** `npx pnpm --filter @agentsmith/web build`
- **Committed in:** `2fbd13f` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation was required for the task-level build gate and did not widen scope beyond the planned detail route.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The docs module now has a stable detail route and reusable explanation-first components ready for the later explicit metadata review flow.
- Queue and search pages already hand off surfaced reasons and origin context into detail, so Phase `06-05` can focus on audited metadata changes instead of rebuilding read-only detail context.

## Self-Check: PASSED

- Verified summary and created implementation files exist on disk.
- Verified task commits `2fbd13f` and `e1b115f` exist in git history.
