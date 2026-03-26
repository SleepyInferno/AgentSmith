---
phase: 02-asset-health-dashboard
plan: 01
subsystem: api
tags: [prisma, fastify, postgres, asset-health, risk-scoring, testing]
requires:
  - phase: 01-foundations-and-secure-data-flow
    provides: canonical device and user records, freshness enums, and workspace API tooling
provides:
  - explicit asset-health schema fields on Device and a derived DeviceRiskAssessment model
  - shared asset inventory, queue, and detail DTO contracts
  - deterministic backend scoring logic for inventory, queue, and device detail views
affects: [asset-api, asset-dashboard, device-detail, shared-contracts]
tech-stack:
  added: [none]
  patterns: [canonical-device-plus-derived-risk-assessment, typed-asset-dto-contract, deterministic-server-side-risk-scoring]
key-files:
  created:
    - apps/api/src/modules/assets/asset-health.types.ts
    - apps/api/src/modules/assets/asset-health.repository.ts
    - apps/api/src/modules/assets/asset-health.service.ts
    - apps/api/src/modules/assets/asset-health.service.test.ts
    - packages/shared/src/asset-health.ts
  modified:
    - prisma/schema.prisma
    - packages/shared/src/index.ts
    - apps/api/package.json
key-decisions:
  - "Kept canonical device identity separate from derived risk assessments by storing scoring output in DeviceRiskAssessment."
  - "Joined device owners in the repository with a second User query instead of rewriting the Phase 1 schema to add a Prisma relation."
  - "Ran API tests from source with tsx so the required workspace test command works without a prior build."
patterns-established:
  - "Asset health status fields use nullable enums so unknown telemetry never defaults to healthy."
  - "Repository methods return normalized DTOs with structured signal arrays instead of connector payload fragments."
requirements-completed: [ASST-01, ASST-02, ASST-04]
duration: 31 min
completed: 2026-03-26
---

# Phase 02 Plan 01: Asset Health Backbone Summary

**Prisma-backed asset health fields, shared DTO contracts, and deterministic device risk scoring for queue and detail reuse**

## Performance

- **Duration:** 31 min
- **Started:** 2026-03-26T17:19:00Z
- **Completed:** 2026-03-26T17:50:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Extended the canonical device model with explicit health signal fields and a separate `DeviceRiskAssessment` read model.
- Added typed asset inventory, queue, and detail DTOs plus repository queries that join owner metadata and derived risk data.
- Implemented deterministic backend risk scoring with coverage for high-risk, incomplete-data, and low-risk cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the canonical asset-health data model** - `1f99361` (feat)
2. **Task 2: Define typed asset DTOs and repository queries** - `3fd8f49` (feat)
3. **Task 3: Implement deterministic risk scoring and backend tests** - `dd6fb7c` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - adds asset-health enums, device signal fields, and `DeviceRiskAssessment`
- `apps/api/src/modules/assets/asset-health.types.ts` - defines API-local asset DTOs and signal codes
- `apps/api/src/modules/assets/asset-health.repository.ts` - loads inventory, queue, and detail data with owner joins
- `apps/api/src/modules/assets/asset-health.service.ts` - scores devices and builds queue/detail outputs
- `apps/api/src/modules/assets/asset-health.service.test.ts` - verifies high-risk, incomplete-data, and low-risk behavior
- `packages/shared/src/asset-health.ts` - shared DTO contract for later API and web consumption
- `packages/shared/src/index.ts` - re-exports shared asset contract types
- `apps/api/package.json` - runs API tests directly from source with `tsx`

## Decisions Made

- Kept risk output in `DeviceRiskAssessment` so inventory identity stays stable while scoring evolves independently.
- Used explicit status enums and a `data_incomplete` signal so missing telemetry remains visible instead of becoming a false healthy state.
- Preserved the Phase 1 schema shape by joining owner records in the repository rather than expanding scope with a relation refactor.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed API test execution so the required verify command works**
- **Found during:** Task 3 (Implement deterministic risk scoring and backend tests)
- **Issue:** `apps/api` only ran compiled `dist/**/*.test.js`, which would not execute new source tests from a clean checkout.
- **Fix:** Updated the package test script to `node --import tsx --test src/**/*.test.ts`.
- **Files modified:** `apps/api/package.json`
- **Verification:** `npm exec pnpm -- --filter @agentsmith/api test`
- **Committed in:** `dd6fb7c`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for the plan's mandated verification command. No scope creep.

## Issues Encountered

- `pnpm` was not available on `PATH`, so all verification commands were run through `npm exec pnpm -- ...` instead.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Asset API routes can now reuse the shared DTO contract, repository queries, and scoring helpers without re-implementing ranking logic.
- Dashboard and detail UI work can consume structured signal explanations and explicit freshness states directly from the backend.

## Self-Check: PASSED

- Verified summary file exists at `.planning/phases/02-asset-health-dashboard/02-01-SUMMARY.md`.
- Verified task commits `1f99361`, `3fd8f49`, and `dd6fb7c` exist in git history.
