---
phase: 10
slug: schema-and-credential-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner (`node:test`) with `tsx` loader |
| **Config file** | None — test script is `node --import tsx --test src/**/*.test.ts` in `apps/api/package.json` |
| **Quick run command** | `npx pnpm --filter @agentsmith/api test` |
| **Full suite command** | `npx pnpm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx pnpm --filter @agentsmith/api test`
- **After every plan wave:** Run `npx pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Deliverable | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | User schema fields | Unit | `npx pnpm --filter @agentsmith/api test` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | Entra Zod optional | Unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 2 | credential-crypto round-trip | Unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 2 | IV uniqueness | Unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 2 | SystemKey boot init | Unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 | 2 | SystemKey load existing | Unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 | 3 | pgvector migration | Manual | DB preflight + `prisma migrate dev` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/lib/credential-crypto.test.ts` — wrapKey/unwrapKey round-trip, encryptCredential/decryptCredential round-trip, IV uniqueness across calls
- [ ] `apps/api/src/lib/system-key.test.ts` — boot initialization with mock prisma (create new row), load existing row and return unwrapped key
- [ ] `packages/shared/src/env.test.ts` (add to existing or create) — `parseServerEnv({})` succeeds without Entra vars; `parseServerEnv({ ENTRA_TENANT_ID: 'x', ... })` still succeeds when all Entra vars provided

*Wave 0 must also verify pgvector availability via `pg_available_extensions WHERE name = 'vector'` before the pgvector migration runs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| pgvector installed on PostgreSQL server | Phase 10 prerequisite | Cannot automate OS-level package check in test suite | Run `psql -c "SELECT name FROM pg_available_extensions WHERE name = 'vector';"` — must return `vector` row |
| DocumentEmbedding HNSW index created | Phase 10 schema | Prisma doesn't model HNSW indexes | After migration: `psql -c "\d document_embeddings"` — must show `document_embeddings_embedding_idx` index |
| SystemKey row persists across API restart | D-03/D-04 | Requires running API process | Start API, stop, restart — credential encrypt/decrypt must still work without re-generating key |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
