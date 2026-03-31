# Phase 13: Intune Device Sync - Research

**Researched:** 2026-03-31
**Domain:** Microsoft Graph API, Intune managed devices, Prisma schema migration, React/TanStack Table UI
**Confidence:** HIGH (all critical decisions verified against official docs and live code)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Use `@microsoft/microsoft-graph-client` (not raw fetch). Credentials sourced from the `IntegrationCredential` table (key `"intune"`) decrypted via `credential-crypto.ts` using the runtime `systemKey`. The Intune provider receives `systemKey` + `prisma.integrationCredential` at call time — consistent with Phase 12's injectable dependency pattern.

**D-02:** Graph scopes: `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All`.

**D-03:** `graphPageAll<T>()` helper wraps Graph paging (`@odata.nextLink`) into a single async generator or array — must be built before any device or policy mapping. Prevents silent truncation at the default 100-item page size.

**D-04:** 429 handling: inspect `Retry-After` response header; if present, sleep that duration before retry. If absent, use exponential backoff. Max 3 retries before marking sync as `failure`.

**D-05:** Two new Prisma models:
  - `DeviceCompliancePolicy` — `id`, `sourceSystem`, `sourceId` (unique), `name`, `platform`, `createdAt`, `updatedAt`
  - `DeviceComplianceAssignment` — `id`, `deviceId` (FK Device), `policyId` (FK DeviceCompliancePolicy), `status`, `lastReportedAt DateTime?`, `createdAt`, `updatedAt`. Unique on `[deviceId, policyId]`.

**D-06:** Compliance policies synced as part of the same Intune sync run. Policies upserted first, then assignments per device.

**D-07:** Upsert on `@@unique([sourceSystem, sourceId])` where `sourceSystem = "intune"` and `sourceId = intuneDevice.id`.

**D-08:** Device fields mapped from Graph `managedDevice`:
  - `name` ← `deviceName`
  - `serialNumber` ← `serialNumber`
  - `operatingSystem` ← `operatingSystem` + `osVersion` concatenated
  - `complianceState` ← `complianceState`
  - `encryptionStatus` ← derived from `isEncrypted` boolean → `healthy` | `missing`
  - `lastCheckInAt` ← `lastSyncDateTime`
  - `lastSeenAt` ← `lastSyncDateTime`
  - `deviceAgeDays` ← derived from `enrolledDateTime`

**D-09:** `antivirusStatus`, `patchStatus`, `diskFreePercent`, `supportStatus` NOT populated by Intune managed device data — left null.

**D-10:** Best-effort user-owner linking: look up `User` where `sourceSystem = "entra"` AND `sourceId = intuneDevice.userId`. If found, set `Device.ownerId`. No extra Graph calls.

**D-11:** Phase 13 does NOT recalculate `DeviceRiskAssessment`. Data-only. `isSeededMode()` returns `false` once real devices exist; queue and dashboard empty until future phase.

**D-12:** `DeviceInventoryPage` inventory row: compliance badge column showing `complianceState` as colored pill. Uses `toneForState` / badge pattern from `ConnectorStatusPage`.

**D-13:** Device detail view: always-visible "Compliance Policies" table below existing detail fields. One row per `DeviceComplianceAssignment`. Empty state: "No compliance policies assigned".

**D-14:** `ConnectorStatusPage`: Intune connector card gets "Sync now" button. Calls `POST /api/connectors/intune/sync`. Loading state during sync; card refreshes on completion. Error shown inline.

**D-15:** `DeviceInventoryPage`: Read-only freshness bar at top (below `PageTitle`) showing last sync time, device count, stale/error badge. Freshness data from `GET /api/connectors` (existing endpoint).

**D-16:** `POST /api/connectors/intune/sync` — authenticated, triggers `runConnectorSync("intune", ...)` using existing orchestration in `runConnectorSync.ts`. Returns `{ ok: boolean, recordsSeen: number, recordsNormalized: number }`.

### Claude's Discretion

- Exact `graphPageAll()` implementation signature (generator vs. collected array)
- HNSW/pagination batch size tuning for Graph requests
- Exact `DeviceCompliancePolicy.platform` value mapping from Graph API response
- Loading/error state wording on sync trigger button
- Migration file naming and ordering

### Deferred Ideas (OUT OF SCOPE)

