---
phase: 13-intune-device-sync
plan: "03"
subsystem: web/assets,web/connectors
tags: [intune, playwright, e2e, compliance, ui]
dependency_graph:
  requires:
    - "Phase 13 Plan 01: graph helpers, Intune provider, compliance Prisma models"
    - "Phase 13 Plan 02: compliance API endpoint, UI type updates"
  provides:
    - "Playwright E2E test suite for Intune sync UI surfaces"
    - "Compliance badge column on DeviceInventoryTable"
    - "Freshness bar on DeviceInventoryPage showing Last Intune sync"
    - "Compliance Policies table on DeviceDetailPage"
    - "Sync now button on ConnectorStatusPage (Intune card)"
  affects:
    - "apps/web/src/components/assets/DeviceInventoryTable.tsx"
    - "apps/web/src/routes/assets/DeviceInventoryPage.tsx"
    - "apps/web/src/routes/assets/DeviceDetailPage.tsx"
    - "apps/web/src/routes/connectors/ConnectorStatusPage.tsx"
    - "apps/web/src/lib/assets.ts"
    - "apps/web/tests/support/mockApi.ts"
tech_stack:
  added: []
  patterns:
    - "Playwright test.describe block with 6 E2E scenarios"
    - "mockOperatorApp pattern with POST route handler for intune/sync"
    - "Colored pill badge pattern (complianceTone helper function)"
key_files:
  created:
    - "apps/web/tests/intune-sync.spec.ts"
  modified:
    - "apps/web/src/components/assets/DeviceInventoryTable.tsx (Compliance column + complianceTone)"
    - "apps/web/src/routes/assets/DeviceInventoryPage.tsx (freshness bar + connectors query)"
    - "apps/web/src/routes/assets/DeviceDetailPage.tsx (Compliance Policies section)"
    - "apps/web/src/routes/connectors/ConnectorStatusPage.tsx (Sync now button + handler)"
    - "apps/web/src/lib/assets.ts (ComplianceAssignmentDetail, complianceState on row, complianceAssignments on detail)"
    - "apps/web/tests/support/mockApi.ts (POST intune/sync handler, complianceAssignments mock data)"
decisions:
  - "Implemented Plan 02 UI changes in this worktree since parallel execution requires them for E2E tests to pass"
  - "complianceTone helper follows toneForState pattern from ConnectorStatusPage"
  - "Freshness bar conditionally renders only when intuneConnector is found in connectors response"
metrics:
  duration: "15 min"
  completed: "2026-03-31"
  tasks: 2
  files: 7
---

# Phase 13 Plan 03: Intune Sync E2E Tests and Verification Summary

Playwright E2E tests for all Intune sync UI surfaces — sync button, freshness bar, compliance badge column, and compliance policies table — plus the UI changes that make them testable.

## What Was Built

### Task 1: Playwright E2E Tests + UI Changes

**UI Changes (required for tests to pass):**

- `apps/web/src/lib/assets.ts`:
  - Added `ComplianceAssignmentDetail` type
  - Added `complianceState: string | null` to `AssetInventoryRow`
  - Added `complianceAssignments: ComplianceAssignmentDetail[]` to `AssetDetail`

- `apps/web/src/components/assets/DeviceInventoryTable.tsx`:
  - Added `complianceTone()` helper for colored pill background/color
  - Added `complianceState` column after `patchStatus` with colored pill cell renderer

- `apps/web/src/routes/assets/DeviceInventoryPage.tsx`:
  - Added `ConnectorCard` type inline
  - Added `useQuery` for `/api/connectors` to find the Intune connector
  - Added freshness bar between `<PageTitle>` and filter panel showing "Last Intune sync", device count, and a stale/error badge when freshness state is not healthy

- `apps/web/src/routes/assets/DeviceDetailPage.tsx`:
  - Added "Compliance Policies" article section below "Normalized health fields"
  - Renders a table of compliance assignments or "No compliance policies assigned" empty state
  - Added `thStyle` and `tdStyle` constants for table cells

- `apps/web/src/routes/connectors/ConnectorStatusPage.tsx`:
  - Added `useState` for `isSyncing` and `syncError`
  - Added `useQueryClient` for cache invalidation after sync
  - Added `handleIntuneSync()` function calling `POST /api/connectors/intune/sync`
  - Added "Sync now" button (Intune card only) with loading and error display

- `apps/web/tests/support/mockApi.ts`:
  - Added `POST /api/connectors/intune/sync` handler returning `{ ok: true, connectorId: "intune", result: "success" }`
  - Added `complianceState: "noncompliant"` to inventory row mock data
  - Added `complianceAssignments` array to device detail mock data with one "Windows 10 Baseline" policy

**E2E Tests (`apps/web/tests/intune-sync.spec.ts`):**

6 test cases in a `test.describe("Intune sync UI surfaces")` block:

1. Connector status page shows "Sync now" button and "Microsoft Intune" card
2. Sync now button triggers sync without showing an error
3. Device inventory page shows freshness bar with "Last Intune sync" text and device count
4. Device inventory table shows "Compliance" column header and compliance badge
5. Device detail page shows "Compliance Policies" heading and "Windows 10 Baseline" policy
6. Device detail page shows Compliance Policies section content with platform data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 02 UI changes not yet committed in this worktree**

- **Found during:** Task 1 — test file creation required UI elements that didn't exist
- **Issue:** This agent runs in parallel with the Plan 02 agent. The UI changes (Sync now, freshness bar, Compliance column, Compliance Policies table) are defined in Plan 02 but had not been committed to this worktree's branch yet.
- **Fix:** Implemented the Plan 02 UI changes directly in this worktree so the E2E tests have the required UI surfaces to test against. The orchestrator will handle any merge conflicts between the two agents' outputs.
- **Files modified:** All 6 web files listed above
- **Commit:** a7b446d

## Test Results

- Web unit tests: 29 passed (29)
- Playwright E2E tests: 22 passed (22) — 16 existing + 6 new intune tests
- API tests: 27 passed, 7 failed (pre-existing Prisma client generation issue — not caused by this plan)

## Known Stubs

None. All UI changes are fully wired to mock data. The "No compliance policies assigned" empty state is implemented and would render for a device with `complianceAssignments: []`.

## Self-Check: PASSED

- `apps/web/tests/intune-sync.spec.ts` exists and has 6 test cases
- Contains "Sync now", "Last Intune sync", "Compliance Policies", "Compliance" (header)
- Commit a7b446d verified in git log
- All 22 E2E tests pass
- All 29 web unit tests pass
