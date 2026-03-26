# Phase 2: Asset Health Dashboard - Research

**Researched:** 2026-03-26
**Domain:** Device inventory, endpoint risk scoring, and dashboard read models on the existing React/Fastify/Prisma/PostgreSQL stack
**Confidence:** MEDIUM

## User Constraints

Source: user objective, `AGENTS.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md`

- Provide a morning-start dashboard that tells the solo IT admin which endpoints need attention first and why.
- Must address `ASST-01`, `ASST-02`, `ASST-03`, and `ASST-04`.
- Preserve the five-tool v1 scope; do not expand into broader RMM or enterprise dashboard sprawl.
- Favor guided workflows and clear risk queues over broad dashboard chrome.
- Keep connector-specific logic isolated from internal domain models.
- Treat write actions as high-trust operations. Phase 2 should stay read-heavy.
- The dashboard must clearly indicate when source data is stale or incomplete.
- The app should help a solo admin decide what matters next within a few minutes of opening it.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASST-01 | Operator can view a unified device inventory with owner, department, site, OS, encryption, AV, patch status, and last check-in | Extend normalized device fields plus owner join data; expose a server-filterable inventory endpoint and a table UI backed by typed health columns |
| ASST-02 | Operator can filter and sort devices by risk indicators such as stale check-in, low disk, missing encryption, missing AV, age, and unsupported OS | Use a computed risk assessment read model plus TanStack Table and server-side filter query params; persist nullable health fields so `unknown` is distinct from healthy |
| ASST-03 | Operator can open a device detail view showing the health signals contributing to its risk status | Add a device detail route and API returning normalized signals, freshness context, and explanation text from a server-side assessment service |
| ASST-04 | Operator can see a prioritized "needs attention" queue for the riskiest devices | Compute a deterministic priority score server-side and expose a dedicated top-risk queue endpoint for the dashboard landing surface |
</phase_requirements>

## Summary

Phase 2 should be planned as the first real read model on top of the shared canonical data backbone: a prioritized queue, a filterable inventory, and a device detail view that explains risk. The key implementation choice is to keep canonical device records separate from computed dashboard risk output. Canonical device state should remain a normalized representation of connector data, while the dashboard uses a derived risk assessment model that can be recalculated whenever connector snapshots change.

The current repository is still at the bootstrap slice of Phase 1. The placeholder React shell and API health route exist, but the Phase 1 plans for auth, connector syncs, connector APIs, and audit pages are not implemented in code yet. The Phase 2 planner should therefore either depend on Phase 1 Plan 02 and Plan 03 being executed first, or explicitly include prerequisite work to unblock authenticated device data access. Do not assume `/api/me`, `/api/connectors`, or synced Intune device records already exist.

Microsoft Graph supports the core inventory fields needed for this phase from Intune managed devices, including device name, OS, compliance, encryption, last sync, storage, and primary user references. User department and office location are available on the Entra user resource and should be joined into the inventory instead of duplicating provider payloads in the UI. Patch and AV richness is uneven across stable Graph endpoints, so the phase should normalize these as explicit statuses with `unknown` allowed, and only depend on beta-only Windows fields if the planner intentionally chooses that tradeoff.