- `DeviceRiskAssessment` recalculation after sync
- `antivirusStatus`, `patchStatus`, `diskFreePercent` mapping from Intune compliance policy results
- Intune app inventory per device (`detectedApps`) — deferred to v1.3
- Automatic sync scheduling (cron/timer) — v1.3
- Real-time sync progress (WebSocket/SSE)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYNC-01 | Operator can see live Intune device inventory with device name, compliance state, OS/version, last check-in, and encryption status | D-07/D-08 device upsert + compliance badge (D-12) + freshness bar (D-15) |
| SYNC-02 | Operator can see per-device compliance policy assignment and pass/fail state | D-05/D-06 new models + `deviceCompliancePolicyStates` sub-resource (Graph v1.0) + D-13 device detail table |
| SYNC-03 | Operator can see when Intune data was last synced and whether it is stale or failed | D-15 freshness bar reading from existing `GET /api/connectors` + D-14 manual sync trigger |
</phase_requirements>

---

## Summary

Phase 13 replaces the `runIntuneConnectorSync()` stub with a real Microsoft Graph API pull. The existing infrastructure is mature: `@azure/identity` is already installed, `credential-crypto.ts` and `system-key.ts` are complete, `runConnectorSync.ts` orchestration handles audit events and SyncRun records, and the `ConnectorRegistryEntry` pattern is the integration point for the new provider.

The biggest technical challenge is the `ConnectorRegistryEntry.runSync` signature — it is currently a zero-arg closure `() => Promise<ConnectorSyncOutput>`, but the real implementation needs `systemKey` and `prisma` injected. The right solution is to convert the `intune` registry entry to a factory function that closes over these dependencies at startup, consistent with Phase 12's injectable dependency pattern (without changing the `runSync` type on all existing callers).

The second challenge is the compliance policy table (SYNC-02). The correct Graph endpoint is `GET /deviceManagement/managedDevices/{id}/deviceCompliancePolicyStates` (v1.0 confirmed via PowerShell cmdlet documentation). This returns per-device policy compliance state including policy `displayName`, `platformType`, and `state` (`compliant` | `noncompliant` | `error` etc.). This is distinct from `deviceCompliancePolicies` which is the tenant-level policy catalog.

**Primary recommendation:** Build in this order: (1) `graphPageAll()` helper + 429 retry logic, (2) `DeviceCompliancePolicy` + `DeviceComplianceAssignment` Prisma migration, (3) real `intune.provider.ts` with device + compliance sync, (4) connector registry factory injection, (5) `POST /api/connectors/intune/sync` route, (6) new compliance API endpoint for device detail, (7) UI changes (freshness bar, compliance badge column, compliance policies table, sync button).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@microsoft/microsoft-graph-client` | 3.0.7 (latest) | Graph API HTTP client with middleware chain | Official MS SDK; handles auth token injection, middleware, response parsing |
| `@azure/identity` | 4.13.1 (already installed) | `ClientSecretCredential` for app-only auth | Already in `apps/api` — used by Phase 12 test-connection probe |
| `@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials` | (bundled) | `TokenCredentialAuthenticationProvider` — bridges azure/identity credential to graph client | Required subpath export from the graph client package |

### Supporting (already present, no install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `prisma` / `@prisma/client` | 6.6.0 | ORM for `DeviceCompliancePolicy`, `DeviceComplianceAssignment`, `Device` upserts | All DB writes in provider |
| `node:crypto` | built-in | Used by `credential-crypto.ts` for `decryptCredential` | Already complete — just call it |

**Installation (only new package):**
```bash
cd apps/api && npx pnpm add @microsoft/microsoft-graph-client
```

**Version verification (confirmed 2026-03-31):**
```
@microsoft/microsoft-graph-client: 3.0.7 (published >1 year ago — stable)
@azure/identity: 4.13.1 (already installed)
```

### Graph Client Initialization Pattern
```typescript
// Source: https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/docs/TokenCredentialAuthenticationProvider.md
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"],
});
const graphClient = Client.initWithMiddleware({ authProvider });
```

Note: For ESM (this project uses `.js` extensions), use the `/index.js` suffix on the subpath import.

---

## Architecture Patterns

### Recommended File Structure Changes
```
apps/api/src/
├── modules/connectors/
│   ├── providers/
│   │   ├── intune.provider.ts          # REPLACE stub — real Graph implementation
│   │   └── entra.provider.ts           # unchanged
│   └── connector.registry.ts          # MODIFY — factory injection for intune
├── jobs/
│   └── runConnectorSync.ts             # unchanged
├── routes/
│   ├── connectors.ts                   # MODIFY — add POST /api/connectors/intune/sync
│   └── assets.ts                       # MODIFY — add compliance assignments endpoint
prisma/
├── schema.prisma                       # MODIFY — DeviceCompliancePolicy + DeviceComplianceAssignment
└── migrations/
    └── 20260331_0001_device_compliance_models/
        └── migration.sql               # new manual SQL migration
