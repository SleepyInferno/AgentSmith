---
phase: 02-asset-health-dashboard
plan: 03
subsystem: ui
tags: [react, vite, react-router-dom, tanstack-query, tanstack-table, asset-dashboard]
requires:
  - phase: 02-asset-health-dashboard
    provides: queue, inventory, and device-detail asset APIs from plan 02
provides:
  - queue-first asset dashboard wired to backend risk and freshness data
  - server-driven device inventory filters and routeable device drill-in views
  - explainable device detail screens with distinct healthy, filtered-empty, and stale-data states
affects: [asset-dashboard, device-inventory, device-detail, morning-triage]
tech-stack:
  added: [react-router-dom, @tanstack/react-query, @tanstack/react-table]
  patterns: [router-driven-asset-navigation, query-client-backed-api-fetching, server-owned-inventory-filters]
key-files:
  created:
    - apps/web/src/lib/queryClient.ts
    - apps/web/src/lib/assets.ts
    - apps/web/src/router.tsx
    - apps/web/src/components/assets/NeedsAttentionQueue.tsx
    - apps/web/src/components/assets/DeviceInventoryTable.tsx
    - apps/web/src/components/assets/RiskSignalList.tsx
    - apps/web/src/routes/dashboard/AssetDashboardPage.tsx
    - apps/web/src/routes/assets/DeviceInventoryPage.tsx
    - apps/web/src/routes/assets/DeviceDetailPage.tsx
  modified:
    - apps/web/package.json
    - apps/web/src/main.tsx
    - pnpm-lock.yaml
key-decisions:
  - "Kept asset API DTO types local to the web layer because the shared package dist in this workspace does not yet export the Phase 2 asset contracts."
  - "Used URL search params plus React Query keys for inventory filters so the browser state stays routeable while the API remains the source of ranking and filtering truth."
  - "Made the landing screen queue-first with inventory navigation secondary to match the solo-operator morning triage workflow in AGENTS.md."
patterns-established:
  - "Asset routes are first-class URLs: dashboard at `/`, inventory at `/devices`, and drill-in detail at `/devices/:deviceId`."
  - "Web asset fetchers always include credentials and consume the backend-owned DTO shape without recomputing risk scores in React."
requirements-completed: [ASST-01, ASST-02, ASST-03, ASST-04]
duration: 36 min
completed: 2026-03-26
---

# Phase 02 Plan 03: Asset Dashboard Summary

**Queue-first asset dashboard with server-driven inventory filters, routeable device detail pages, and freshness-aware stale-data UX**

## Performance

- **Duration:** 36 min
- **Started:** 2026-03-26T17:35:00Z
- **Completed:** 2026-03-26T18:11:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Replaced the placeholder web entry with a router and query client that can load queue, inventory, and device detail data from the Phase 2 APIs.
- Built a queue-first dashboard and filterable device inventory that rely on server-side ranking and filter semantics rather than client-side re-sorting.
- Added explainable device detail rendering plus explicit healthy, filtered-empty, and stale-data messaging across the asset views.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add dashboard routing, query infrastructure, and typed asset fetchers** - `35ead32` (feat)
2. **Task 2: Build the queue-first dashboard and filterable inventory views** - `1281551` (feat)
3. **Task 3: Build the explainable device detail page and stale-data UX states** - `a8e8b15` (feat)

## Files Created/Modified

- `apps/web/package.json` - adds React Router, React Query, and TanStack Table to the web package
- `apps/web/src/main.tsx` - mounts the router under a shared QueryClientProvider
- `apps/web/src/router.tsx` - defines `/`, `/devices`, and `/devices/:deviceId` inside the asset app shell
- `apps/web/src/lib/queryClient.ts` - exports the shared query client instance
- `apps/web/src/lib/assets.ts` - defines typed fetchers for `/api/assets/queue`, `/api/assets/devices`, and `/api/assets/devices/:deviceId`
- `apps/web/src/components/assets/NeedsAttentionQueue.tsx` - renders ranked queue cards linked to device detail routes
- `apps/web/src/components/assets/DeviceInventoryTable.tsx` - renders the asset inventory columns with TanStack Table
- `apps/web/src/components/assets/RiskSignalList.tsx` - renders backend-provided signal `label`, `severity`, and `explanation`
- `apps/web/src/routes/dashboard/AssetDashboardPage.tsx` - builds the queue-first dashboard and freshness callout
- `apps/web/src/routes/assets/DeviceInventoryPage.tsx` - wires inventory filters to server query params and shows filtered-empty states
- `apps/web/src/routes/assets/DeviceDetailPage.tsx` - renders Risk summary, Signals, Data freshness, and normalized health fields

## Decisions Made

- Kept the Phase 2 asset DTO typing local to the web package because `packages/shared/dist` is not yet publishing those exports in this workspace state.
- Used route search params for filter state so triage URLs remain bookmarkable while React Query handles cache and refetch semantics.
- Prioritized the needs-attention queue over dashboard chrome to stay aligned with the solo-admin workflow and avoid dashboard sprawl.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Avoided importing stale shared-package asset types**
- **Found during:** Task 1 (Add dashboard routing, query infrastructure, and typed asset fetchers)
- **Issue:** The shared package dist available to the web app did not export the Phase 2 asset DTOs, which would have broken the new typed fetch layer.
- **Fix:** Kept the HTTP DTO types in `apps/web/src/lib/assets.ts` and used the API contract directly in the web layer instead of depending on stale shared build artifacts.
- **Files modified:** `apps/web/src/lib/assets.ts`
- **Verification:** `npm exec pnpm -- --filter @agentsmith/web build`
- **Committed in:** `35ead32`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep the web build functional without broadening scope into shared-package rebuild work.

## Issues Encountered

- `pnpm` was not directly available on `PATH`, so all verification and install commands were run through `npm exec pnpm -- ...`.
- A first dependency install attempt treated `@agentsmith/shared` like a registry package; the web task was corrected to use local DTOs and the lockfile was reconciled before the Task 1 commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The asset APIs from Plan 02 now have a usable morning-start UI surface with direct drill-in to device detail pages.
- The next feature phase can reuse the router/query-client pattern for additional operator workflows without introducing a second data-fetching approach.

## Self-Check: PASSED

- Verified summary file exists at `.planning/phases/02-asset-health-dashboard/02-03-SUMMARY.md`.
- Verified task commits `35ead32`, `1281551`, and `a8e8b15` exist in git history.