**Primary recommendation:** Plan Phase 2 around a server-side asset health module that computes a deterministic risk assessment read model from normalized Intune plus Entra snapshots, then expose three protected UI surfaces: `needs-attention`, `inventory`, and `device-detail`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.x installed, 19.2.4 current | Web UI | Already in repo; keep the Phase 1 baseline rather than expanding scope with a framework change |
| `react-router-dom` | 7.13.2 | Protected routes and detail navigation | Current React Router supports Data Routers and `createBrowserRouter`, which fits inventory/detail navigation cleanly |
| `@tanstack/react-query` | 5.95.2 | Protected API fetching, cache, refetch, loading and error states | Standard for async dashboard data; prevents ad hoc loading and stale-state handling |
| `@tanstack/react-table` | 8.21.3 | Inventory filtering, sorting, column state | Standard headless table engine for filter-heavy internal tools |
| Fastify | 5.3.x installed, 5.8.4 current | API routes for queue, inventory, detail | Already in repo; Fastify v5 aligns with current Node and supports `inject()`-based tests |
| Prisma Client | 6.6.x installed, 7.5.0 current | Device, user, and assessment persistence and querying | Already in repo with PostgreSQL datasource and canonical schema |
| PostgreSQL | existing project datastore | Canonical entities and dashboard read models | Required by current Prisma schema and Phase 1 backbone |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.24.x installed | Parse query params and API responses | Use for route-level validation and typed filter parsing in the asset module |
| `node:test` | Node 25.8.1 runtime available | API service and route tests | Use for Fastify service tests because Fastify v5 is optimized for Node 20+ and current API scripts already point that way |
| Vitest | 4.0.5 current | Web component and hook tests | Add only for frontend tests; the web package currently has no test runner |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tanstack/react-table` | Hand-rolled table state | Not acceptable; filtering, sorting, column visibility, and row models are exactly the complexity this library already solves |
| `@tanstack/react-query` | Raw `useEffect` plus local state | Not acceptable; dashboard data needs retry, refetch, stale-state handling, and predictable loading and error behavior |
| Separate dashboard-only device table | Reusing canonical `Device` plus derived assessment model | Use the canonical `Device` plus a derived assessment model; duplicating inventory identity data in a dashboard table creates drift |

**Installation:**
```bash
pnpm --filter @agentsmith/web add react-router-dom @tanstack/react-query @tanstack/react-table
pnpm --filter @agentsmith/web add -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

If `pnpm` is still unavailable locally, the planner must add an environment setup step first.

**Version verification:** Verified on 2026-03-26 with:
```bash
npm view react version
npm view react-router-dom version
npm view @tanstack/react-query version
npm view @tanstack/react-table version
npm view fastify version
npm view @prisma/client version
```

## Architecture Patterns

### Recommended Project Structure
```text
apps/
|-- api/
|   `-- src/
|       |-- modules/
|       |   |-- assets/
|       |   |   |-- asset-health.service.ts
|       |   |   |-- asset-health.types.ts
|       |   |   `-- asset-health.repository.ts
|       |   `-- connectors/
|       `-- routes/
|           `-- assets.ts
`-- web/
    `-- src/
        |-- routes/
        |   |-- dashboard/AssetDashboardPage.tsx
        |   `-- devices/DeviceDetailPage.tsx
        |-- components/assets/
        |   |-- NeedsAttentionQueue.tsx
        |   |-- DeviceInventoryTable.tsx
        |   `-- RiskSignalList.tsx
        `-- lib/
            |-- queryClient.ts
            `-- assets.ts
```

### Pattern 1: Canonical Device plus Derived Risk Assessment
**What:** Keep raw normalized device state in `Device`, but compute dashboard priority in a separate assessment model or typed service output.

**When to use:** Always. Do not put UI-only priority labels or explanation strings directly on the canonical device record.

**Why:** This keeps connector normalization stable while allowing the dashboard to change scoring rules without reshaping core device identity data.

**Recommended data split:**
- `Device`: identity and current normalized operational fields such as owner, OS, last check-in, encryption status, AV status, disk, support status, and provenance
- `DeviceRiskAssessment` or equivalent read model: `riskScore`, `priorityRank`, `queueBucket`, `signals Json`, `summary`, `calculatedAt`, and `sourceFreshnessState`

**Example:**
```ts
type AssetRiskSignal =
  | "stale_check_in"
  | "missing_encryption"
  | "missing_antivirus"
  | "unsupported_os"
  | "low_disk"
  | "old_device"
  | "data_incomplete";

