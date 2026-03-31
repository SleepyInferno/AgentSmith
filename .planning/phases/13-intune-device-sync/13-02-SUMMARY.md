---
phase: 13-intune-device-sync
plan: "02"
subsystem: web/api/assets
tags: [compliance, intune, sync, inventory, detail, ui]
dependency_graph:
  requires:
    - "Phase 13-01: DeviceCompliancePolicy + DeviceComplianceAssignment models, POST /api/connectors/intune/sync"
  provides:
    - "ComplianceAssignmentDetail type (API + web)"
    - "complianceState on AssetInventoryRow (API + web)"
    - "complianceAssignments on AssetDetail (API + web)"
    - "Compliance badge column in DeviceInventoryTable"
    - "Freshness bar on DeviceInventoryPage"
    - "Compliance Policies table on DeviceDetailPage"
    - "Sync now button on ConnectorStatusPage"
  affects:
    - "apps/api/src/modules/assets/asset-health.types.ts"
    - "apps/api/src/modules/assets/asset-health.repository.ts"
    - "apps/api/src/modules/assets/asset-health.fixtures.ts"
    - "apps/api/src/routes/assets.ts"
    - "apps/web/src/lib/assets.ts"
    - "apps/web/src/components/assets/DeviceInventoryTable.tsx"
    - "apps/web/src/routes/assets/DeviceInventoryPage.tsx"
    - "apps/web/src/routes/assets/DeviceDetailPage.tsx"
    - "apps/web/src/routes/connectors/ConnectorStatusPage.tsx"
    - "apps/web/src/test/mockApi.ts"
tech_stack:
  added: []
  patterns:
    - "complianceTone helper function for compliance state color mapping"
    - "Freshness bar pattern: useQuery connectors in inventory page"
    - "Sync button with isSyncing/syncError state and queryClient.invalidateQueries"
key_files:
  created:
    - "apps/api/src/routes/__tests__/assets.compliance.test.ts"
  modified:
    - "apps/api/src/modules/assets/asset-health.types.ts (ComplianceAssignmentDetail, complianceState on AssetInventoryRow, complianceAssignments on AssetDetail)"
    - "apps/api/src/modules/assets/asset-health.repository.ts (getDeviceDetail includes complianceAssignments relation, mapInventoryRow adds complianceState)"
    - "apps/api/src/modules/assets/asset-health.fixtures.ts (complianceState on all inventory rows, complianceAssignments: [] on details)"
    - "apps/api/src/routes/assets.ts (complianceState in mapInventoryRowResponse, complianceAssignments in mapAssetDetailResponse)"
    - "apps/web/src/lib/assets.ts (ComplianceAssignmentDetail, complianceState on AssetInventoryRow, complianceAssignments on AssetDetail)"
    - "apps/web/src/components/assets/DeviceInventoryTable.tsx (complianceTone helper, compliance badge column)"
    - "apps/web/src/routes/assets/DeviceInventoryPage.tsx (ConnectorCard type, connectors query, freshness bar)"
    - "apps/web/src/routes/assets/DeviceDetailPage.tsx (Compliance Policies table with thStyle/tdStyle)"
    - "apps/web/src/routes/connectors/ConnectorStatusPage.tsx (Sync now button, isSyncing, syncError)"
    - "apps/web/src/test/mockApi.ts (POST /api/connectors/intune/sync, complianceState on inventory, complianceAssignments on details)"
decisions:
  - "complianceState added to AssetInventoryRow (not just AssetDetail) so the compliance badge column is available on the inventory table without extra per-row fetches"
  - "Freshness bar queries /api/connectors and finds the intune connector by id — reuses existing connector data shape"
  - "Sync now button scoped to connector.id === 'intune' only — other connectors do not have a manual sync trigger"
metrics:
  duration: "18 min"
  completed: "2026-03-31"
  tasks: 2
  files: 10
---

# Phase 13 Plan 02: Intune Device Sync UI Summary

Wired compliance badge, freshness bar, compliance policies table, and Sync now button from the Plan 01 backend into the operator UI — device inventory table shows compliance state pills, inventory page shows Intune sync freshness, device detail shows per-policy compliance assignments, and connector status page has a manual sync trigger.

