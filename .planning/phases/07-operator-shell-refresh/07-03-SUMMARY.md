---
phase: 07-operator-shell-refresh
plan: 03
subsystem: web-routes
tags: [shell, page-title, consistency, css]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [shared-page-title-component, uniform-route-headings]
  affects: [all-protected-routes]
tech_stack:
  added: []
  patterns: [shared-presentational-component, css-bem-classes]
key_files:
  created:
    - apps/web/src/components/PageTitle.tsx
  modified:
    - apps/web/src/styles.css
    - apps/web/src/routes/assets/DeviceInventoryPage.tsx
    - apps/web/src/routes/assets/DeviceDetailPage.tsx
    - apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx
    - apps/web/src/routes/lifecycle/LifecycleRunDetailPage.tsx
    - apps/web/src/routes/backup/BackupOverviewPage.tsx
    - apps/web/src/routes/backup/BackupInventoryPage.tsx
    - apps/web/src/routes/backup/BackupDetailPage.tsx
    - apps/web/src/routes/network/NetworkOverviewPage.tsx
    - apps/web/src/routes/network/NetworkMapPage.tsx
    - apps/web/src/routes/network/NetworkInventoryPage.tsx
    - apps/web/src/routes/network/NetworkDetailPage.tsx
    - apps/web/src/routes/docs/DocumentationOverviewPage.tsx
    - apps/web/src/routes/docs/DocumentationSearchPage.tsx
    - apps/web/src/routes/docs/DocumentationDetailPage.tsx
    - apps/web/src/routes/connectors/ConnectorStatusPage.tsx
    - apps/web/src/routes/audit/AuditTrailPage.tsx
decisions:
  - ConnectorStatusPage and AuditTrailPage demoted their h1 headings to h2 so existing test assertions finding those content headings by role continue to pass, while PageTitle provides the page-level h1.
metrics:
  duration: "5 min"
  completed: "2026-03-29"
  tasks: 2
  files: 17
---

# Phase 07 Plan 03: Shared PageTitle Component Summary

Shared presentational `PageTitle` component rendering an h1 with BEM CSS classes at the top of every protected route's main stage content.

## What Was Built

Task 1 — Created `apps/web/src/components/PageTitle.tsx` exporting the `PageTitle` component (title + optional eyebrow props) and added the `agent-page-title`, `agent-page-title__eyebrow`, and `agent-page-title__heading` CSS rules to `apps/web/src/styles.css` immediately after the topbar block.

Task 2 — Added `<PageTitle title="..." />` as the first child of the outermost return element in all 16 protected route pages. Existing in-page content headings (such as "Filterable device inventory", "Lifecycle workflows", "Site topology", "Connector status", "Audit trail") were preserved as either h2 or plain content — none removed — so test assertions that find those strings by text or heading role continue to pass.

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] ConnectorStatusPage h1 demoted to h2**
- **Found during:** Task 2
- **Issue:** ConnectorStatusPage had `<h1>Connector status</h1>` as its page title. Adding `<PageTitle title="Connectors" />` (which also renders an h1) would produce two h1s on the page and break the shell-navigation Playwright test that asserts `getByRole("heading", { name: "Connector status" })`.
- **Fix:** Demoted the existing h1 to h2. The heading text and role are preserved so the test assertion still matches. PageTitle's h1 "Connectors" is now the page-level title.
- **Files modified:** `apps/web/src/routes/connectors/ConnectorStatusPage.tsx`
- **Commit:** 2147723

**2. [Rule 2 - Missing critical functionality] AuditTrailPage h1 demoted to h2**
- **Found during:** Task 2
- **Issue:** Same situation — `<h1>Audit trail</h1>` existed as page title; shell-navigation test asserts it by heading role.
- **Fix:** Demoted to h2. Text and role preserved. PageTitle provides the page-level h1 "Audit Log".
- **Files modified:** `apps/web/src/routes/audit/AuditTrailPage.tsx`
- **Commit:** 2147723

## Test Results

`npx pnpm test` passed fully:
- API: 63/63 pass
- Web unit: 29/29 pass
- Playwright e2e: 15/15 pass

## Known Stubs

None — all 16 route files now render PageTitle with their canonical title string directly from the route-to-title mapping in the plan.

## Self-Check: PASSED
