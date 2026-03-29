---
phase: 07-operator-shell-refresh
plan: "01"
subsystem: ui
tags: [react, css-grid, shell, layout, playwright, vitest]

requires:
  - phase: 06-documentation-assistant
    provides: Full five-tool web app with all routes and test infrastructure

provides:
  - Unified AppShell with single code path (no home-route branch)
  - BrowserToolbar and ReviewPanel removed from shell
  - 2-column CSS grid layout for agent-console
  - Dead CSS blocks removed (mockup-app-shell, agent-browser, agent-review-panel)
  - Updated e2e tests that pass without removed components

affects: [07-02, 07-03, 07-04, 07-05]

tech-stack:
  added: []
  patterns:
    - "Shell unification: home route joins same AppShell as all other routes"
    - "CSS custom property forward-reference: --topbar-height defaults to 60px for Plan 07-02 compatibility"
    - "Test disambiguation: .first() on sidebar links when hotspot links exist in same DOM"

key-files:
  created: []
  modified:
    - apps/web/src/router.tsx
    - apps/web/src/styles.css
    - apps/web/tests/shell-navigation.spec.ts
    - apps/web/tests/app-smoke.spec.ts

key-decisions:
  - "Home route now renders inside AppShell with sidebar visible — eliminates the mockup-app-shell divergence (D-06)"
  - "BrowserToolbar removed — mock Safari chrome adds no operator value (D-05)"
  - "ReviewPanel removed — static/mock content will be reintroduced later with live data (D-10)"
  - "agent-console grid reduced from 3-column to 2-column (sidebar + main stage)"
  - "All dead CSS removed in same pass as component deletions"
  - "Test navigation updated to use sidebar links (via .first()) instead of invisible hotspot links"

patterns-established:
  - "Plan 07-01: Remove dead shell components before adding new shell content"

requirements-completed:
  - SHELL-01
  - SHELL-03

duration: 12min
completed: 2026-03-29
---

# Phase 07 Plan 01: Remove Dead Shell Components and Unify Layout Summary

**BrowserToolbar and ReviewPanel deleted, AppShell unified to single code path, CSS grid collapsed from 3-column to 2-column, all dead CSS blocks removed, and tests updated — all 78 tests green.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-29T22:50:18Z
- **Completed:** 2026-03-29T23:02:25Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Deleted `BrowserToolbar` function (mock Safari chrome with traffic-light buttons) from `router.tsx`
- Deleted `ReviewPanel` function (static mock review panel with fake account data) from `router.tsx`
- Rewrote `AppShell` to a single code path — home route (`/`) no longer renders a `mockup-app-shell` wrapper; it now renders inside `agent-shell > agent-console` with the sidebar visible
- Removed `useLocation` import from `react-router-dom` (no longer used after AppShell rewrite)
- Updated `agent-console` CSS from `266px minmax(0, 1fr) 324px` to `266px minmax(0, 1fr)` with `--topbar-height` custom property for forward-compatibility with Plan 07-02's topbar
- Removed dead CSS blocks: `.mockup-app-shell`, `.mockup-dashboard*`, `.agent-browser*`, `.agent-review-panel*`
- Updated responsive media queries to remove `agent-browser` and `agent-review-panel` rules
- Removed Review Panel heading visible assertion from `shell-navigation.spec.ts` (component is gone)
- Updated `app-smoke.spec.ts` and `shell-navigation.spec.ts` to use sidebar navigation links instead of invisible hotspot links

## Files Created/Modified

- `apps/web/src/router.tsx` — Removed BrowserToolbar, ReviewPanel; unified AppShell to single path
- `apps/web/src/styles.css` — 2-col grid, removed dead CSS blocks, updated responsive rules
- `apps/web/tests/shell-navigation.spec.ts` — Removed Review Panel assertion; updated to sidebar navigation
- `apps/web/tests/app-smoke.spec.ts` — Updated hotspot navigation to sidebar navigation with .first() disambiguation

## Decisions Made

- Home route joins the full shell layout immediately — the `if (location.pathname === "/")` branch is gone.
- `--topbar-height: 60px` CSS custom property added as a default in `agent-console` min-height; Plan 07-02 will set this variable on the topbar element, making this forward-compatible without requiring a back-patch.
- Test navigation updated to use `.first()` on sidebar links to disambiguate from hotspot links that remain in the DOM (AssetDashboardPage hotspots are still present until Plan 07-04 replaces the dashboard).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test navigation from invisible hotspot links to sidebar links**
- **Found during:** Task 3 (test update) — e2e tests failed after tasks 1+2
- **Issue:** `shell-navigation.spec.ts` and `app-smoke.spec.ts` used hotspot link selectors (e.g. "Device Inventory navigation", "Backup Confidence navigation", "Lifecycle Queue") that were either invisible (hotspot CSS removed) or ambiguous (2 elements — sidebar + hotspot)
- **Fix:** Changed navigation assertions to use sidebar links with `.first()` disambiguator; removed hotspot-specific navigation calls
- **Files modified:** `apps/web/tests/shell-navigation.spec.ts`, `apps/web/tests/app-smoke.spec.ts`
- **Verification:** All 15 e2e tests pass

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: test navigation updated for new shell layout)
**Impact on plan:** Required fix — the CSS removal made hotspot links invisible, and the sidebar unification created duplicate link matches. Fixes were minimal and directly caused by Tasks 1+2.

## Self-Check: PASSED

Files verified:
- FOUND: apps/web/src/router.tsx
- FOUND: apps/web/src/styles.css
- FOUND: apps/web/tests/shell-navigation.spec.ts
- FOUND: apps/web/tests/app-smoke.spec.ts

Commits verified:
- FOUND: 3e172cf — feat(07-01): remove dead shell components and unify layout
- FOUND: 62b5b1d — chore(07-01): sync pre-existing changes from main branch to worktree
- FOUND: 47b3566 — chore(07-01): add remaining e2e test files to worktree

Success criteria verified:
- PASS: No location.pathname branch in AppShell
- PASS: BrowserToolbar removed from router.tsx
- PASS: ReviewPanel removed from router.tsx
- PASS: agent-console is 2-column (266px minmax(0, 1fr))
- PASS: .mockup-app-shell CSS removed
- PASS: .agent-browser CSS removed
- PASS: .agent-review-panel CSS removed
- PASS: npx pnpm test exits 0 (63 API + 29 unit + 15 e2e = 107 tests green)
