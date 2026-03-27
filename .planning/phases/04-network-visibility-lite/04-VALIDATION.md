---
phase: 04
slug: network-visibility-lite
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-27
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` with `tsx`, plus existing web build checks |
| **Config file** | none |
| **Quick run command** | `npx pnpm --filter @agentsmith/api test` |
| **Full suite command** | `cmd /c "npx pnpm --filter @agentsmith/api test && npx pnpm --filter @agentsmith/web build"` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's automated verify command
- **After every plan wave:** Run `npx pnpm --filter @agentsmith/api test` for API waves and `npx pnpm --filter @agentsmith/web build` for web waves
- **Before `$gsd-verify-work`:** Both network API tests and web build must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | NET-01, NET-02, NET-03 | schema + static contract | `node -e "const fs=require('node:fs');const schema=fs.readFileSync('prisma/schema.prisma','utf8');const types=fs.readFileSync('apps/api/src/modules/network/network.types.ts','utf8');for (const token of ['enum NetworkResourceKind','enum NetworkRelationConfidence','enum NetworkFindingKind','model NetworkResource','model NetworkRelationship','model NetworkFinding']) { if (!schema.includes(token)) process.exit(1); } for (const token of ['NetworkInventoryRow','NetworkFindingItem','NetworkMapResponse','NetworkResourceDetail']) { if (!types.includes(token)) process.exit(1); }"` | planned | pending |
| 04-01-02 | 01 | 1 | NET-01, NET-02, NET-03 | repository + finding tests | `node --import tsx --test apps/api/src/modules/network/network.repository.test.ts apps/api/src/modules/network/network.findings.test.ts` | planned | pending |
| 04-02-01 | 02 | 2 | NET-01, NET-02, NET-03 | route static contract | `node -e "const fs=require('node:fs');const route=fs.readFileSync('apps/api/src/routes/network.ts','utf8');for (const token of ['/api/network/findings','/api/network/resources','/api/network/map','/api/network/resources/:resourceId']) { if (!route.includes(token)) process.exit(1); }"` | planned | pending |
| 04-02-02 | 02 | 2 | NET-01, NET-02, NET-03 | route tests | `node --import tsx --test apps/api/src/routes/network.test.ts` | planned | pending |
| 04-03-01 | 03 | 3 | NET-01, NET-03 | web build | `npx pnpm --filter @agentsmith/web build` | planned | pending |
| 04-03-02 | 03 | 3 | NET-01, NET-03 | web build | `npx pnpm --filter @agentsmith/web build` | planned | pending |
| 04-04-01 | 04 | 4 | NET-02 | web build | `npx pnpm --filter @agentsmith/web build` | planned | pending |
| 04-04-02 | 04 | 4 | NET-01, NET-02, NET-03 | web build | `npx pnpm --filter @agentsmith/web build` | planned | pending |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/network/network.repository.test.ts` - inventory and map coverage for NET-01 and NET-02
- [ ] `apps/api/src/modules/network/network.findings.test.ts` - finding ranking and suggestion coverage for NET-03
- [ ] `apps/api/src/routes/network.test.ts` - HTTP contract coverage for findings, inventory, map, and detail endpoints
- [ ] Database-backed verification path - PostgreSQL reachability for persisted network reads

---

## Manual-Only Verifications

All planned phase behaviors have an automated verify path. Manual browser review is still useful for visual clarity of confirmed versus inferred map styling, but it is not the sole gate for any requirement.

---

## Validation Sign-Off

- [x] All tasks have automated verify coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing network test references
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-27
