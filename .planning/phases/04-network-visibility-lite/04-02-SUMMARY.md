---
phase: 04-network-visibility-lite
plan: 02
subsystem: api
tags: [fastify, network, routes, http-contract, node-test]
requires:
  - phase: 04-01
    provides: canonical network repository, seeded fixtures, and server-owned finding helpers
provides:
  - stable HTTP routes for network findings, inventory, map, and detail reads
  - injected Fastify server registration for the network module
  - route tests that lock dataMode, confidence, and missing-resource behavior
affects: [phase-04-network-visibility-lite, api-network-contract, network-web-module]
tech-stack:
  added: []
  patterns: [route-layer DTO mapping for network data, injected Fastify route registration, TDD-backed HTTP contract locking]
key-files:
  created:
    - apps/api/src/routes/network.ts
    - apps/api/src/routes/network.test.ts
  modified:
    - apps/api/src/server.ts
key-decisions:
  - "Flattened the network detail route response at the HTTP layer so the web client consumes one explicit DTO instead of repository nesting."
  - "Derived list-route root dataMode from returned rows and fall back to the map contract when filters produce no items."
patterns-established:
  - "Network routes expose freshness, confidence, scope, and dataMode explicitly instead of asking the frontend to infer trust semantics."
  - "New API modules register through buildServer dependency injection and are verified with injected repository doubles in route tests."
requirements-completed: [NET-01, NET-02, NET-03]
duration: 6 min
completed: 2026-03-27
---

# Phase 4 Plan 2: Stable Network API Contracts Summary

**Fastify network findings, inventory, map, and detail routes now expose explicit dataMode, freshness, scope, and confidence DTOs for the Phase 4 web module**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T16:02:12Z
- **Completed:** 2026-03-27T16:09:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `registerNetworkRoutes` with findings, inventory, map, and detail endpoints that keep trust semantics explicit in the HTTP contract.
- Registered the network module through `buildServer` using the same injected repository pattern already used by assets and lifecycle.
- Locked the new route surface with TDD-style Fastify injection tests covering query parsing, confidence values, `dataMode`, and `404` handling.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add network findings, inventory, map, and detail routes with explicit query parsing** - `904b4bc` (feat)
2. **Task 2: Register network routes in the server and lock the HTTP contract with route tests** - `2cdc7ad` (test)
3. **Task 2: Register network routes in the server and lock the HTTP contract with route tests** - `7996a1e` (feat)

## Files Created/Modified

- `apps/api/src/routes/network.ts` - adds the network HTTP contract, query parsing, DTO mapping, and missing-resource response.
- `apps/api/src/routes/network.test.ts` - verifies findings, inventory, map, detail, and `dataMode` behavior through injected Fastify requests.
- `apps/api/src/server.ts` - wires the network module into the shared server composition and dependency injection path.

## Decisions Made

- Flattened the detail route payload so the UI can consume resource fields, findings, related resources, and scope summary from one response shape.
- Kept `dataMode` explicit at the route root while preserving item-level trust metadata in mapped responses.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Phase 4 web work can now consume one consistent API surface for queue, inventory, map, and detail flows.
- Route tests protect the network contract so the upcoming UI plans can refactor against a stable backend seam.

## Self-Check

PASSED

- Found `.planning/phases/04-network-visibility-lite/04-02-SUMMARY.md`
- Found commit `904b4bc`
- Found commit `2cdc7ad`
- Found commit `7996a1e`
- Verified `node --import tsx --test apps/api/src/routes/network.test.ts`

---
*Phase: 04-network-visibility-lite*
*Completed: 2026-03-27*
