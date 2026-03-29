---
phase: 07-operator-shell-refresh
plan: 04
subsystem: web/dashboard
tags: [dashboard, risk-cards, css, tests]
dependency_graph:
  requires: [07-01, 07-02, 07-03]
  provides: [functional-risk-card-dashboard]
  affects: [AssetDashboardPage, styles.css, test-files]
tech_stack:
  added: []
  patterns: [risk-card-grid, hero-image-layout]
key_files:
  created:
    - apps/web/src/components/PageTitle.tsx
  modified:
    - apps/web/src/routes/dashboard/AssetDashboardPage.tsx
    - apps/web/src/styles.css
    - apps/web/src/test/router.smoke.test.tsx
    - apps/web/tests/shell-navigation.spec.ts
    - apps/web/tests/app-smoke.spec.ts
decisions:
  - Implements D-07, D-08, D-09: replace mockup with real risk card dashboard retaining hero image
  - Created minimal PageTitle stub since plan ran in parallel with 07-03; content matches 07-03 spec exactly
metrics:
  duration: 10 min
  completed: "2026-03-29T23:15:25Z"
  tasks: 3
  files: 5
---

# Phase 07 Plan 04: Functional Risk Card Dashboard Summary

Replaced the static mockup image and hotspot overlay in AssetDashboardPage with a functional risk card dashboard: Agent Smith hero image, five operator-oriented risk summary cards, and updated aria-label assertions across three test files.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Replace AssetDashboardPage with risk card dashboard | 88e0bb5 | AssetDashboardPage.tsx, PageTitle.tsx |
| 2 | Add dashboard and risk card CSS to styles.css | 555bb9b | styles.css |
| 3 | Update three test files with new aria-label | 36c10f1 | router.smoke.test.tsx, shell-navigation.spec.ts, app-smoke.spec.ts |

## What Was Built

- `AssetDashboardPage.tsx` now renders `<section aria-label="Operator risk overview">` with the hero image and five risk cards
- Five risk summary cards link to `/devices`, `/lifecycle`, `/backup`, `/network`, `/docs` with ok/warn/critical level variants
- CSS blocks `agent-dashboard`, `agent-dashboard__hero`, `agent-dashboard__cards`, and `agent-risk-card` (with level variants) added to styles.css
- Responsive override collapses card grid to 1-column and shrinks hero image on small screens
- All three test files updated: `"AgentSmith dashboard mockup"` replaced with `"Operator risk overview"`

## Deviations from Plan

### Auto-added Missing Dependency

**1. [Rule 3 - Blocking] Created PageTitle.tsx stub**
- **Found during:** Task 1 — plan specifies `import { PageTitle } from "../../components/PageTitle"` but 07-03 was running in parallel and the file did not exist
- **Fix:** Created `apps/web/src/components/PageTitle.tsx` with the exact same implementation specified in plan 07-03, preventing a missing-module compile error
- **Files modified:** apps/web/src/components/PageTitle.tsx
- **Commit:** 88e0bb5

## Verification

- `npx pnpm test` passes: 63 API tests, 29 web unit tests, 15 E2E browser tests — all green
- `AssetDashboardPage.tsx` renders no `dashboard-home.png` and no hotspot overlay nav
- `section aria-label="Operator risk overview"` with hero image and five agent-risk-card links confirmed
- `agent-dashboard` and `agent-risk-card` CSS blocks present in styles.css

## Known Stubs

Risk card data is static (hardcoded statuses). Live data integration is deferred to a later phase per plan — this is intentional and documented in plan context. Cards correctly link to each tool route.

## Self-Check: PASSED

- apps/web/src/components/PageTitle.tsx: FOUND
- apps/web/src/routes/dashboard/AssetDashboardPage.tsx: FOUND (modified)
- apps/web/src/styles.css: FOUND (modified)
- apps/web/src/test/router.smoke.test.tsx: FOUND (modified)
- apps/web/tests/shell-navigation.spec.ts: FOUND (modified)
- apps/web/tests/app-smoke.spec.ts: FOUND (modified)
- Commit 88e0bb5: FOUND
- Commit 555bb9b: FOUND
- Commit 36c10f1: FOUND
