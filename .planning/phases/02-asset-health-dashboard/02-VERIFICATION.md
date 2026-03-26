---
phase: 02-asset-health-dashboard
verified: 2026-03-26T19:01:06Z
status: passed
score: 9/9 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/9
  gaps_closed:
    - "Operator can filter and sort devices by risk indicators such as stale check-in, low disk, missing encryption, missing AV, age, and unsupported OS"
  gaps_remaining: []
  regressions: []
---

# Phase 2: Asset Health Dashboard Verification Report

**Phase Goal:** Provide a morning-start dashboard that tells the solo IT admin which endpoints need attention first and why.
**Verified:** 2026-03-26T19:01:06Z
**Status:** passed
**Re-verification:** Yes - after gap closure

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Canonical device identity stays separate from derived dashboard risk output. | ✓ VERIFIED | [`prisma/schema.prisma`](F:/AI/AgentSmith/prisma/schema.prisma#L27) defines `AssetRiskLevel`; [`prisma/schema.prisma`](F:/AI/AgentSmith/prisma/schema.prisma#L64) stores derived scoring in `DeviceRiskAssessment`. |
| 2 | Asset health statuses support unknown and incomplete states instead of treating missing telemetry as healthy. | ✓ VERIFIED | [`prisma/schema.prisma`](F:/AI/AgentSmith/prisma/schema.prisma#L21) defines `AssetSignalStatus` with `missing` and `unknown`; [`asset-health.service.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.service.ts#L87) emits `data_incomplete`. |
| 3 | Risk scoring is deterministic, explainable, and reusable by the queue, inventory, and detail views. | ✓ VERIFIED | [`asset-health.service.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.service.ts#L55) scores devices; [`asset-health.service.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.service.ts#L103) builds queue items; [`asset-health.service.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.service.ts#L132) builds device detail. |
| 4 | Asset endpoints expose stable app-owned DTOs for queue, inventory, and detail workflows. | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L22) exposes `/api/assets/queue`; [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L46) and [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L54) expose inventory and detail routes. |
| 5 | Filter and sort behavior is implemented server-side so queue and inventory semantics stay consistent. | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L105) parses `sortField`; [`asset-health.repository.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.repository.ts#L232) applies sorting after server-side filtering. |
| 6 | API payloads preserve freshness and incomplete-data visibility instead of implying false confidence. | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L184) and [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L204) return `signals` and `sourceFreshnessState`. |
| 7 | The first Phase 2 screen is queue-first and tells the solo operator what needs attention now. | ✓ VERIFIED | [`AssetDashboardPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/dashboard/AssetDashboardPage.tsx#L21) loads queue data first; [`AssetDashboardPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/dashboard/AssetDashboardPage.tsx#L48) centers the screen on “Needs attention.” |
| 8 | Inventory, queue, and detail pages render the same backend-provided risk and freshness data without recomputing scores in React. | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/web/src/lib/assets.ts#L92) fetches queue data; [`assets.ts`](F:/AI/AgentSmith/apps/web/src/lib/assets.ts#L112) fetches inventory with query params; [`DeviceDetailPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceDetailPage.tsx#L82) and [`DeviceDetailPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceDetailPage.tsx#L93) render backend risk and freshness fields directly. |
| 9 | The UI distinguishes healthy empty states from stale or incomplete source-data states. | ✓ VERIFIED | [`AssetDashboardPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/dashboard/AssetDashboardPage.tsx#L8) returns “No risky devices right now”; [`AssetDashboardPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/dashboard/AssetDashboardPage.tsx#L12) returns “Asset data is stale or incomplete”; [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L203) renders “No devices match the current filters.” |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `prisma/schema.prisma` | Device risk read model and asset-health enums | ✓ VERIFIED | Asset signal/risk enums and `DeviceRiskAssessment` exist and are substantive. |
| `apps/api/src/modules/assets/asset-health.types.ts` | Shared asset DTO and filter types | ✓ VERIFIED | Inventory, queue, detail, signal, and sort/filter types exist. |
| `apps/api/src/modules/assets/asset-health.repository.ts` | Prisma-backed inventory, queue, and detail queries | ✓ VERIFIED | Uses `device.findMany/findUnique`, `user.findMany`, signal filtering, stale filtering, and sorting. |
| `apps/api/src/modules/assets/asset-health.service.ts` | Deterministic scoring and explanations | ✓ VERIFIED | Weighted rules, `watch` bucket, and reusable queue/detail builders are present. |
| `apps/api/src/routes/assets.ts` | Queue, inventory, and detail API routes | ✓ VERIFIED | Route contract is implemented and returns app-owned DTOs. |
| `apps/api/src/server.ts` | Server wiring for asset routes | ✓ VERIFIED | `buildServer()` registers asset routes. |
| `apps/api/src/routes/assets.test.ts` | Contract coverage for queue/inventory/detail | ✓ VERIFIED | Injection tests pass for queue order, stale-only inventory, and detail payload. |
| `apps/web/src/routes/dashboard/AssetDashboardPage.tsx` | Queue-first morning-start page | ✓ VERIFIED | Queue, freshness warning, and inventory navigation are wired. |
| `apps/web/src/routes/assets/DeviceInventoryPage.tsx` | Filterable and sortable inventory page | ✓ VERIFIED | Reads `sortField`/`sortDirection` from URL and exposes both controls in the shipped UI. |
| `apps/web/src/routes/assets/DeviceDetailPage.tsx` | Explainable detail page | ✓ VERIFIED | Renders risk summary, signals, data freshness, and normalized health fields. |
| `apps/web/src/components/assets/NeedsAttentionQueue.tsx` | Ranked queue linked to detail pages | ✓ VERIFIED | Uses backend `watch` bucket and links each row to `/devices/:deviceId`. |
| `apps/web/src/components/assets/DeviceInventoryTable.tsx` | Inventory table with required key fields | ✓ VERIFIED | Renders device, owner, department, site, OS, encryption, AV, patch, last check-in, and risk columns. |
| `apps/web/src/components/assets/RiskSignalList.tsx` | Backend-provided signal explanation renderer | ✓ VERIFIED | Shows signal label, severity, and explanation. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `AssetHealthRepository` | Prisma `Device` and `User` data | Prisma queries | ✓ VERIFIED | [`asset-health.repository.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.repository.ts#L30) reads devices and [`asset-health.repository.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.repository.ts#L128) reads owners. |
| `registerAssetRoutes` | `AssetHealthRepository` | repository method calls | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L24), [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L47), and [`assets.ts`](F:/AI/AgentSmith/apps/api/src/routes/assets.ts#L55) call `listQueue`, `listInventory`, and `getDeviceDetail`. |
| `buildServer` | asset routes | Fastify route registration | ✓ VERIFIED | [`server.ts`](F:/AI/AgentSmith/apps/api/src/server.ts#L30) registers `registerAssetRoutes`. |
| `AssetDashboardPage` | `/api/assets/queue` | `getNeedsAttentionQueue()` | ✓ VERIFIED | [`AssetDashboardPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/dashboard/AssetDashboardPage.tsx#L21) calls the fetcher; [`assets.ts`](F:/AI/AgentSmith/apps/web/src/lib/assets.ts#L92) issues the request. |
| `DeviceInventoryPage` | `/api/assets/devices` | URL params -> `getDeviceInventory(params)` | ✓ VERIFIED | [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L13) and [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L14) read `sortField`/`sortDirection`; [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L90) passes params to the fetcher; [`assets.ts`](F:/AI/AgentSmith/apps/web/src/lib/assets.ts#L112) serializes them into the request URL. |
| `NeedsAttentionQueue` | device detail route | `Link` to `/devices/:deviceId` | ✓ VERIFIED | [`NeedsAttentionQueue.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/NeedsAttentionQueue.tsx#L51) links each queue item to the drill-in route. |
| `DeviceDetailPage` | `/api/assets/devices/:deviceId` | `getDeviceDetail(deviceId)` | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/web/src/lib/assets.ts#L118) fetches detail; [`DeviceDetailPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceDetailPage.tsx#L17) loads it through React Query. |
| `NeedsAttentionQueue` | web risk contract | backend `watch` bucket rendered directly | ✓ VERIFIED | [`assets.ts`](F:/AI/AgentSmith/apps/web/src/lib/assets.ts#L1) defines `RiskLevel` with `watch`; [`NeedsAttentionQueue.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/NeedsAttentionQueue.tsx#L14) styles `watch`; [`NeedsAttentionQueue.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/NeedsAttentionQueue.tsx#L85) renders `item.riskLevel` directly. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `AssetDashboardPage` | `queueQuery.data` | `/api/assets/queue` -> `AssetHealthRepository.listQueue()` -> Prisma `device.findMany()` | Yes | ✓ FLOWING |
| `DeviceInventoryPage` | `inventoryQuery.data` | `/api/assets/devices` -> `AssetHealthRepository.listInventory()` -> Prisma `device.findMany()` and `user.findMany()` | Yes | ✓ FLOWING |
| `DeviceDetailPage` | `detailQuery.data` | `/api/assets/devices/:deviceId` -> `AssetHealthRepository.getDeviceDetail()` -> Prisma `device.findUnique()` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Asset scoring and route contracts work | `npm exec pnpm -- --filter @agentsmith/api test` | 6 tests passed | ✓ PASS |
| Web app builds with Phase 02 routes and components | `npm exec pnpm -- --filter @agentsmith/web build` | TypeScript check and Vite build passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ASST-01 | 02-01, 02-02, 02-03 | Operator can view a unified device inventory with owner, department, site, OS, encryption, AV, patch status, and last check-in | ✓ SATISFIED | [`DeviceInventoryTable.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/DeviceInventoryTable.tsx#L18) through [`DeviceInventoryTable.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/DeviceInventoryTable.tsx#L32) define the required columns. |
| ASST-02 | 02-01, 02-02, 02-03, 02-04 | Operator can filter and sort devices by risk indicators such as stale check-in, low disk, missing encryption, missing AV, age, and unsupported OS | ✓ SATISFIED | [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L13) and [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L14) read sort params; [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L163) and [`DeviceInventoryPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceInventoryPage.tsx#L170) expose sort controls; [`asset-health.repository.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.repository.ts#L216) and [`asset-health.repository.ts`](F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.repository.ts#L232) apply signal filtering and sorting server-side. |
| ASST-03 | 02-02, 02-03 | Operator can open a device detail view showing the health signals contributing to its risk status | ✓ SATISFIED | [`DeviceDetailPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/assets/DeviceDetailPage.tsx#L105) renders Signals; [`RiskSignalList.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/RiskSignalList.tsx#L15) renders label, severity, and explanation. |
| ASST-04 | 02-01, 02-02, 02-03, 02-04 | Operator can see a prioritized "needs attention" queue for the riskiest devices | ✓ SATISFIED | [`AssetDashboardPage.tsx`](F:/AI/AgentSmith/apps/web/src/routes/dashboard/AssetDashboardPage.tsx#L21) loads the queue; [`NeedsAttentionQueue.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/NeedsAttentionQueue.tsx#L77) shows queue rank and [`NeedsAttentionQueue.tsx`](F:/AI/AgentSmith/apps/web/src/components/assets/NeedsAttentionQueue.tsx#L91) shows the risk score. |

No orphaned Phase 2 requirements were found in [`REQUIREMENTS.md`](F:/AI/AgentSmith/.planning/REQUIREMENTS.md#L12) beyond `ASST-01` through `ASST-04`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| None | - | No blocker or warning-level Phase 2 stub patterns found in the verified API and web artifacts. | - | - |

### Human Verification Required

None flagged. The remaining Phase 02 contract items were verifiable from code, routing, and automated build/test checks.

### Gaps Summary

This re-verification closes the prior Phase 02 gap. The inventory UI now exposes operator-facing sort controls, persists those choices in URL params, and sends them through the existing `/api/assets/devices` contract. The web risk-level contract also matches the backend `watch` bucket, so queue and inventory terminology are consistent again.

Phase 02 now delivers the intended morning-start workflow: a queue-first dashboard, explainable device drill-in, freshness-aware messaging, and a normalized, filterable, sortable inventory backed by one server-owned risk model.

---

_Verified: 2026-03-26T19:01:06Z_
_Verifier: Claude (gsd-verifier)_
