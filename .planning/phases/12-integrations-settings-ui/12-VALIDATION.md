---
phase: 12
slug: integrations-settings-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (web), jest (api) |
| **Config file** | `apps/web/vitest.config.ts`, `apps/api/jest.config.ts` |
| **Quick run command** | `npx pnpm test` |
| **Full suite command** | `npx pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx pnpm test`
- **After every plan wave:** Run `npx pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | CRED-01 | unit | `npx pnpm --filter @agentsmith/api test` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | CRED-01 | unit | `npx pnpm --filter @agentsmith/api test` | ✅ | ⬜ pending |
| 12-01-03 | 01 | 1 | CRED-01 | unit | `npx pnpm --filter @agentsmith/api test` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | CRED-02 | unit | `npx pnpm --filter @agentsmith/web test` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | CRED-02 | unit | `npx pnpm --filter @agentsmith/web test` | ❌ W0 | ⬜ pending |
| 12-02-03 | 02 | 2 | CRED-03 | unit | `npx pnpm --filter @agentsmith/web test` | ❌ W0 | ⬜ pending |
| 12-02-04 | 02 | 2 | CRED-04 | unit | `npx pnpm --filter @agentsmith/web test` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 3 | CRED-03 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |
| 12-03-02 | 03 | 3 | CRED-04 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/src/routes/settings/__tests__/IntegrationsPage.test.tsx` — stubs for CRED-01, CRED-02, CRED-03, CRED-04
- [ ] `apps/web/tests/settings.spec.ts` — Playwright stubs for CRED-03, CRED-04 UI flows

*Existing API test infrastructure covers API route unit tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Intune test-connection returns pass | CRED-03 | Requires live Azure credentials | Configure real tenant/client/secret; press Test; verify green badge |
| Real OpenAI test-connection returns pass | CRED-03 | Requires live OpenAI API key | Configure real key; press Test; verify green badge |
| Secret never appears in browser network tab | CRED-02 | Requires manual DevTools inspection | Open DevTools → Network; load /settings; verify no response contains full secret value |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
