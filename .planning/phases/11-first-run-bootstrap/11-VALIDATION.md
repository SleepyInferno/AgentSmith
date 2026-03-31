---
phase: 11
slug: first-run-bootstrap
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node test runner (API), playwright (e2e) |
| **Config file** | `apps/api/package.json` (test script uses `node --import tsx --test`), `apps/web/playwright.config.ts` |
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
| 11-01-01 | 01 | 1 | BOOT-01 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | BOOT-02 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | BOOT-03 | unit | `npx pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | BOOT-01 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 2 | BOOT-02 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 2 | BOOT-03 | e2e | `npx pnpm --filter @agentsmith/web test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/routes/bootstrap.test.ts` — stubs for BOOT-01, BOOT-02, BOOT-03
- [ ] `apps/web/e2e/bootstrap.spec.ts` — e2e stubs for first-run redirect and setup flow

*Existing test infrastructure covers framework; only stub files need creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Session cookie is regenerated on local login (prevents fixation) | BOOT-02 | Session ID generation is internal to cookie plugin and not observable via API assertions | Log in with local credentials, inspect `Set-Cookie` header, confirm new session ID differs from pre-login session |
| Setup screen inaccessible after first admin created | BOOT-03 | DB state check requires live database | Create admin, attempt to GET /setup, verify redirect to /login |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