type DeviceRiskAssessment = {
  deviceId: string;
  riskScore: number;
  queueBucket: "critical" | "high" | "watch";
  calculatedAt: string;
  sourceFreshnessState: "healthy" | "warning" | "stale" | "error";
  signals: Array<{
    code: AssetRiskSignal;
    severity: "critical" | "high" | "medium";
    label: string;
    explanation: string;
  }>;
};
```

### Pattern 2: Server-Side Inventory Query Contract
**What:** Build asset inventory queries in the API with typed query params for filters, sort, and pagination.

**When to use:** For the main inventory grid. Do not make the dashboard fetch raw devices and implement all filtering rules in React.

**Why:** Server-side query construction keeps filter semantics consistent with the queue and detail view, and avoids a later rewrite when the dataset grows.

**Recommended contract:**
- `GET /api/assets/devices`
- Query params: `search`, `ownerId`, `department`, `site`, `riskSignal[]`, `supportStatus`, `encryptionStatus`, `antivirusStatus`, `sortBy`, `sortDirection`, `page`, `pageSize`

**Example:**
```ts
const devices = await prisma.device.findMany({
  where: {
    lastSeenAt: filters.staleAfter
      ? { lt: filters.staleAfter }
      : undefined,
    owner: filters.department
      ? { department: filters.department }
      : undefined,
  },
  orderBy:
    sortBy === "lastSeenAt"
      ? { lastSeenAt: sortDirection }
      : { updatedAt: "desc" },
});
```
// Source: Prisma CRUD and filtering docs

### Pattern 3: Morning-Start Dashboard Composition
**What:** Make the landing page a queue-first screen, not a generic KPI wall.

**When to use:** For the Phase 2 dashboard home.

**Recommended layout order:**
1. `Needs attention` queue with top 5 to 10 devices and why they rank there
2. Data freshness banner if Intune or Entra source data is stale or incomplete
3. Inventory table with saved or default filters for common triage cases
4. Detail route or side panel that shows signal explanations and source freshness

### Anti-Patterns to Avoid
- **Treating missing data as healthy:** `null` encryption, AV, patch, or site values must render as `unknown` or `incomplete`, never as pass or green.
- **Computing risk in React components:** Score devices in the API or a domain service so queue, table badges, and detail explanations stay consistent.
- **Leaking Graph payload shape into the UI:** Normalize connector fields first; the UI should consume internal DTOs only.
- **Burying freshness state:** The queue must degrade visibly when source data is stale, not silently rank stale data as if it were current.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grid filtering, sorting, and column state | Custom table reducer and sort or filter logic | `@tanstack/react-table` | This is solved library complexity and central to the phase requirements |
| Async fetch, cache, retry, and loading state | Per-component `useEffect` fetch logic | `@tanstack/react-query` | Prevents duplicated fetch code and makes stale and refetch behavior predictable |
| Connector freshness math | New dashboard-only freshness rules | Existing Phase 1 connector freshness model | The dashboard should consume one freshness contract across the app |
| Route state for detail views | Conditional modal state in the root app | React Router route-driven detail pages | URL-addressable detail views are simpler to test and easier to preserve on refresh |

**Key insight:** The custom logic this phase actually should own is the typed risk-signal catalog and weighting rules. Everything else around routing, data fetching, and tabular interaction should come from the standard ecosystem or the Phase 1 platform contracts.

## Common Pitfalls

### Pitfall 1: Device data exists, but the dashboard cannot explain it
**What goes wrong:** The queue shows "high risk" without enough signal detail to satisfy `ASST-03`.
**Why it happens:** Teams store only a score, not the contributing signals and severity.
**How to avoid:** Persist or return a typed `signals[]` array with every assessment.
**Warning signs:** Queue cards need ad hoc conditionals or duplicate scoring logic to explain themselves.

### Pitfall 2: Site and department are copied onto devices without source rules
**What goes wrong:** Inventory columns drift from Entra user data and become untrustworthy.
**Why it happens:** Intune device records do not natively provide a reliable "site" column for every scenario.
**How to avoid:** Join from the normalized owner user record and treat site as a derived snapshot from owner metadata such as `officeLocation`; allow `unknown`.
**Warning signs:** Multiple conflicting site fields appear in connector payload mappings.

### Pitfall 3: Patch and AV statuses are modeled as boolean pass or fail
**What goes wrong:** The dashboard cannot distinguish healthy, unknown, stale, unsupported, or connector-limited states.
**Why it happens:** Source coverage differs by platform and endpoint.
**How to avoid:** Use enums such as `healthy`, `warning`, `missing`, `unsupported`, and `unknown`.
**Warning signs:** Devices with missing telemetry show up as green or disappear from filters.

### Pitfall 4: Phase 2 planning assumes Phase 1 APIs already exist
**What goes wrong:** The plan starts from `/api/me`, connector sync data, and protected routes that are still only planned, not implemented.
**Why it happens:** The roadmap and execution plans are ahead of the current codebase.
**How to avoid:** Add explicit Phase 1 dependency checks or prerequisite tasks at the start of the plan.
**Warning signs:** Phase 2 tasks reference files or routes that do not exist in `apps/api/src` or `apps/web/src`.

## Code Examples

Verified patterns from official sources:

### Protected Router Setup
```tsx
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <AssetDashboardPage /> },
      { path: "devices/:deviceId", element: <DeviceDetailPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```
// Source: https://reactrouter.com/home

### Query Client Wiring for Dashboard Data
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```
// Source: https://tanstack.com/query/latest/docs/framework/react

### Fastify Route Testing via Inject
```ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildServer } from "../server.js";

test("GET /api/assets/queue returns ranked devices", async () => {
  const { app } = buildServer();
  const response = await app.inject({
    method: "GET",
    url: "/api/assets/queue",
  });

  assert.equal(response.statusCode, 200);
});
```
// Source: https://fastify.dev/docs/latest/Guides/Getting-Started/

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual spreadsheet exports from Intune and Entra | Normalized snapshot data plus API-driven queue and inventory | Current internal-tool standard | Supports repeatable triage instead of ad hoc exports |
| Raw `fetch` inside route components | Query client plus route-driven UI | React and TanStack ecosystem standard by 2025-2026 | Better loading, error, and stale handling and less duplicated fetch code |
| Monolithic dashboard cards with hidden drill-in logic | Queue-first page plus routeable detail views | Current React Router and dashboard patterns | Easier to explain risk and preserve context on refresh |

**Deprecated or outdated:**
- Treating "not reported" as equivalent to "healthy": outdated and dangerous for endpoint health dashboards.
- Binding UI directly to Microsoft Graph payloads: outdated for multi-module apps because it prevents connector isolation and reuse.

## Open Questions

1. **Should Phase 2 depend on stable Graph only, or allow beta Windows managed device fields?**
   - What we know: Stable `managedDevice` exposes `isEncrypted`, `lastSyncDateTime`, `freeStorageSpaceInBytes`, `partnerReportedThreatState`, and ownership fields. Beta `windowsManagedDevice` exposes richer Windows-only fields such as `securityPatchLevel` and malware counts.
   - What's unclear: Whether the project wants to accept beta Graph dependency to improve Windows patch and AV fidelity.
   - Recommendation: Default to stable Graph with `unknown` support. Treat beta enrichment as a deliberate planner decision, not an accidental dependency.

2. **What exact field should define "site" for Phase 2?**
   - What we know: Entra user has `department` and `officeLocation`, and Intune managed device has user references but not a universal site field.
   - What's unclear: Whether "site" should map directly to `officeLocation`, another user attribute, or a future internal lookup table.
   - Recommendation: Start with owner `officeLocation` as the normalized site snapshot and allow `unknown`.

3. **Will Phase 2 plan around current code reality or ideal roadmap order?**
   - What we know: Current code only contains a placeholder React shell and API health route; auth and connector plans are not implemented.
   - What's unclear: Whether the planner should embed prerequisite implementation or assume Phase 1 completion happens first.
   - Recommendation: Add an explicit dependency gate at the top of the plan and do not write Phase 2 tasks that presume unavailable routes or sync data.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Web and API runtime, tests | yes | 25.8.1 | none |
| npm | Package version verification | yes | 11.11.1 | none |
| pnpm | Workspace install and build commands in repo | no | -- | Install pnpm first; no good workspace-native fallback is present |
| PostgreSQL server on localhost | Prisma-backed local execution | no | -- | Use hosted Postgres or run a containerized Postgres instance |
| PostgreSQL CLI (`psql`) | Manual DB inspection and migrations debugging | no | -- | Use Prisma commands only, or add `psql` later if needed |
| Docker daemon | Fast fallback for local Postgres | yes | 29.3.0 | none |
| Microsoft Graph and Intune tenant access | Real connector-backed asset data | unknown | -- | Mocked or thin sync data from Phase 1 plans, but real dashboard value requires tenant access |

**Missing dependencies with no fallback:**
- `pnpm` on `PATH` for the workspace scripts currently documented in `README.md`

**Missing dependencies with fallback:**
- Local PostgreSQL server: can be replaced by hosted Postgres or a Dockerized Postgres instance
- `psql`: optional if Prisma workflows are sufficient

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | API: `node:test` on current Node runtime; Web: `vitest` plus React Testing Library (add in Wave 0) |
| Config file | API: none currently; Web: none - add `vitest.config.ts` in Wave 0 |
| Quick run command | `pnpm --filter @agentsmith/api test` |
| Full suite command | `pnpm typecheck && pnpm --filter @agentsmith/api test && pnpm --filter @agentsmith/web test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASST-01 | Inventory endpoint returns normalized device fields and owner-derived department and site | API unit and integration | `pnpm --filter @agentsmith/api test -- asset-health.service` | no - Wave 0 |
| ASST-02 | Inventory filters and sorting behave predictably for stale check-in, encryption, AV, disk, age, unsupported OS | API unit plus web component | `pnpm --filter @agentsmith/api test -- asset-health.repository` | no - Wave 0 |
| ASST-03 | Device detail view explains contributing signals and freshness | Web component and integration | `pnpm --filter @agentsmith/web test -- DeviceDetailPage` | no - Wave 0 |
| ASST-04 | Needs-attention queue returns ranked devices in descending priority with explanation | API unit and integration | `pnpm --filter @agentsmith/api test -- asset-health.queue` | no - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @agentsmith/api test`
- **Per wave merge:** `pnpm --filter @agentsmith/api test && pnpm --filter @agentsmith/web test`
- **Phase gate:** `pnpm typecheck && pnpm --filter @agentsmith/api test && pnpm --filter @agentsmith/web test`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/assets/*.test.ts` - asset service, repository, and queue tests
- [ ] `apps/web/vitest.config.ts` - frontend test runner config
- [ ] `apps/web/src/routes/dashboard/AssetDashboardPage.test.tsx` - queue and freshness rendering
- [ ] `apps/web/src/routes/devices/DeviceDetailPage.test.tsx` - signal explanation coverage
- [ ] Frontend test dependencies install in `apps/web`

## Sources

### Primary (HIGH confidence)
- Microsoft Graph managed device resource: https://learn.microsoft.com/en-us/graph/api/resources/intune-devices-manageddevice?view=graph-rest-1.0
- Microsoft Graph list managed devices: https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0
- Microsoft Graph user resource: https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0
- Microsoft Graph beta windows managed device: https://learn.microsoft.com/en-us/graph/api/intune-devices-windowsmanageddevice-get?view=graph-rest-beta
- React Router docs home and API index: https://reactrouter.com/home
- TanStack Query React docs: https://tanstack.com/query/latest/docs/framework/react
- TanStack Table docs: https://tanstack.com/table/latest/docs/guide/tables
- Fastify latest docs: https://fastify.dev/docs/latest/Guides/Getting-Started/
- Fastify v5 migration guide: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/
- Prisma Client query docs: https://www.prisma.io/docs/orm/prisma-client/queries/crud

### Secondary (MEDIUM confidence)
- npm registry package metadata verified via `npm view` on 2026-03-26 for `react`, `react-router-dom`, `@tanstack/react-query`, `@tanstack/react-table`, `fastify`, and `@prisma/client`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - current package versions and library roles were verified from npm registry and official docs
- Architecture: MEDIUM - the queue and read-model recommendation fits the repo and domain, but some Phase 1 dependencies are still unimplemented
- Pitfalls: HIGH - directly supported by the current repo state, roadmap constraints, and source-field limitations in Microsoft Graph

**Research date:** 2026-03-26
**Valid until:** 2026-04-09
