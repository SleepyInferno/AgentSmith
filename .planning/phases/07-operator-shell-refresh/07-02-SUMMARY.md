---
phase: 07-operator-shell-refresh
plan: 02
subsystem: web-shell
tags: [top-bar, css, navigation, tests, layout]
dependency_graph:
  requires: [07-01]
  provides: [agent-topbar-classes, topbar-height-variable, sidebar-subtitle]
  affects: [ProtectedLayout, styles.css, router, app-smoke, shell-navigation]
tech_stack:
  added: []
  patterns: [BEM CSS classes, CSS custom properties, sticky header]
key_files:
  created: []
  modified:
    - apps/web/src/routes/ProtectedLayout.tsx
    - apps/web/src/styles.css
    - apps/web/src/router.tsx
    - apps/web/tests/app-smoke.spec.ts
    - apps/web/tests/shell-navigation.spec.ts
decisions:
  - "D-01/D-02/D-03: Consolidated navigation to sidebar only — top bar holds identity and session controls only"
  - "D-04: Sidebar subtitle renamed from 's-os' to 'Agent-OS'"
metrics:
  duration: "~2 min"
  completed: "2026-03-29"
  tasks: 3
  files: 5
---

# Phase 07 Plan 02: Clean Top Bar and Sidebar Subtitle Summary

Clean top bar with brand mark, operator identity, and sign-out only — no competing nav in the header.

## What Was Built

Replaced the inline-styled `ProtectedLayout` header (which had three `NavLink` elements and a `navLinkStyle` function creating a competing nav surface) with a class-driven `agent-topbar` structure. The top bar now shows brand mark, "AgentSmith" brand name, operator identity section, and a sign-out button — all using `agent-topbar` BEM classes with no inline styles.

Added the full `agent-topbar` CSS block to `styles.css` and set `--topbar-height: 60px` in `:root`, which provides the authoritative value for the `agent-console` `min-height` calc introduced in Plan 07-01 (which used a `60px` fallback).

Updated the sidebar subtitle in `router.tsx` from `s-os` to `Agent-OS` per decision D-04.

Removed test references to the now-deleted `Primary auth navigation` label and `.first()` Connectors disambiguators from `app-smoke.spec.ts` and `shell-navigation.spec.ts`.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Refactor ProtectedLayout top bar and update sidebar subtitle | dff471b |
| 2 | Add agent-topbar CSS rules and --topbar-height variable | b1f7ff1 |
| 3 | Remove Primary auth navigation scoping and .first() disambiguators from tests | 1355951 |

## Verification

`npx pnpm test` exits 0:
- 63 API tests passed
- 29 web unit tests passed
- 15 Playwright browser tests passed

## Success Criteria Check

- [x] `ProtectedLayout.tsx` header render has zero inline `style={{}}` props
- [x] `ProtectedLayout.tsx` has no `<NavLink>` elements or `navLinkStyle` function
- [x] `agent-topbar` CSS block exists in `styles.css` with `--topbar-height: 60px` in `:root`
- [x] Sidebar subtitle in `router.tsx` reads `Agent-OS`
- [x] `app-smoke.spec.ts` no longer references `"Primary auth navigation"` label
- [x] `shell-navigation.spec.ts` no longer uses `.first()` Connectors disambiguator
- [x] `npx pnpm test` exits 0

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all changes are structural/visual with no data stubs.

## Self-Check: PASSED