apps/web/src/
├── routes/assets/
│   ├── DeviceInventoryPage.tsx         # MODIFY — freshness bar + compliance badge column
│   └── DeviceDetailPage.tsx            # MODIFY — compliance policies table
├── routes/connectors/
│   └── ConnectorStatusPage.tsx         # MODIFY — sync now button on intune card
└── components/assets/
    └── DeviceInventoryTable.tsx        # MODIFY — add complianceState column
```

### Pattern 1: graphPageAll() Helper
**What:** Async function that follows `@odata.nextLink` pages until exhausted, collecting all items.
**When to use:** Any Graph endpoint that returns paged collections — mandatory before device or policy listing.

```typescript
// Recommended signature (collected array, not generator — simpler for sync output counting)
async function graphPageAll<T>(
  graphClient: Client,
  initialPath: string,
): Promise<T[]> {
  const results: T[] = [];
  let response = await graphClient.api(initialPath).get() as { value: T[]; "@odata.nextLink"?: string };
  results.push(...response.value);
  while (response["@odata.nextLink"]) {
    response = await graphClient.api(response["@odata.nextLink"]).get() as { value: T[]; "@odata.nextLink"?: string };
    results.push(...response.value);
  }
  return results;
}
```

**Key fact:** `@odata.nextLink` contains the full absolute URL including `$skiptoken`. Pass it as-is to `graphClient.api()`. Do not extract the token manually.

### Pattern 2: 429 Retry with Retry-After
**What:** Wrapper that catches HTTP 429, reads `Retry-After` header (seconds), sleeps, retries. Falls back to exponential backoff if header absent. Max 3 retries.

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status !== 429 || attempt >= maxRetries) throw err;
      const retryAfter = (err as { responseHeaders?: Record<string, string> }).responseHeaders?.["retry-after"];
      const delaySec = retryAfter ? parseInt(retryAfter, 10) : Math.pow(2, attempt) * 2;
      await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
      attempt++;
    }
  }
}
```