## What Was Built

### Task 1: Compliance API endpoint, types, and backend repository update

- Added `ComplianceAssignmentDetail` type to `asset-health.types.ts`
- Added `complianceState: string | null` to `AssetInventoryRow` type
- Extended `AssetDetail` with `complianceAssignments: ComplianceAssignmentDetail[]`
- Updated `getDeviceDetail()` in the repository to include the `complianceAssignments` Prisma relation (with `policy: true` include)
- Maps compliance assignments to the `ComplianceAssignmentDetail` shape
- Added `complianceState` to `mapInventoryRow()` and `mapInventoryRowResponse()`
- Added `complianceAssignments: detail.complianceAssignments` to `mapAssetDetailResponse()`
- Updated all 7 fixture inventory rows to include `complianceState`
- Updated fixture details to include `complianceAssignments: []`
- Created `assets.compliance.test.ts` with 2 tests: one verifying complianceAssignments array is returned with correct shape, one verifying empty array case

### Task 2: UI — freshness bar, compliance badge, compliance table, sync button

- `apps/web/src/lib/assets.ts`: added `ComplianceAssignmentDetail` type, `complianceState` to `AssetInventoryRow`, `complianceAssignments` to `AssetDetail`
- `DeviceInventoryTable.tsx`: added `complianceTone()` helper matching ConnectorStatusPage's `toneForState` pattern; added `complianceState` column with colored pill badges (compliant=green, noncompliant=red, unknown/other=muted)
- `DeviceInventoryPage.tsx`: added `ConnectorCard` type inline, added `useQuery` for `/api/connectors`, renders freshness bar showing last Intune sync time, device count, and a warning/error badge when freshnessState is not healthy
- `DeviceDetailPage.tsx`: added "Compliance Policies" article below "Normalized health fields" with a table of assigned policies (name, platform, status badge, last reported); shows "No compliance policies assigned" when empty; added `thStyle`/`tdStyle` style constants
- `ConnectorStatusPage.tsx`: added `useState`, `useQueryClient`, `apiRequest` imports; added `isSyncing`/`syncError` state and `handleIntuneSync` function; Sync now button renders for `connector.id === "intune"` with disabled/Syncing state; syncError shown inline on error
- `mockApi.ts`: added `POST /api/connectors/intune/sync` handler returning `{ ok: true, connectorId: "intune", result: "success" }`; added `complianceState` to inventory row mocks; added `complianceAssignments` array to device detail mocks

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

- API tests before plan: 121
- API tests after plan: 123
- New API tests: 2 (assets.compliance.test.ts)
- Web unit tests: 41 (all pass, no regressions)
- Playwright e2e tests: 23 (all pass, no regressions)
- Full `npx pnpm test` green

## Known Stubs

None. All four UI changes are fully wired:
- Compliance badge column reads `complianceState` from the API inventory response
- Freshness bar reads from `/api/connectors` (real endpoint)
- Compliance policies table reads `complianceAssignments` from the device detail endpoint
- Sync now button POSTs to `/api/connectors/intune/sync` (real endpoint from Plan 01)

## Self-Check: PASSED

Files verified:
- apps/api/src/routes/__tests__/assets.compliance.test.ts: created
- apps/api/src/modules/assets/asset-health.types.ts: contains ComplianceAssignmentDetail and complianceState
- apps/api/src/routes/assets.ts: contains complianceAssignments in mapAssetDetailResponse
- apps/web/src/lib/assets.ts: contains ComplianceAssignmentDetail
- apps/web/src/components/assets/DeviceInventoryTable.tsx: contains complianceTone and complianceState accessor
- apps/web/src/routes/assets/DeviceInventoryPage.tsx: contains "Last Intune sync"
- apps/web/src/routes/assets/DeviceDetailPage.tsx: contains "Compliance Policies"
- apps/web/src/routes/connectors/ConnectorStatusPage.tsx: contains "Sync now"
- apps/web/src/test/mockApi.ts: contains /api/connectors/intune/sync and complianceAssignments

Commits verified: 2e001ee (Task 1), 38888ab (Task 2)
