---
phase: 10-schema-and-credential-foundation
plan: 02
subsystem: infra
tags: [aes-256-gcm, node-crypto, hkdf, key-wrapping, credentials, prisma, tdd]

# Dependency graph
requires:
  - phase: 10-schema-and-credential-foundation
    provides: SystemKey and IntegrationCredential Prisma models from Plan 01
provides:
  - credential-crypto.ts with wrapKey/unwrapKey/encryptCredential/decryptCredential (AES-256-GCM, node:crypto only)
  - system-key.ts with ensureSystemKey (auto-init data key on first call, load on subsequent calls)
  - Full TDD test coverage for both modules
affects:
  - 12-integrations-settings-ui
  - 13-intune-device-sync
  - 14-document-ingest-pipeline
  - 15-rag-search

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HKDF-SHA256 wrapping key derivation from SESSION_SECRET (fixed salt + domain-separated info string)
    - AES-256-GCM iv:authTag:ciphertext hex string format for wrapped keys
    - Fresh IV per encryptCredential call (randomBytes(12) inside function, not module-level)
    - SystemKeyPrisma narrow interface type for testability without full PrismaClient import
    - TDD RED-GREEN with node:test mock.fn for Prisma mocking

key-files:
  created:
    - apps/api/src/lib/credential-crypto.ts
    - apps/api/src/lib/credential-crypto.test.ts
    - apps/api/src/lib/system-key.ts
    - apps/api/src/lib/system-key.test.ts
  modified: []

key-decisions:
  - "HKDF-SHA256 used to derive wrapping key from SESSION_SECRET (fixed empty salt, domain-separated info string) — avoids using raw secret as cipher key directly"
  - "iv:authTag:ciphertext hex string format chosen for wrapped key storage in SystemKey.wrappedKey — self-contained, no extra DB columns"
  - "SystemKeyPrisma narrow interface type defined inline in system-key.ts — enables mock Prisma in tests without importing full PrismaClient"
  - "ensureSystemKey NOT wired into server.ts in Phase 10 — Phase 12 will call it at server startup when credential read/write is needed"

patterns-established:
  - "Pattern 1: Fresh IV per encrypt call — randomBytes(12) inside encryptCredential (never module-level), prevents IV reuse that would break GCM security"
  - "Pattern 2: HKDF key derivation — derive wrapping key from high-entropy secret via hkdfSync rather than using secret as key directly"
  - "Pattern 3: Narrow Prisma interface for testability — define minimal interface type matching only the methods needed, allows mock.fn injection"

requirements-completed:
  - CRED-03
  - CRED-04

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 10 Plan 02: Schema and Credential Foundation Summary

**AES-256-GCM credential encryption runtime with HKDF key derivation, SystemKey auto-initialization, and full TDD coverage using node:crypto only**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T22:10:09Z
- **Completed:** 2026-03-30T22:12:47Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Implemented `credential-crypto.ts` with `wrapKey`/`unwrapKey` (HKDF + AES-256-GCM key wrapping) and `encryptCredential`/`decryptCredential` (fresh IV per call) using `node:crypto` exclusively
- Implemented `system-key.ts` with `ensureSystemKey` — auto-generates a 32-byte data key and wraps it with SESSION_SECRET on first call; unwraps from DB on subsequent calls
- 7 credential-crypto tests cover round-trips, IV uniqueness, wrong-key rejection, and hex format
- 2 system-key tests cover create-new and load-existing paths using `mock.fn` Prisma mocks
- Full test suite passes: 75 API tests + 16 Playwright browser tests

## Task Commits

Each task was committed atomically:

1. **Task 1: credential-crypto module with tests** - `c6f8040` (feat)
2. **Task 2: SystemKey boot initialization with tests** - `7811621` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `apps/api/src/lib/credential-crypto.ts` - wrapKey, unwrapKey, encryptCredential, decryptCredential using AES-256-GCM + HKDF
- `apps/api/src/lib/credential-crypto.test.ts` - 7 tests: round-trips, hex format, IV uniqueness, wrong-key rejection
- `apps/api/src/lib/system-key.ts` - ensureSystemKey with narrow SystemKeyPrisma interface type
- `apps/api/src/lib/system-key.test.ts` - 2 tests: create-new path and load-existing path with mock Prisma

## Decisions Made

- **HKDF-SHA256 wrapping key derivation**: Rather than using `SESSION_SECRET` directly as an AES key, `hkdfSync("sha256", ...)` with a domain-separated info string (`"agentsmith-system-key-wrap"`) derives a proper 32-byte key. This provides better key separation and is consistent with cryptographic best practice.
- **iv:authTag:ciphertext format**: The wrapped key string stores all three AES-GCM components in a single column (SystemKey.wrappedKey) as colon-separated hex. No extra DB columns needed for the wrap operation.
- **Narrow SystemKeyPrisma interface**: Defined inline in system-key.ts to specify only `findUnique` and `create` on `systemKey`. Eliminates the need to import `PrismaClient` directly and makes mock injection straightforward.
- **ensureSystemKey not wired in Phase 10**: The function is exported and tested, but not called from server.ts. Phase 12 will invoke it at server startup when integrations credential storage becomes active.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Encryption runtime is complete and importable — Phase 12 can call `ensureSystemKey(prisma, env.SESSION_SECRET)` at startup and pass the returned `dataKey` to `encryptCredential`/`decryptCredential` when storing or reading integration credentials
- Phase 10 is now fully complete (2 of 2 plans done)
- Phase 11 (First-Run Bootstrap) and Phase 12 (Integrations Settings UI) can both proceed — they both depend only on Phase 10 schema/runtime deliverables

## Self-Check: PASSED

- apps/api/src/lib/credential-crypto.ts — FOUND
- apps/api/src/lib/credential-crypto.test.ts — FOUND
- apps/api/src/lib/system-key.ts — FOUND
- apps/api/src/lib/system-key.test.ts — FOUND
- Commit c6f8040 — checked
- Commit 7811621 — checked

---
*Phase: 10-schema-and-credential-foundation*
*Completed: 2026-03-30*
