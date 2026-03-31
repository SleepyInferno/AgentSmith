---
phase: 13-intune-device-sync
plan: "01"
subsystem: api/connectors
tags: [intune, graph-api, prisma, sync, retry, pagination]
dependency_graph:
  requires:
    - "Phase 12: credential-crypto.ts, system-key.ts, IntegrationCredential table"
    - "Phase 10: Prisma schema foundation, pgvector"
  provides:
    - "graphPageAll pagination helper"
    - "withRetry 429 backoff helper"
    - "buildGraphClient factory"
    - "DeviceCompliancePolicy + DeviceComplianceAssignment Prisma models"
    - "Real createIntuneProvider replacing stub"
    - "POST /api/connectors/intune/sync authenticated route"
  affects:
    - "apps/api/src/server.ts (initConnectorRegistry called at startup)"
    - "apps/api/src/modules/connectors/connector.registry.ts (factory injection)"
tech_stack:
  added:
    - "@microsoft/microsoft-graph-client ^3.0.7"
  patterns:
    - "Factory injection pattern for testable Graph client deps"
    - "TDD (node:test framework, not vitest)"
    - "graphPageAll: @odata.nextLink pagination loop"
    - "withRetry: 429 + Retry-After + exponential backoff + delayMultiplier param for test speed"
key_files:
  created:
    - "prisma/migrations/20260331_0001_device_compliance_models/migration.sql"
    - "apps/api/src/modules/connectors/graph-helpers.ts"
    - "apps/api/src/modules/connectors/__tests__/graph-helpers.test.ts"
    - "apps/api/src/modules/connectors/__tests__/intune.provider.test.ts"
    - "apps/api/src/routes/__tests__/connectors.sync.test.ts"
  modified:
    - "prisma/schema.prisma (DeviceCompliancePolicy, DeviceComplianceAssignment, Device.complianceAssignments)"
    - "apps/api/src/modules/connectors/providers/intune.provider.ts (full replacement)"
    - "apps/api/src/modules/connectors/connector.registry.ts (initConnectorRegistry, buildConnectorRegistry)"
    - "apps/api/src/routes/connectors.ts (POST /api/connectors/intune/sync)"
    - "apps/api/src/server.ts (initConnectorRegistry + runConnectorSync wiring)"
decisions:
  - "withRetry accepts optional delayMultiplier parameter (default 1) so tests can pass 0 for instant retries without fake timers — avoids node:test timer complexity"
  - "IntuneProviderDependencies includes buildGraphClientFn/graphPageAllFn/withRetryFn overrides for full test isolation without module mocking"
  - "initConnectorRegistry() updates a module-level _registry variable; getConnectorRegistryEntry() reads from it — preserves zero-arg runSync contract on ConnectorRegistryEntry"
  - "runConnectorSync wired in server.ts connectorsRouteOptions; tests inject mock via connectorsRoutes.runConnectorSync override"
metrics:
  duration: "17 min"
  completed: "2026-03-31"
  tasks: 2
  files: 10
---

# Phase 13 Plan 01: Intune Device Sync Backend Summary

Real Intune Graph API sync backend — graphPageAll pagination helper, withRetry 429 retry, DeviceCompliancePolicy + DeviceComplianceAssignment Prisma models, createIntuneProvider factory replacing stub, and POST /api/connectors/intune/sync authenticated route.

## What Was Built

### Task 1: Prisma Schema + Graph Helpers

- Added `DeviceCompliancePolicy` and `DeviceComplianceAssignment` models to `prisma/schema.prisma`
- Added `complianceAssignments DeviceComplianceAssignment[]` reverse relation to `Device` model
- Created manual SQL migration at `prisma/migrations/20260331_0001_device_compliance_models/migration.sql`
- Regenerated Prisma client
- Installed `@microsoft/microsoft-graph-client ^3.0.7`
- Created `graph-helpers.ts` with three exports:
  - `buildGraphClient`: reads IntegrationCredential row for "intune", decrypts via credential-crypto, creates ClientSecretCredential + TokenCredentialAuthenticationProvider, returns Graph Client
  - `graphPageAll<T>`: follows `@odata.nextLink` loop, collects all items into flat array
  - `withRetry<T>`: 429 detection, Retry-After header support, exponential backoff (2s, 4s, 8s), max 3 retries, immediate rethrow on non-429 errors
- 8 new tests covering all pagination and retry behaviors

### Task 2: Real Intune Provider + Registry + Route

- Replaced `runIntuneConnectorSync()` stub with `createIntuneProvider(deps)` factory
- Provider closure:
  1. Builds Graph client
  2. Fetches all managed devices via paginated `graphPageAll`
  3. Batch-looks up Entra users for owner linking
  4. Upserts each device with full field mapping (name, OS, encryption, compliance, age, owner)
  5. Fetches compliance policy states per device in batches of 10
  6. Deduplicates by policyId, upserts DeviceCompliancePolicy + DeviceComplianceAssignment
  7. Deletes stale Intune rows not in this sync
  8. Returns ConnectorSyncOutput with success/failure result
- Updated `connector.registry.ts` with `initConnectorRegistry()` and `buildConnectorRegistry()`
- Added `POST /api/connectors/intune/sync` to `connectors.ts` (requires auth via preHandler)
- Updated `server.ts` to call `initConnectorRegistry({ prisma, systemKey })` at startup and wire `runConnectorSync`
- 9 provider tests + 2 route tests (authenticated 200 + unauthenticated 401)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] API test framework is node:test, not vitest**

- **Found during:** Task 1 RED phase
- **Issue:** Test file used `import { describe, it, vi } from "vitest"` — API package uses `node --test`, not vitest
- **Fix:** Rewrote tests using `import { describe, it } from "node:test"` and `node:assert/strict`; replaced `vi.useFakeTimers()` approach with `delayMultiplier` parameter on `withRetry` for instant test-speed retries
- **Files modified:** `apps/api/src/modules/connectors/__tests__/graph-helpers.test.ts`, `apps/api/src/modules/connectors/graph-helpers.ts`
- **Commit:** 5467669

**2. [Rule 1 - Bug] connectors.sync.test.ts had wrong import path**

- **Found during:** Task 2 RED verification
- **Issue:** `import { buildServer } from "../server.js"` should be `../../server.js` from `src/routes/__tests__/` subdirectory
- **Fix:** Fixed relative import paths for `auth.js` and `server.js`
- **Files modified:** `apps/api/src/routes/__tests__/connectors.sync.test.ts`
- **Commit:** bad93a4

## Test Results

- Total tests before plan: 102
- Total tests after plan: 121
- New tests: 19 (8 graph-helpers + 9 intune.provider + 2 connectors.sync)
- All 121 API tests pass
- All 23 Playwright e2e tests pass
- Full `npx pnpm test` green

## Known Stubs

None. The Intune provider is fully implemented with real Graph API calls. The Entra provider (`runEntraConnectorSync`) remains a stub returning seeded data — that is pre-existing and not in scope for this plan.

## Self-Check: PASSED

All 7 expected files found. Both task commits verified: 5467669, bad93a4.
