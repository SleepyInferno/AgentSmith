# Phase 07: Operator Shell Refresh - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Refresh the shared operator shell so the operator can move through the app without hunting for controls. This phase covers: persistent navigation consolidation, active-state styling, shared browser chrome, route context visibility, and a functional home dashboard with Agent Smith character visual. The five-tool surface is preserved — no new modules or high-trust write actions are introduced.

</domain>

<decisions>
## Implementation Decisions

### Navigation Architecture
- **D-01:** Consolidate the two-navigation conflict. The `ProtectedLayout` header nav (Dashboard/Connectors/Audit with inline styles) is replaced with a clean top bar that holds **brand mark + operator identity + sign-out only** — no nav links.
- **D-02:** The `AppShell` sidebar remains the **single navigation surface** for all primary tools (Needs Attention, Lifecycle Queue, Device Inventory, Identity Risk, Backup Confidence) and utility routes (Documentation, Connectors, Audit Log). The top bar and sidebar are non-redundant.
- **D-03:** The `ProtectedLayout` top bar should be migrated to use CSS classes consistent with the `agent-*` class system already established in the router, rather than inline styles.

### Branding
- **D-04:** Rebrand the sidebar subtitle from `s-os` → `Agent-OS`. The brand mark and title ("AgentSmith") stay as-is.

### BrowserToolbar
- **D-05:** Remove the `BrowserToolbar` component entirely. The mock Safari-style chrome strip (red/amber/green traffic-light buttons, back/forward glyphs, address bar) is removed — it adds no operator value and visual noise.

### Dashboard Shell and Content
- **D-06:** The home route (`/`) joins the full shell layout (top bar + sidebar + main stage) like every other route. The special `mockup-app-shell` divergence is eliminated.
- **D-07:** The `AssetDashboardPage` is replaced with a functional dashboard. It renders **risk summary cards per tool** — one card each for: Devices, Lifecycle, Backup, Network, and Documentation — showing current status/count (e.g. "3 at risk", "2 pending", "all green"). These cards link to their respective routes.
- **D-08:** The Agent Smith character visual is retained as a **hero/visual anchor element** above or beside the risk summary cards. The dashboard should feel like the AgentSmith ops console, not a generic enterprise grid. Use the `/gsd:ui-phase` or Impeccable skill to inform the visual design treatment.
- **D-09:** The existing hotspot-overlay navigation in `AssetDashboardPage` is replaced by the functional risk card layout. Hotspot links are no longer needed once the sidebar handles navigation.

### Review Panel
- **D-10:** The `ReviewPanel` component is removed from the shell in Phase 07. It currently displays static/mock content and adds layout complexity. It will be reintroduced in a later phase when live review actions are ready to drive it.

### Route Context Chrome
- **D-11:** Introduce a shared **page title component** rendered at the top of the main stage for each route. Each protected page renders a consistent heading (e.g. "Lifecycle Queue", "Device Inventory", "Backup Confidence") as a shared pattern. This is a layout-level contract, not per-page one-off headings.

### Responsive Behavior
- **D-12:** The refreshed shell must remain usable at common laptop and tablet widths (SHELL-03). The sidebar should not clip or overlap main content at narrower widths. Claude's discretion on exact breakpoint — the requirement is no overlap or hidden controls.

### Claude's Discretion
- Exact CSS class naming, spacing tokens, and color values within the existing green-on-dark aesthetic
- Breakpoint values and sidebar collapse/responsive behavior specifics
- Agent Smith character image asset selection (use existing `/mockups/` assets if available, or placeholder treatment)
- Risk card data shape — can use mock/static data in Phase 07; live data integration is a later concern

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and requirements
- `.planning/PROJECT.md` — Product intent, solo-admin operating model, v1.1 milestone goals
- `.planning/REQUIREMENTS.md` — SHELL-01, SHELL-02, SHELL-03 acceptance criteria for this phase
- `.planning/ROADMAP.md` — Phase 07 goal, success criteria, and relationship to Phases 08–09

### High-signal implementation files
- `apps/web/src/router.tsx` — Contains `AppShell`, `BrowserToolbar`, `ReviewPanel`, `ShellNavigationItem`, sidebar nav arrays — primary file for this phase
- `apps/web/src/routes/ProtectedLayout.tsx` — Current header nav with inline styles and sign-out logic — needs to become a clean top bar
- `apps/web/src/routes/dashboard/AssetDashboardPage.tsx` — Mockup image + hotspot overlays — to be replaced with functional risk card dashboard
- `apps/web/src/routes/LoginPage.tsx` — Auth boundary; should not be affected by shell changes

### Test infrastructure
- `apps/web/playwright.config.ts` — Playwright E2E config
- `apps/web/tests/shell-navigation.spec.ts` — Existing shell nav tests — must stay green; expand for new shell
- `apps/web/tests/auth.spec.ts` — Auth redirect behavior — must stay green
- `apps/web/vitest.config.ts` — Vitest config
- `apps/web/src/test/` — Mock utilities and render helpers

### Design reference
- `AgentSmithMockupUI.png` — Existing design reference (root of repo)

</canonical_refs>

<specifics>
## Specific Ideas

- "Rebrand the sidebar subtitle from s-os to Agent-OS" — user's exact words
- "Remove the browser very very top bar — it looks like a Safari browser with close, minimize, maximize buttons on the top left" — user confirming BrowserToolbar removal
- "Can you use Impeccable to help with this?" — user wants Impeccable design assistance for the dashboard visual treatment. Planner should include a step to run `/gsd:ui-phase` or invoke the Impeccable skill before finalizing dashboard component design.
- The dashboard should keep the Agent Smith character — "I want the Agent Smith character mockup" — integrated as a hero/visual element, not just removed in favor of plain cards.
- The green-on-dark aesthetic (neon green accents, dark background) established in v1.0 should be preserved throughout the shell refresh.

</specifics>

<deferred>
## Deferred Ideas

None raised during discussion — all topics stayed within Phase 07 scope.

</deferred>

---

*Phase: 07-operator-shell-refresh*
*Context gathered: 2026-03-29*
