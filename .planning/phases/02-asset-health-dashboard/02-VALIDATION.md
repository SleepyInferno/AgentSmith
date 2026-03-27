---
phase: 02
slug: asset-health-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 02 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node test runner for API today, optional Vitest for web if added in Wave 1 |
| **Config file** | none - Wave 0 may add Vitest config if frontend tests are introduced |
| **Quick run command** | `pnpm --filter @agentsmith/api build && pnpm --filter @agentsmith/web build` |
| **Full suite command** | `pnpm build && pnpm --filter @agentsmith/api test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @agentsmith/api build && pnpm --filter @agentsmith/web build`
- **After every plan wave:** Run `pnpm build && pnpm --filter @agentsmith/api test`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ASST-01 | build plus schema inspection | `pnpm --filter @agentsmith/api build` | ✅ | ⬜ pending |
| 02-01-02 | 01 | 1 | ASST-02 | unit or integration | `pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | ASST-01, ASST-02, ASST-04 | integration | `pnpm --filter @agentsmith/api test` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | ASST-03 | build plus route rendering check | `pnpm --filter @agentsmith/web build` | ✅ | ⬜ pending |
| 02-03-02 | 03 | 3 | ASST-04 | build plus queue rendering check | `pnpm --filter @agentsmith/web build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/**/*.test.ts` - add targeted tests for risk-score calculation and asset endpoint shaping before backend execution depends on `pnpm --filter @agentsmith/api test`
- [ ] `apps/api/package.json` - ensure the `test` script compiles or runs actual Phase 2 test files instead of only looking for `dist/**/*.test.js`
- [ ] `apps/web/vitest.config.ts` or equivalent - only if frontend rendering tests are introduced in this phase

*If frontend tests are skipped, existing infrastructure covers UI verification through build checks plus deterministic acceptance criteria.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard ordering feels operator-meaningful | ASST-04 | Requires human review of ranked queue usefulness | Seed several devices with mixed stale check-in, encryption, AV, and patch states; open the dashboard and confirm the first rows are the highest-risk devices with visible reasons |
| Device detail explanation is understandable | ASST-03 | Human judgment needed on explanation clarity | Open a high-risk device detail view and verify the screen lists the exact risk signals, their severity, and any missing-data warning without relying on hidden tooltips |
| Stale-source warning is not confused with healthy empty state | ASST-04 | Needs end-to-end UI review | Simulate stale connector metadata, load queue and inventory screens, and confirm warning copy appears instead of a healthy "all clear" message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
