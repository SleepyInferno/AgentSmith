---
phase: 03
slug: lifecycle-automation
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-26
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` on Node `25.8.1` |
| **Config file** | none |
| **Quick run command** | `npx pnpm --filter @agentsmith/api test` |
| **Full suite command** | `npx pnpm --filter @agentsmith/api test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's automated verify command
- **After every plan wave:** Run `npx pnpm --filter @agentsmith/api test` for API waves and `npx pnpm --filter @agentsmith/web build` for web waves
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | LIFE-01, LIFE-02 | schema + static contract | `node -e "const fs=require('node:fs');const schema=fs.readFileSync('prisma/schema.prisma','utf8');const templates=fs.readFileSync('apps/api/src/modules/lifecycle/lifecycle.templates.ts','utf8');if(!schema.includes('updatedAt'))process.exit(1);for (const token of ['employee-onboarding','employee-offboarding','identity','licensing','group','device','checklist','handoff','follow-up']) { if (!templates.includes(token)) process.exit(1); }"` | ✅ planned | ⬜ pending |
| 03-01-02 | 01 | 1 | LIFE-01, LIFE-02, LIFE-03, LIFE-04 | service tests | `node --import tsx --test apps/api/src/modules/lifecycle/lifecycle.service.test.ts apps/api/src/modules/lifecycle/lifecycle-summary.test.ts` | ✅ planned | ⬜ pending |
| 03-02-01 | 02 | 2 | LIFE-01, LIFE-02, LIFE-03, LIFE-04 | repository + static contract | `node -e "const fs=require('node:fs');const repo=fs.readFileSync('apps/api/src/modules/lifecycle/lifecycle.repository.ts','utf8');const server=fs.readFileSync('apps/api/src/server.ts','utf8');for (const token of ['listTemplates','listActiveRuns','startRun','updateRunStep','getRunSummary','updatedAt','lifecycle.run.started','lifecycle.step.updated','lifecycle.run.closed']) { if (!repo.includes(token)) process.exit(1); } if (!server.includes('registerLifecycleRoutes') || !server.includes('lifecycleRoutes')) process.exit(1);"` | ✅ planned | ⬜ pending |
| 03-02-02 | 02 | 2 | LIFE-01, LIFE-02, LIFE-03, LIFE-04 | route tests | `node --import tsx --test apps/api/src/routes/lifecycle.test.ts` | ✅ planned | ⬜ pending |
| 03-03-01 | 03 | 3 | LIFE-01, LIFE-02 | web build | `npx pnpm --filter @agentsmith/web build` | ✅ planned | ⬜ pending |
| 03-03-02 | 03 | 3 | LIFE-01, LIFE-02 | web build | `npx pnpm --filter @agentsmith/web build` | ✅ planned | ⬜ pending |
| 03-04-01 | 04 | 4 | LIFE-03 | web build | `npx pnpm --filter @agentsmith/web build` | ✅ planned | ⬜ pending |
| 03-04-02 | 04 | 4 | LIFE-04 | web build | `npx pnpm --filter @agentsmith/web build` | ✅ planned | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/lifecycle/lifecycle.service.test.ts` - launch and step-transition coverage for LIFE-01 through LIFE-03
- [ ] `apps/api/src/routes/lifecycle.test.ts` - launch, step update, summary, and updated-time HTTP contract coverage
- [ ] `apps/api/src/modules/lifecycle/lifecycle-summary.test.ts` - unresolved follow-up aggregation coverage for LIFE-04
- [ ] Database-backed verification path - PostgreSQL reachability for persisted lifecycle run testing

---

## Manual-Only Verifications

All planned phase behaviors now have an automated verify command. The remaining manual verification is confirming database-backed persistence in an environment where PostgreSQL is reachable.

---

## Validation Sign-Off

- [x] All tasks have automated verify coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 plan coverage is defined for API and web tasks
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-26
