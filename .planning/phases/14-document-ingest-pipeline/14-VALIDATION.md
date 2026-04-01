---
phase: 14
slug: document-ingest-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (API unit tests) + Playwright (E2E) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `npx pnpm --filter @agentsmith/api test` |
| **Full suite command** | `npx pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx pnpm --filter @agentsmith/api test`
- **After every plan wave:** Run `npx pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | INGEST-01 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | INGEST-02 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | INGEST-04 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | INGEST-05 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | INGEST-03 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | INGEST-01 | unit | `npx pnpm --filter @agentsmith/web test` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 3 | INGEST-01..05 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/ingest/__tests__/` — test directory for ingest module
- [ ] `apps/api/src/modules/ingest/__tests__/ingest.service.test.ts` — unit tests for ingest service
- [ ] `apps/api/src/routes/__tests__/settings.test.ts` — unit tests for settings routes
- [ ] `apps/api/src/routes/__tests__/ingest.test.ts` — unit tests for ingest routes

*Existing vitest + Playwright infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| chokidar watches source folder for new files | INGEST-04 | Requires real filesystem events and timing | Drop a .txt file into configured source folder, verify IngestFile row created within 5s |
| Output folder file organization | INGEST-03 | Requires filesystem inspection of classified output | After ingest run, verify output folder has kind-based subfolders with copied files |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
