---
phase: 05-backup-confidence-dashboard
plan: 01
subsystem: backend
tags: [backup, prisma, fixtures, recoverability, types]
requires: []
provides:
  - canonical backup policy, evidence, and restore-proof persistence models
  - explicit Phase 5 v1 provider and workload scope descriptors
  - deterministic seeded-example backup fixtures for healthy, missing, partial, stale, unknown, and excluded states
affects: [phase-05-backup-confidence-dashboard, api-backup-module, read-only-recoverability-workflows]
tech-stack:
  added: []
  patterns:
    - policy-backed backup coverage measured against canonical System records
    - provider scope isolated in a dedicated v1 boundary file
    - seeded-example backup fixtures with operator-attested restore evidence
key-files:
  created:
    - apps/api/src/modules/backup/backup.types.ts
    - apps/api/src/modules/backup/backup.v1-scope.ts
    - apps/api/src/modules/backup/backup.fixtures.ts
    - .planning/phases/05-backup-confidence-dashboard/deferred-items.md
  modified:
    - prisma/schema.prisma
key-decisions:
  - "Measured expected protection from canonical System records plus explicit BackupCoveragePolicy rows instead of provider exports alone."
  - "Bound Phase 5 v1 backup support to azure_backup, m365_backup, and veeam, with all other providers treated as unsupported_provider."
  - "Kept seeded-example backup fixtures explicit, including operator-attested restore proof, so later API and UI plans can stay read-only and honest before live connectors exist."
patterns-established:
  - "Backup confidence contracts carry missing, partial, excluded, stale, and unknown states explicitly so later layers do not collapse unknown into healthy."
  - "Restore-proof evidence is modeled separately from provider backup evidence so operator-attested proof can stay read-only and auditable."
requirements-completed: [BACK-01, BACK-02, BACK-03]
duration: 10 min
completed: 2026-03-27
---

# Phase 5 Plan 1: Canonical Backup Scope Summary

**Canonical backup policy and recoverability contracts with explicit v1 provider scope and seeded trust-boundary fixtures for Phase 5**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-28T00:40:03Z
- **Completed:** 2026-03-28T00:50:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended Prisma with backup coverage policy, provider evidence, and restore-test models plus backup-specific enums for coverage, freshness, confidence, and evidence source semantics.
- Added one shared backup contract file and one explicit v1 scope file so later repository, route, and web work can rely on canonical types instead of ad hoc provider conditionals.
- Seeded deterministic backup fixtures for healthy coverage, policy-only missing coverage, partial tenant coverage, stale backup freshness, stale restore proof, unknown telemetry, and excluded policy cases.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the canonical backup-policy, provider-evidence, and source-scope contracts** - `1735ac3` (feat)
2. **Task 2: Create deterministic fixture data that proves coverage, restore-proof, and telemetry edge cases** - `ed786be` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - adds backup enums plus `BackupCoveragePolicy`, `BackupEvidence`, and `BackupRestoreTest` persistence models on top of canonical `System` records.
- `apps/api/src/modules/backup/backup.types.ts` - defines shared backup overview, findings, inventory, source-health, and detail contracts plus canonical state unions.
- `apps/api/src/modules/backup/backup.v1-scope.ts` - locks the supported v1 provider keys and workload keys behind a single boundary file, including the `unsupported_provider` note.
- `apps/api/src/modules/backup/backup.fixtures.ts` - seeds deterministic protected systems, policies, evidence rows, and restore tests with honest trust-state examples.
- `.planning/phases/05-backup-confidence-dashboard/deferred-items.md` - records unrelated lifecycle typecheck failures discovered during verification and left out of scope.

## Decisions Made

- Used explicit backup coverage policies tied to `System` so missing protection is derived from expected scope rather than missing provider exports alone.
- Isolated provider and workload keys in `backup.v1-scope.ts` so unsupported providers remain a bounded future-phase concern.
- Represented operator-attested restore proof as a first-class fixture case to keep future UI work read-only and source-backed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added valid identifiers and audit timestamps to backup persistence models**
- **Found during:** Task 1 (Add the canonical backup-policy, provider-evidence, and source-scope contracts)
- **Issue:** The plan listed business fields for the Prisma backup models but omitted required primary keys, relational timestamps, and basic indexes needed for valid persistence and auditability.
- **Fix:** Added `id`, `createdAt`, and `updatedAt` fields where required, plus relation and lookup indexes on the new backup models.
- **Files modified:** `prisma/schema.prisma`
- **Verification:** Task 1 token verification passed and `PRISMA_GENERATE_NO_ENGINE=1 npx pnpm db:generate` succeeded.
- **Committed in:** `1735ac3`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The added fields were necessary to keep the backup schema valid, queryable, and auditable without changing the planned domain boundary.

## Issues Encountered

- `npx pnpm db:generate` initially failed because Prisma could not replace a locked Windows query-engine DLL in `node_modules`; rerunning with `PRISMA_GENERATE_NO_ENGINE=1` verified the schema and regenerated the client without changing source files.
- `npx pnpm --filter @agentsmith/api typecheck` still fails in pre-existing lifecycle files. The failures were recorded in `.planning/phases/05-backup-confidence-dashboard/deferred-items.md` and left out of scope for `05-01`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 API work can now build on one stable backup contract across Prisma, repository inputs, route DTOs, and web consumption.
- The next plan can reuse deterministic fixtures to prove missing coverage, stale proof, unknown telemetry, and excluded-policy behavior without inventing new state semantics.

## Self-Check

PASSED

- Verified `apps/api/src/modules/backup/backup.types.ts`
- Verified `apps/api/src/modules/backup/backup.v1-scope.ts`
- Verified `apps/api/src/modules/backup/backup.fixtures.ts`
- Verified `prisma/schema.prisma`
- Verified `PRISMA_GENERATE_NO_ENGINE=1 npx pnpm db:generate`
- Found commit `1735ac3`
- Found commit `ed786be`

---
*Phase: 05-backup-confidence-dashboard*
*Completed: 2026-03-27*