**Intune-specific pitfall:** Intune `deviceManagement` endpoints frequently omit `Retry-After`. The exponential fallback is essential. Source: [MSEndpointMgr 2025 throttling guide](https://msendpointmgr.com/2025/11/08/graph-api-rate-limiting-in-intune/).

### Pattern 3: ConnectorRegistry Factory Injection
**What:** The `ConnectorRegistryEntry.runSync` is a zero-arg closure. To inject `systemKey` + `prisma` without changing the type signature, the registry exports a factory function instead of a static array.

**Current issue:** `connector.registry.ts` exports `connectorRegistry: ConnectorRegistryEntry[]` with `runSync: runIntuneConnectorSync` (zero args). `runConnectorSync.ts` calls `registryEntry.runSync()` with no args.

**Recommended approach (minimal change):**
- Add a new type `ConnectorRegistryDependencies = { systemKey: Buffer; prisma: PrismaClient }`
- Export `buildConnectorRegistry(deps: ConnectorRegistryDependencies): ConnectorRegistryEntry[]`
- The `intune` entry's `runSync` closes over deps. The `entra` entry remains unchanged.
- `buildServer()` calls `buildConnectorRegistry({ systemKey, prisma })` on startup.
- `runConnectorSync.ts` receives the pre-built registry (or calls `getConnectorRegistryEntry` from it).

**Alternative (simpler):** Change `ConnectorRegistryEntry.runSync` to accept an optional `deps` param — but this pollutes the type for entra which needs no deps. The factory approach is cleaner.

### Pattern 4: Compliance Policy States — Correct Graph Endpoint
**What:** Per-device compliance policy state is fetched from `GET /deviceManagement/managedDevices/{deviceId}/deviceCompliancePolicyStates` (v1.0).

**Response shape:**
```json
{
  "value": [
    {
      "id": "policy-guid",
      "displayName": "Windows 10 Baseline",
      "platformType": "windows10AndLater",
      "state": "compliant",
      "settingCount": 12,
      "version": 1
    }
  ]
}
```

**States:** `unknown`, `notApplicable`, `compliant`, `remediated`, `nonCompliant`, `error`, `conflict`, `notAssigned`

**How to store:** `DeviceComplianceAssignment.status` = the `state` string value. `DeviceComplianceAssignment.policyId` = FK to `DeviceCompliancePolicy.sourceId` = the policy `id` from this response. The `DeviceCompliancePolicy.name` = `displayName`, `platform` = `platformType`.

**Important:** This is different from `deviceCompliancePolicies` (tenant-level catalog) which has a different URL: `GET /deviceManagement/deviceCompliancePolicies`. For this phase, the per-device states endpoint is the right source because it gives both policy identity AND status in one call per device.

**Trade-off:** One Graph request per device for compliance states = N+1 problem on large fleets. Mitigate by batching device IDs if supported, or accepting the latency since this is a manual trigger path (not a user-facing HTTP request path). The `graphPageAll()` wrapper handles pagination within each call.

### Pattern 5: Device-to-User Linking (No Graph Calls)
**What:** After upserting a device, look up `User` by `sourceSystem = "entra"` AND `sourceId = device.userId` (the Intune userId is the Entra object ID of the primary user).
**When to use:** Only during sync. Does not fail if no match found — `Device.ownerId` stays null.

```typescript
const user = await prisma.user.findFirst({
  where: { sourceSystem: "entra", sourceId: intuneDevice.userId ?? "" },
  select: { id: true },
});
const ownerId = user?.id ?? null;
```

### Anti-Patterns to Avoid
- **Fetching without pagination:** Always use `graphPageAll()`. The default page size is 100 items. A fleet of 200 devices would silently return only the first 100.
- **Using beta endpoint for managed devices:** All fields needed (deviceName, serialNumber, complianceState, isEncrypted, etc.) are available on `graph.microsoft.com/v1.0`. No reason to use beta.
- **Extracting `$skiptoken` manually:** Use the full `@odata.nextLink` URL unchanged — Graph tokens encode state that breaks if reconstructed.
- **Calling Graph in the HTTP request path:** Sync is triggered by `POST /api/connectors/intune/sync`, which runs the sync inline (acceptable for v1.2 manual trigger). For v1.3, move to a queue. Do not call Graph from `GET` asset endpoints.
- **seededModeCache:** The `AssetHealthRepository` caches `isSeededMode()` result per instance. If sync writes devices and the repo instance is the same, the cache won't update. This is acceptable — the operator triggers a page refresh after sync completes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph auth token management | Custom OAuth2 flow | `@azure/identity` `ClientSecretCredential` | Token caching, retry, rotation already handled |
| Graph HTTP client | Raw `fetch` with header wiring | `@microsoft/microsoft-graph-client` `Client` | Middleware chain, auth injection, response parsing |
| Pagination logic | Per-endpoint custom cursor | `graphPageAll()` generic helper | Uniform `@odata.nextLink` pattern across all Graph list endpoints |
| 429 retry | Sleep-poll loop | `withRetry()` with `Retry-After` inspection | Header parsing, fallback exponent already specified in D-04 |
| Compliance state per device | Cross-referencing policy catalog manually | `deviceCompliancePolicyStates` sub-resource | Returns both policy name and device-specific pass/fail in one call |

**Key insight:** The Microsoft Graph SDK handles token caching automatically — do not store the access token manually. Every `graphClient.api().get()` call will use the cached token or refresh it transparently via `TokenCredentialAuthenticationProvider`.

---

## Runtime State Inventory

> Phase 13 is not a rename/refactor phase — this section documents what runtime state exists that the sync will overwrite/initialize.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `Device` table currently contains only seeded mock data (128 rows from stub). `DeviceCompliancePolicy` + `DeviceComplianceAssignment` tables do not exist yet. | New migration creates tables. On first real sync, real devices upserted on `[sourceSystem, sourceId]` unique key — mock rows have `sourceSystem = "intune"` and `sourceId` = GUID that won't match real data, so mock rows may coexist until manually cleared or until a cleanup step is added. |
| Live service config | Phase 12 stored `IntegrationCredential` with key `"intune"` in production DB. Decrypted at sync time using `systemKey`. | No action — just use existing `decryptCredential` flow. |
| OS-registered state | None relevant to this phase. | None |
| Secrets/env vars | `SESSION_SECRET` env var used to unwrap `systemKey`. Intune credentials stored as `encryptedValue/iv/authTag` in `IntegrationCredential` table. | No rename; code reads these at runtime. |
| Build artifacts | `@microsoft/microsoft-graph-client` not yet in `node_modules` for `apps/api`. | `pnpm add` in Wave 0. |

**Mock data coexistence note:** The seeded `Device` rows use `sourceSystem = "intune"` and source IDs like `"agentsmith-1"` (cuid-format strings), not real Intune GUIDs. Real devices will upsert on their actual GUIDs and won't overwrite mock rows. The `isSeededMode()` check uses `device.count() > 0` — once real devices are inserted, seeded mode is OFF and the inventory shows ALL rows (real + mock). The implementation should account for this: either the sync should delete non-real rows after successful sync, or the operators should be warned. **Recommended approach:** Add a `WHERE sourceSystem = 'intune' AND sourceId NOT IN (syncedSourceIds)` delete step at the end of a successful sync run to remove stale rows. This is not in CONTEXT.md decisions but is necessary for correctness — flag as Claude's discretion.

---

## Common Pitfalls

### Pitfall 1: Graph module import path for `TokenCredentialAuthenticationProvider`
**What goes wrong:** `Cannot find module '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'` — missing `/index.js` suffix for ESM.
**Why it happens:** The graph client uses deep subpath exports. In an ESM project with `.js` extensions, the subpath must include the file extension.
**How to avoid:** Import as `@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js`
**Warning signs:** TypeScript resolution error or runtime module-not-found at startup.

### Pitfall 2: `isEncrypted` field vs. `AssetSignalStatus` enum mismatch
**What goes wrong:** Graph returns `isEncrypted: boolean` but `Device.encryptionStatus` is `AssetSignalStatus?` (Prisma enum: `healthy | warning | missing | unsupported | unknown`).
**Why it happens:** Direct boolean-to-string cast produces `"true"` not `"healthy"`.
**How to avoid:** Map explicitly: `isEncrypted === true ? "healthy" : "missing"`. Leave `null` if `isEncrypted` is not present in the response.
**Warning signs:** Prisma upsert throwing constraint violation on `encryptionStatus` field.

### Pitfall 3: Zero-arg `runSync` signature in connector registry
**What goes wrong:** `runConnectorSync.ts` calls `registryEntry.runSync()` with no arguments. The new Intune provider needs `systemKey` + `prisma`. If you change the provider function signature to accept args, TypeScript will flag the zero-arg call site.
**Why it happens:** Current registry type is `runSync: () => Promise<ConnectorSyncOutput>`.
**How to avoid:** Use the factory pattern — `buildConnectorRegistry(deps)` returns a registry where the Intune entry's `runSync` closes over deps. The type signature stays `() => Promise<ConnectorSyncOutput>`.
**Warning signs:** TypeScript error: "Expected 0 arguments, but got 1" or missing deps at runtime.

### Pitfall 4: N+1 Graph calls for compliance policy states
**What goes wrong:** Fetching `deviceCompliancePolicyStates` for 500 devices = 500 sequential Graph requests. At ~200ms per call, that's ~100 seconds.
**Why it happens:** No batch endpoint for per-device compliance states exists in v1.0.
**How to avoid:** This is acceptable for manual sync in v1.2. However, add concurrency using `Promise.all()` in batches of 10-20 devices to reduce wall time. Full sequential loop would be too slow for large fleets.
**Warning signs:** Sync duration > 60s on a fleet of 100+ devices; Intune throttling (429) appearing during compliance fetch phase.

### Pitfall 5: Mock rows coexist with real data after first sync
**What goes wrong:** After the first real sync, `device.count()` is no longer 0, so `isSeededMode()` returns `false`. The inventory now shows both real Intune devices AND the old seeded mock rows (which have fake GUIDs).
**Why it happens:** Upsert only creates/updates rows with matching `[sourceSystem, sourceId]` — it does not delete rows that were not in the sync response.
**How to avoid:** At the end of a successful sync, delete `Device` rows where `sourceSystem = "intune"` AND `sourceId` is NOT in the set of GUIDs returned from Graph. This is a post-sync cleanup step.
**Warning signs:** Operator sees "AGENTSMITH-HQ-01" (seeded mock name) mixed in with real devices.

### Pitfall 6: Compliance assignment unique constraint
**What goes wrong:** If a device has the same policy assigned multiple times (shouldn't happen but Graph can return duplicates in paginated edge cases), the `@@unique([deviceId, policyId])` constraint on `DeviceComplianceAssignment` will throw on the second upsert.
**Why it happens:** Prisma `upsert` uses the unique index as the `where` clause; duplicate Graph entries would attempt two creates with the same key.
**How to avoid:** Deduplicate policy states by `policyId` before upserting. Use `Map<string, PolicyState>` keyed by policy `id` during the mapping step.

### Pitfall 7: `seededModeCache` in `AssetHealthRepository`
**What goes wrong:** The repository instance caches `isSeededMode()` as `true` at startup. After sync writes real devices, the same instance still returns `true` until the Node process restarts or a new request creates a new instance.
**Why it happens:** `private seededModeCache: boolean | null = null` in `AssetHealthRepository`. Once set to `true`, it never re-queries.
**How to avoid:** Do not try to fix `AssetHealthRepository` in this phase. The operator is expected to trigger a page refresh after sync. Document this behavior as a known limitation. Clearing the cache (e.g., making `seededModeCache` a module-level singleton rather than instance variable) is a Phase 14+ concern.

---

## Code Examples

### Initialize Graph Client from Stored Credentials
```typescript
// Source: integrations.ts (Phase 12) uses ClientSecretCredential identically for test-connection
import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import { decryptCredential } from "../../lib/credential-crypto.js";
import type { PrismaClient } from "@prisma/client";

async function buildGraphClient(prisma: PrismaClient, systemKey: Buffer): Promise<Client> {
  const row = await prisma.integrationCredential.findUnique({ where: { key: "intune" } });
  if (!row) throw new Error("Intune credentials not configured");
  const json = JSON.parse(decryptCredential(systemKey, row.encryptedValue, row.iv, row.authTag)) as {
    tenantId: string; clientId: string; clientSecret: string;
  };
  const credential = new ClientSecretCredential(json.tenantId, json.clientId, json.clientSecret);
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"],
  });
  return Client.initWithMiddleware({ authProvider });
}
```

### graphPageAll() Recommended Implementation
```typescript
// Claude's discretion: collected array (not generator) for simpler count reporting
type GraphPagedResponse<T> = { value: T[]; "@odata.nextLink"?: string };

async function graphPageAll<T>(client: Client, path: string): Promise<T[]> {
  const results: T[] = [];
  let current: GraphPagedResponse<T> = await client.api(path).get();
  results.push(...(current.value ?? []));
  while (current["@odata.nextLink"]) {
    // Pass the full absolute URL — do not decompose it
    current = await client.api(current["@odata.nextLink"]).get();
    results.push(...(current.value ?? []));
  }
  return results;
}
```

### Prisma Migration SQL (manual, following project pattern)
```sql
-- Migration: 20260331_0001_device_compliance_models
-- DeviceCompliancePolicy: tenant-level policy catalog from Intune
CREATE TABLE "DeviceCompliancePolicy" (
  "id"           TEXT NOT NULL,
  "sourceSystem" TEXT NOT NULL,
  "sourceId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "platform"     TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceCompliancePolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceCompliancePolicy_sourceSystem_sourceId_key"
  ON "DeviceCompliancePolicy"("sourceSystem", "sourceId");

-- DeviceComplianceAssignment: per-device policy state
CREATE TABLE "DeviceComplianceAssignment" (
  "id"             TEXT NOT NULL,
  "deviceId"       TEXT NOT NULL,
  "policyId"       TEXT NOT NULL,
  "status"         TEXT NOT NULL,
  "lastReportedAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeviceComplianceAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeviceComplianceAssignment_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeviceComplianceAssignment_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "DeviceCompliancePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DeviceComplianceAssignment_deviceId_policyId_key"
  ON "DeviceComplianceAssignment"("deviceId", "policyId");
CREATE INDEX "DeviceComplianceAssignment_deviceId_idx"
  ON "DeviceComplianceAssignment"("deviceId");
```

### New API Route — POST /api/connectors/intune/sync
```typescript
// Follow bootstrap.ts narrow-dependency injection pattern
app.post("/api/connectors/intune/sync", { preHandler: requireAuth }, async (_, reply) => {
  try {
    const result = await runConnectorSync("intune", { prisma, auditService });
    // Look up last sync run for recordsSeen/recordsNormalized
    reply.code(200);
    return { ok: true, ...result };
  } catch (error) {
    reply.code(500);
    return { ok: false, error: error instanceof Error ? error.message : "Sync failed" };
  }
});
```

### Compliance Badge (follow toneForState from ConnectorStatusPage)
```typescript
// Source: ConnectorStatusPage.tsx toneForState pattern
function toneForComplianceState(state: string | null) {
  switch (state) {
    case "compliant": return { background: "#dcfce7", color: "#166534" };
    case "noncompliant": return { background: "#fecaca", color: "#7f1d1d" };
    case "error": case "conflict": return { background: "#fef3c7", color: "#92400e" };
    default: return { background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" };
  }
}
```

### Freshness Bar (reads from existing GET /api/connectors)
```typescript
// ConnectorCard already returned by GET /api/connectors — no new endpoint needed
// DeviceInventoryPage fetches connectors, finds id === "intune", renders freshness bar
const { data: connectors } = useQuery({ queryKey: ["connectors"], queryFn: () => apiGet<ConnectorCard[]>("/api/connectors") });
const intuneConnector = connectors?.find((c) => c.id === "intune");
```

### Device Field Mapping — Key Conversions
```typescript
// D-08 mappings from Graph managedDevice to Prisma Device fields
const encryptionStatus = device.isEncrypted === true ? "healthy"
  : device.isEncrypted === false ? "missing"
  : null;

const operatingSystem = [device.operatingSystem, device.osVersion]
  .filter(Boolean).join(" ") || null;

const deviceAgeDays = device.enrolledDateTime
  ? Math.floor((Date.now() - new Date(device.enrolledDateTime).getTime()) / 86_400_000)
  : null;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `adal-node` for Azure auth | `@azure/identity` `ClientSecretCredential` | 2021 (ADAL deprecated) | `@azure/identity` is already installed; use it |
| `microsoft-graph-client` v1/v2 manual auth | `TokenCredentialAuthenticationProvider` subpath export | v3.0 (2022) | Import path changed; must use `/authProviders/azureTokenCredentials/index.js` |
| Beta Graph endpoint for device compliance | v1.0 `/deviceManagement/managedDevices/{id}/deviceCompliancePolicyStates` | Available in v1.0 since 2019 | Use v1.0, not beta |

**Deprecated/outdated:**
- `isomorphic-fetch` polyfill: Required in older `@microsoft/microsoft-graph-client` versions for Node.js. Not needed in Node 22+ (native `fetch` available) and `microsoft-graph-client` v3.0.7.

---

## Open Questions

1. **Should the sync delete stale mock rows?**
   - What we know: Mock rows have `sourceSystem = "intune"` and fake source IDs. After real sync, they coexist with real data and appear in the inventory.
   - What's unclear: Whether the operator wants to preserve them for reference or delete them immediately on first real sync.
   - Recommendation: Add a post-sync delete step (`DELETE WHERE sourceSystem = 'intune' AND sourceId NOT IN (syncedIds)`). This is the correct data hygiene behavior. Treat as Claude's discretion (already flagged above).

2. **Concurrency model for per-device compliance calls**
   - What we know: `deviceCompliancePolicyStates` requires one call per device. 500 devices = 500 calls at ~200ms each = ~100s sequential.
   - What's unclear: Whether Intune throttles burst concurrent calls more aggressively than sequential calls.
   - Recommendation: Batch in groups of 10 using `Promise.all()`. Apply the same `withRetry()` wrapper. This brings 500-device sync to ~10s.

3. **`DeviceComplianceAssignment.policyId` FK type**
   - What we know: D-05 specifies `policyId` FK → `DeviceCompliancePolicy`. The `deviceCompliancePolicyStates` endpoint returns a policy `id` (GUID). The `DeviceCompliancePolicy.sourceId` stores that GUID.
   - What's unclear: The FK should point to `DeviceCompliancePolicy.id` (our internal cuid) not `sourceId`. This means we must first upsert policies to get their internal IDs, then use those IDs for assignments.
   - Recommendation: Upsert policies first (D-06), collect `{ sourceId → internalId }` map, then upsert assignments using the internal IDs. The migration should use `DeviceCompliancePolicy.id` as the FK target (the primary key, not sourceId).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API runtime | Yes | v25.8.1 | — |
| pnpm | Package install | Yes | 10.11.1 | — |
| `@azure/identity` | Graph auth | Yes (installed) | 4.13.1 | — |
| `@microsoft/microsoft-graph-client` | Graph API client | Not installed | 3.0.7 available | Must install |
| PostgreSQL (live) | Prisma migration | Not verified | — | Manual SQL files used (project pattern) |
| Microsoft Graph API | Device sync | External service | v1.0 | Cannot run sync without live Intune credentials |

**Missing dependencies with no fallback:**
- `@microsoft/microsoft-graph-client` — must be installed before Wave 1 implementation. Add to Wave 0.

**Missing dependencies with fallback:**
- Microsoft Graph API / live Intune credentials — unit tests mock the provider; integration tests not possible without real credentials. Tests must use injected mocks (consistent with existing test patterns).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (API) | Node.js built-in `node:test` + `node:assert` |
| Framework (Web unit) | Vitest 4.1.2 |
| Framework (E2E) | Playwright 1.58.2 |
| Config file | `apps/api/package.json` `"test"` script; `vitest.config.ts` in `apps/web`; `playwright.config.ts` |
| Quick run (API) | `npx pnpm --filter @agentsmith/api test` |
| Quick run (Web) | `npx pnpm --filter @agentsmith/web test` |
| E2E run | `npx pnpm --filter @agentsmith/web test:e2e` |
| Full suite | `npx pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYNC-01 | Real devices upserted from Graph, visible in inventory with compliance badge | API unit + E2E | `npx pnpm --filter @agentsmith/api test` | Partial — `asset-health.service.test.ts` exists; new intune provider test needed |
| SYNC-01 | Compliance badge renders in DeviceInventoryTable | E2E | `npx pnpm --filter @agentsmith/web test:e2e` | `tests/inventory-and-detail.spec.ts` exists — extend |
| SYNC-01 | Freshness bar renders on DeviceInventoryPage | E2E | `npx pnpm --filter @agentsmith/web test:e2e` | `tests/inventory-and-detail.spec.ts` — extend |
| SYNC-02 | Compliance policies table renders on DeviceDetailPage | E2E | `npx pnpm --filter @agentsmith/web test:e2e` | `tests/inventory-and-detail.spec.ts` — extend |
| SYNC-03 | POST /api/connectors/intune/sync returns ok:true | API unit | `npx pnpm --filter @agentsmith/api test` | `routes/connectors.test.ts` — new file needed |
| SYNC-03 | Sync now button calls POST and refreshes card | E2E | `npx pnpm --filter @agentsmith/web test:e2e` | `tests/app-smoke.spec.ts` or new spec — extend |

### Sampling Rate
- **Per task commit:** `npx pnpm --filter @agentsmith/api test` (API) or `npx pnpm --filter @agentsmith/web test` (Web)
- **Per wave merge:** `npx pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/connectors/providers/intune.provider.test.ts` — covers SYNC-01 provider output shape and field mapping
- [ ] `apps/api/src/routes/connectors.test.ts` — covers SYNC-03 POST route (authenticated, returns ok/recordsSeen)
- [ ] `pnpm add @microsoft/microsoft-graph-client` — install in `apps/api`
- [ ] Prisma migration SQL file for `DeviceCompliancePolicy` + `DeviceComplianceAssignment`
- [ ] `mockApi.ts` updates: add `GET /api/assets/devices/:id/compliance-policies` mock + `POST /api/connectors/intune/sync` mock

---

## Sources

### Primary (HIGH confidence)
- Official Microsoft Graph v1.0 docs (fetched 2026-03-31) — `managedDevice` resource type, all fields confirmed including `isEncrypted`, `complianceState`, `lastSyncDateTime`, `enrolledDateTime`, `userId`
- Official Microsoft Graph v1.0 docs — `deviceCompliancePolicyStates` sub-resource confirmed available in v1.0 (via PowerShell cmdlet docs referencing v1.0)
- `apps/api` source code (read directly) — `connector.registry.ts`, `runConnectorSync.ts`, `connectors.ts`, `integrations.ts`, `credential-crypto.ts`, `system-key.ts`
- `prisma/schema.prisma` (read directly) — current `Device` model fields, `IntegrationCredential`, existing migration pattern
- `apps/web` source code (read directly) — `ConnectorStatusPage.tsx`, `DeviceInventoryPage.tsx`, `DeviceDetailPage.tsx`, `DeviceInventoryTable.tsx`, `mockApi.ts`
- npm registry: `@microsoft/microsoft-graph-client@3.0.7` latest confirmed 2026-03-31

### Secondary (MEDIUM confidence)
- [msgraph-sdk-javascript TokenCredentialAuthenticationProvider docs](https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/docs/TokenCredentialAuthenticationProvider.md) — ESM import pattern
- [Microsoft Graph throttling guidance](https://learn.microsoft.com/en-us/graph/throttling) — 429 / Retry-After behavior
- [MSEndpointMgr Intune throttling guide 2025](https://msendpointmgr.com/2025/11/08/graph-api-rate-limiting-in-intune/) — Intune endpoints often omit Retry-After

### Tertiary (LOW confidence — verify at implementation)
- `deviceCompliancePolicyStates` response shape (inferred from PowerShell parameter names + community examples) — exact field names (`displayName`, `platformType`, `state`) should be verified against a live tenant during implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@microsoft/microsoft-graph-client` version verified from registry; `@azure/identity` already installed and tested
- Architecture patterns: HIGH — connector registry, runConnectorSync, credential flow read directly from source
- Graph API field mapping: HIGH for v1.0 managedDevice fields (read from official docs); MEDIUM for compliance policy states response shape (inferred from PowerShell docs, not a live response)
- Pitfalls: HIGH — derived from reading actual code, known Intune throttling behavior, TypeScript type constraints

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Graph v1.0 API is stable; library versions may update but 3.0.7 is current)
