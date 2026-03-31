---
phase: 13
slug: intune-device-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (API) + jest (web) |
| **Config file** | `apps/api/vitest.config.ts` |
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
| 13-01-01 | 01 | 0 | SYNC-01 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | SYNC-01 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | SYNC-01 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | SYNC-02 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | SYNC-02 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 2 | SYNC-03 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |
| 13-03-02 | 03 | 2 | SYNC-03 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/connectors/__tests__/intune.provider.test.ts` — stubs for SYNC-01 (graphPageAll, 429 retry)
- [ ] `apps/api/src/connectors/__tests__/graph.client.test.ts` — stubs for SYNC-01 (Graph client factory)
- [ ] `apps/api/src/routes/__tests__/sync.trigger.test.ts` — stubs for SYNC-02 (manual sync trigger endpoint)
- [ ] `apps/web/e2e/intune-sync.spec.ts` — Playwright stubs for SYNC-03 (freshness indicator + manual sync UI)

*Wave 0 creates test skeletons so every subsequent task has a failing test to make green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live Graph API returns real device data | SYNC-01 | Requires live Intune tenant credentials | Configure Intune credentials in Integrations settings, trigger sync, verify device list populates with real data |
| 429 throttling retry works against real API | SYNC-01 | Cannot reliably trigger throttle in test env | Observe logs during large fleet sync for retry-after handling |
| Stale mock rows removed after first real sync | SYNC-01 | Requires seeded DB + live sync | Check device count before/after sync with seeded mock data |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
