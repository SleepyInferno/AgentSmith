---
phase: 02-asset-health-dashboard
plan: 04
subsystem: ui
tags: [react, react-query, routing, filters, asset-health]
requires:
  - phase: 02-03
    provides: queue-first asset dashboard, inventory route, URL-driven inventory filters
provides:
  - operator-visible inventory sort controls backed by URL params
  - web risk-level contract aligned to backend watch bucket
  - queue risk chips and inventory filters that use consistent backend terminology
affects: [asset-health-dashboard, verification, triage-ux]
tech-stack:
  added: []
  patterns: [URL search params drive API filters and sort state, backend risk buckets render directly in UI]
key-files:
  created: []
  modified:
    - apps/web/src/lib/assets.ts
    - apps/web/src/components/assets/NeedsAttentionQueue.tsx
    - apps/web/src/routes/assets/DeviceInventoryPage.tsx
key-decisions:
  - "Kept inventory sorting server-driven by wiring UI controls into existing query params instead of adding client-side resorting."
  - "Aligned operator-visible risk labels to the backend watch bucket while leaving signal severity medium unchanged."
patterns-established:
  - "Inventory controls should read from and write to URL params so triage views stay bookmarkable."
  - "Operator-visible labels must mirror backend risk buckets exactly when the API is the source of truth."
requirements-completed: [ASST-02, ASST-04]
duration: 2min
completed: 2026-03-26
---

# Phase 2 Plan 4: Asset Triage Accessibility Summary

**URL-backed inventory sort controls and watch-aligned risk labels for the queue and inventory workflow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T14:54:44-04:00
- **Completed:** 2026-03-26T18:55:48Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added operator-facing `sortField` and `sortDirection` controls to the inventory filter panel.
- Persisted inventory sort choices in URL params so the existing `/api/assets/devices` contract stays bookmarkable and server-driven.
- Replaced the web `medium` risk bucket with backend `watch` terminology in typing and queue presentation.

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct web risk-level typing and queue labels to use backend `watch`** - `1f0242f` (fix)
2. **Task 2: Add operator sort controls and URL wiring for inventory queries** - `cc8132c` (feat)

## Files Created/Modified
- `apps/web/src/lib/assets.ts` - Updated the exported `RiskLevel` union to match the backend `watch` bucket.
- `apps/web/src/components/assets/NeedsAttentionQueue.tsx` - Switched queue chip styling from `medium` to `watch` and kept each visible risk tier distinct.
- `apps/web/src/routes/assets/DeviceInventoryPage.tsx` - Read `sortField` and `sortDirection` from URL params, exposed both controls in the filter panel, and aligned visible `riskLevel` options with `watch`.

## Decisions Made
- Used the existing URL search-param flow for sort controls so `getDeviceInventory(params)` continues to call the API contract directly.
- Kept `AssetRiskSignal.severity` unchanged because backend signal severities still legitimately use `medium`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `rg.exe` was not runnable in this environment, so the text verification steps were completed with PowerShell `Select-String` instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 2 now exposes the remaining ASST-02 sorting controls directly in the shipped UI.
- Queue and inventory risk terminology are aligned with the backend contract, which removes the last known verification gap from Phase 2.

## Self-Check

PASSED

---
*Phase: 02-asset-health-dashboard*
*Completed: 2026-03-26*
