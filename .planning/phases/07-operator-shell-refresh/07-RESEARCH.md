# Phase 07: Operator Shell Refresh - Research

**Researched:** 2026-03-29
**Domain:** React shell layout, CSS class architecture, navigation consolidation, dashboard replacement
**Confidence:** HIGH

## Summary

Phase 07 is a contained refactor of two files (`router.tsx` and `ProtectedLayout.tsx`) plus one page replacement (`AssetDashboardPage.tsx`). The entire app shell lives in `router.tsx` — `AppShell`, `BrowserToolbar`, `ReviewPanel`, and `ShellNavigationItem` are all defined there alongside the route table. `ProtectedLayout.tsx` adds a second, competing header nav with inline styles and redundant nav links (Dashboard / Connectors / Audit). The home route (`/`) bypasses the shared shell layout entirely via a `mockup-app-shell` special case. `AssetDashboardPage.tsx` renders a PNG mockup with transparent hotspot overlays — it has no data rendering at all.

The decisions in CONTEXT.md form a clean, ordered set of changes: remove `BrowserToolbar` (D-05), remove `ReviewPanel` from the shell (D-10), fix the home route divergence (D-06), strip nav links from `ProtectedLayout` to leave brand + identity + sign-out only (D-01/D-02/D-03), rename the sidebar subtitle (D-04), introduce a `PageTitle` component (D-11), replace `AssetDashboardPage` with a risk-card dashboard (D-07/D-08/D-09), and enforce responsive shell behavior (D-12).

The CSS class system (`agent-*`) is already established and well-formed in `styles.css`. No new CSS library is needed — all new classes can extend the existing `agent-*` naming convention. The existing responsive breakpoints (1180px, 860px, 640px) already cover the `agent-console` grid but they currently depend on `BrowserToolbar` sizing (`calc(100vh - 71px)`). Removing `BrowserToolbar` will require adjusting that height calculation.

**Primary recommendation:** Execute changes in component-removal order (remove what the layout no longer needs, then fix the divergence, then add new pieces), so each step leaves tests green rather than breaking in the middle.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `ProtectedLayout` header nav (Dashboard/Connectors/Audit with inline styles) replaced with a clean top bar holding brand mark + operator identity + sign-out only.
- **D-02:** `AppShell` sidebar remains the single navigation surface. Top bar and sidebar are non-redundant.
- **D-03:** `ProtectedLayout` top bar migrated to CSS classes consistent with the `agent-*` class system, not inline styles.
- **D-04:** Rebrand sidebar subtitle from `s-os` to `Agent-OS`.
- **D-05:** Remove `BrowserToolbar` component entirely.
- **D-06:** Home route (`/`) joins the full shell layout like every other route; special `mockup-app-shell` divergence eliminated.
- **D-07:** `AssetDashboardPage` replaced with a functional dashboard rendering risk summary cards per tool (one card each for Devices, Lifecycle, Backup, Network, Documentation), showing current status/count, linking to respective routes.
- **D-08:** Agent Smith character visual retained as hero/visual anchor above or beside risk summary cards.
- **D-09:** Hotspot-overlay navigation in `AssetDashboardPage` replaced by functional risk card layout.
- **D-10:** `ReviewPanel` removed from the shell in Phase 07.
- **D-11:** Introduce a shared page title component at the top of the main stage for each route.
- **D-12:** Shell must remain usable at common laptop and tablet widths — no overlap or hidden controls.

### Claude's Discretion
- Exact CSS class naming, spacing tokens, and color values within the existing green-on-dark aesthetic
- Breakpoint values and sidebar collapse/responsive behavior specifics
- Agent Smith character image asset selection (use `/mockups/hero-agent-smith.png` or `/mockups/dashboard-home.png`)
- Risk card data shape — can use mock/static data in Phase 07; live data integration is a later concern

### Deferred Ideas (OUT OF SCOPE)
None raised during discussion — all topics stayed within Phase 07 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHELL-01 | Operator can move between primary tools and utility routes from persistent navigation with clear active-state feedback. | Sidebar nav already has `agent-sidebar__item--active` class applied via NavLink; D-01/D-02 consolidation makes sidebar the single surface. |
| SHELL-02 | Operator can understand where they are and what to do next from shared shell chrome, route context, and review-side infrastructure. | D-11 page title component, D-06 home route fix, D-07 functional dashboard; all routes gain consistent chrome framing. |
| SHELL-03 | Operator can use the shell comfortably on common laptop and tablet widths without clipped, overlapping, or hidden navigation. | Existing breakpoints at 1180px/860px/640px cover console grid; removing BrowserToolbar and ReviewPanel from Phase 07 simplifies the grid from 3-col to 2-col, requiring breakpoint updates. |
</phase_requirements>

---

## Current Shell Architecture

### Component Map (all in `apps/web/src/router.tsx`)

| Component | Lines | Role | Phase 07 Action |
|-----------|-------|------|-----------------|
| `SidebarIcon` | 44–116 | Renders SVG icon per nav item type | Retain unchanged |
| `ShellNavigationItem` | 118–144 | NavLink wrapper applying `agent-sidebar__item--active` | Retain unchanged |
| `BrowserToolbar` | 146–167 | Mock Safari chrome (traffic-light buttons, address bar) | **Remove entirely (D-05)** |
| `ReviewPanel` | 169–231 | Static/mock review panel with hardcoded content | **Remove from shell (D-10)** |
| `AppShell` | 233–284 | Shell layout container; routes home to `mockup-app-shell`, all others to 3-col console | **Refactor: unify home route (D-06), remove BrowserToolbar/ReviewPanel, make 2-col layout** |
| Route table | 290–329 | `appRoutes` array, `createAppRouter`, exported `router` | No structural change; child routes unchanged |

### `ProtectedLayout.tsx` — What Exists

The component has two logical sections:

1. **Auth guard** (lines 60–95) — `useSession` check, `isLoading` LoadingShell, `Navigate` redirect for unauthenticated users, `handleSignOut` with API call, `queryClient.clear()`, error state. This logic is correct and must be preserved verbatim.

2. **Header render** (lines 97–173) — A sticky `<header>` with all inline styles, containing:
   - A brand/identity block showing "Protected Operator Shell" label + `user.displayName`
   - A `<nav aria-label="Primary auth navigation">` with NavLinks to `/`, `/connectors`, `/audit` — **this entire nav block is removed (D-01)**
   - A sign-out button with inline styles — **kept but migrated to CSS classes (D-03)**

The `<Outlet />` at line 172 passes through to `AppShell`.

### `AssetDashboardPage.tsx` — What Exists

Entirely mockup-driven: an `<img>` with `src="/mockups/dashboard-home.png"` wrapped in a `<section className="mockup-dashboard">`, overlaid with 11 `<Link>` components absolutely positioned by percentage coordinates. No data fetching, no components, no state. The container class `mockup-dashboard` is sized relative to `mockup-app-shell` which centers it on a full-viewport background — both disappear with D-06/D-07.

### Navigation Data Structures

```typescript
// primaryItems — sidebar primary tools
const primaryItems: NavItem[] = [
  { to: "/", label: "Needs Attention", icon: "attention", badge: "!", end: true },
  { to: "/lifecycle", label: "Lifecycle Queue", icon: "list", badge: "W" },
  { to: "/devices", label: "Device Inventory", icon: "devices" },
  { to: "/network", label: "Identity Risk", icon: "identity" },
  { to: "/backup", label: "Backup Confidence", icon: "backup" },
];

// utilityItems — sidebar utility routes
const utilityItems: NavItem[] = [
  { to: "/docs", label: "Documentation", icon: "docs" },
  { to: "/connectors", label: "Connectors", icon: "connectors" },
  { to: "/audit", label: "Audit Log", icon: "audit" },
];
```

Active state is handled by NavLink's `className` callback: `isActive ? "agent-sidebar__item agent-sidebar__item--active" : "agent-sidebar__item"`. The `end: true` flag on the home item prevents `/` from matching as active on all routes.

---

## CSS / Styling Patterns

### Design Token Inventory (from `styles.css` `:root`)

| Token | Value | Use |
|-------|-------|-----|
| `--bg-void` | `#060905` | Outermost background |
| `--bg-panel` | `rgba(10,17,11,0.88)` | Card/panel backgrounds |
| `--line-soft` | `rgba(129,255,164,0.14)` | Subtle borders |
| `--line-strong` | `rgba(132,255,167,0.34)` | Active/focus borders |
| `--text-main` | `#dff4d3` | Body copy |
| `--text-dim` | `#9eb79b` | Secondary copy |
| `--accent` | `#89ff93` | Neon green primary accent |
| `--accent-soft` | `rgba(135,255,144,0.16)` | Accent fill backgrounds |
| `--amber` | `#f4c049` | Warning/watch state |
| `--danger` | `#d85d46` | Critical/error state |
| `--chartreuse` | `#a8d851` | Secondary positive state |

### `agent-*` Class Naming Convention

All shell structural classes follow `agent-{block}` or `agent-{block}__{element}` or `agent-{block}___{element}--{modifier}` BEM-style naming. Established blocks:

- `agent-shell` — outermost container (4px padding wrapper)
- `agent-browser` — BrowserToolbar (being removed)
- `agent-console` — 3-col grid: `266px | 1fr | 324px`
- `agent-sidebar` — left nav column
- `agent-sidebar__brand`, `__brand-mark`, `__brand-title`, `__brand-subtitle` — branding block
- `agent-sidebar__nav`, `__nav--utility` — nav section
- `agent-sidebar__item`, `__item--active`, `__item--ghost` — nav item states
- `agent-sidebar__icon`, `__label`, `__badge` — nav item internals
- `agent-main-stage` — content area
- `agent-review-panel` — right panel (being removed from shell)

### New Classes to Introduce

For the clean top bar replacing the inline-style header (D-03):

```css
/* suggested pattern consistent with agent-* system */
.agent-topbar               /* sticky header wrapper */
.agent-topbar__brand        /* brand mark + "AgentSmith" brand label */
.agent-topbar__identity     /* operator identity block (displayName) */
.agent-topbar__signout      /* sign-out button */
```

For the page title component (D-11):

```css
.agent-page-title           /* wrapper at top of main stage */
.agent-page-title__heading  /* h1 or h2 with current route name */
.agent-page-title__eyebrow  /* optional context label above heading */
```

For the risk card dashboard (D-07):

```css
.agent-dashboard            /* grid container */
.agent-dashboard__hero      /* Agent Smith image + brand copy */
.agent-dashboard__cards     /* card grid row */
.agent-risk-card            /* individual tool summary card */
.agent-risk-card__title     /* tool name */
.agent-risk-card__status    /* count or "all green" summary */
.agent-risk-card__link      /* CTA link to tool route */
```

All new class names follow the established `agent-{block}__{element}` pattern. Avoid adding inline styles — D-03 is explicit about CSS classes.

---

## Architecture Patterns

### Recommended Project Structure After Phase 07

The shell remains entirely in `router.tsx` and `ProtectedLayout.tsx`. No new files are required for structural changes. New additions:

```
apps/web/src/
├── router.tsx                        # AppShell refactored — no BrowserToolbar, no ReviewPanel, home route unified
├── routes/
│   ├── ProtectedLayout.tsx           # Clean top bar with agent-topbar classes; no nav links
│   ├── dashboard/
│   │   └── AssetDashboardPage.tsx    # Replaced: risk cards + Agent Smith hero
│   └── [all other routes unchanged]
├── components/
│   └── PageTitle.tsx                 # New: shared page title component (D-11)
├── styles.css                        # Extended: agent-topbar, agent-page-title, agent-dashboard, agent-risk-card
```

### Pattern 1: Unified AppShell Layout

Remove the `if (location.pathname === "/")` branch entirely. After D-06, home route joins the same `agent-shell` / `agent-console` layout as all other routes.

```typescript
// Before (two code paths)
function AppShell() {
  const location = useLocation();
  if (location.pathname === "/") {
    return <main className="mockup-app-shell"><Outlet /></main>;
  }
  return (
    <div className="agent-shell">
      <BrowserToolbar />
      <div className="agent-console"> ... <ReviewPanel /> </div>
    </div>
  );
}

// After (single path)
function AppShell() {
  return (
    <div className="agent-shell">
      <div className="agent-console">
        <aside className="agent-sidebar"> ... </aside>
        <section className="agent-main-stage"><Outlet /></section>
      </div>
    </div>
  );
}
```

The `agent-console` grid shrinks from `266px 1fr 324px` (3-col) to `266px 1fr` (2-col) once ReviewPanel is removed.

### Pattern 2: Clean ProtectedLayout Top Bar

Auth guard logic is preserved as-is. The header render section migrates from inline styles to `agent-topbar` classes:

```tsx
// After: header uses only CSS classes
<header className="agent-topbar">
  <div className="agent-topbar__brand">
    {/* brand mark svg + "AgentSmith" */}
  </div>
  <div className="agent-topbar__identity">
    <span className="agent-topbar__label">Protected Operator Shell</span>
    <strong className="agent-topbar__user">{user.displayName}</strong>
  </div>
  <div className="agent-topbar__actions">
    <button type="button" className="agent-topbar__signout" ...>
      {isSigningOut ? "Signing out..." : "Sign out"}
    </button>
    {signOutError ? <span className="agent-topbar__error">{signOutError}</span> : null}
  </div>
</header>
```

No `<nav>` element. No NavLinks. Sign-out logic and error state remain unchanged.

### Pattern 3: Shared PageTitle Component

A small presentational component rendered inside each protected route's page content, at the top of the main stage:

```tsx
// apps/web/src/components/PageTitle.tsx
type PageTitleProps = {
  title: string;
  eyebrow?: string;
};

export function PageTitle({ title, eyebrow }: PageTitleProps) {
  return (
    <div className="agent-page-title">
      {eyebrow ? <p className="agent-page-title__eyebrow">{eyebrow}</p> : null}
      <h1 className="agent-page-title__heading">{title}</h1>
    </div>
  );
}
```

Each protected page imports and places `<PageTitle title="..." />` at the top of its return. This is a layout-level contract. Each route already has its own heading pattern — PageTitle replaces or unifies those ad-hoc headings.

### Pattern 4: Risk Card Dashboard

Static data in Phase 07. Five cards, one per tool. The Agent Smith character image (`/mockups/hero-agent-smith.png`) acts as hero.

```tsx
const riskSummaries = [
  { label: "Device Inventory",     to: "/devices",   status: "3 at risk",  level: "warn" },
  { label: "Lifecycle Queue",       to: "/lifecycle", status: "2 pending",  level: "warn" },
  { label: "Backup Confidence",     to: "/backup",    status: "1 flagged",  level: "warn" },
  { label: "Network Visibility",    to: "/network",   status: "All clear",  level: "ok" },
  { label: "Documentation",         to: "/docs",      status: "2 overdue",  level: "warn" },
];
```

Card links use React Router `<Link to={...}>`. Status levels map to color variants using existing tokens (`--amber`, `--danger`, `--accent`).

### Anti-Patterns to Avoid

- **Inline styles in new code:** D-03 forbids inline styles in the top bar. Do not introduce inline styles in PageTitle or risk cards either — extend `styles.css`.
- **Duplicating nav links in ProtectedLayout:** D-01/D-02 resolve a navigation conflict. Do not add any `<NavLink>` or `<Link>` to routes inside `ProtectedLayout`.
- **Per-page heading divergence:** Do not let routes continue to use ad-hoc `<h1>` patterns after PageTitle is introduced. PageTitle is the contract.
- **Keeping `mockup-app-shell` classes:** After D-06, `.mockup-app-shell` and `.mockup-dashboard` CSS blocks are unused. They can be removed from `styles.css` to avoid confusion.
- **Keeping agent-browser CSS blocks:** After removing BrowserToolbar, the `.agent-browser`, `.agent-browser__lights`, `.agent-browser__light--*`, `.agent-browser__controls`, `.agent-browser__glyph`, `.agent-browser__address` CSS is dead. Remove it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active nav state | Manual `useLocation` comparisons | React Router `NavLink` with `className` callback | Already in use; NavLink handles end-matching, aria-current, and all edge cases |
| CSS variables for theming | Component-level inline vars | Established `:root` tokens in `styles.css` | All tokens exist; use `var(--accent)` etc. |
| Responsive sidebar | JS-driven show/hide | CSS grid + media queries | Already established at 1180px/860px/640px breakpoints; extend, don't replace |
| Auth redirect | Custom redirect logic | Existing `Navigate` + `useSession` pattern in ProtectedLayout | Correct pattern already tested; don't duplicate |
| Sign-out flow | Anything new | Existing `handleSignOut` in ProtectedLayout | Tested in both Vitest and Playwright; preserve exactly |

---

## Breaking Change Analysis

### Tests that will break and must be updated

**`apps/web/tests/app-smoke.spec.ts` — multiple failures expected:**

1. Line 35: `getByLabel("AgentSmith dashboard mockup")` — label belongs to the old `<section>` in `AssetDashboardPage`. Must be updated to assert the new dashboard landmark.
2. Line 57: `getByLabel("Primary auth navigation")` — the `<nav aria-label="Primary auth navigation">` is removed from `ProtectedLayout`. This locator will not find any element. Must be updated to use sidebar nav or remove the `.first()` selector that disambiguates Connectors links.
3. Line 70: `getByRole("link", { name: "Backup Confidence navigation" })` — this label belongs to a hotspot link in the old `AssetDashboardPage`. After D-09, hotspot links are gone. Must be updated to navigate to backup via sidebar.

**`apps/web/tests/shell-navigation.spec.ts` — multiple failures expected:**

1. Line 8: `getByLabel("AgentSmith dashboard mockup")` — same as above; old label.
2. Line 9: `toHaveCount(0)` for "Review Panel" heading — after D-10 this assertion still passes but the reason changes. Low risk; assertion may become vacuous.
3. Line 14: `getByRole("heading", { name: "Review Panel" }).toBeVisible()` on `/devices` — ReviewPanel is removed from the shell. **This assertion will fail.** Must be removed.
4. Line 21: `getByRole("link", { name: "Connectors" }).first().click()` — the `.first()` disambiguator exists because Connectors appears in both ProtectedLayout nav and sidebar. After D-01, it appears in sidebar only. The `.first()` is harmless but the `.getByLabel("Primary auth navigation")` scope (line 57 of app-smoke) will fail. The raw `.getByRole("link", { name: "Connectors" })` without `.first()` will work.
5. Line 24: `getByRole("link", { name: "Connectors" }).first()` for `aria-current` — same concern.

**`apps/web/src/test/router.smoke.test.tsx` — one failure expected:**

1. Line 7: `{ path: "/", finder: () => screen.findByLabelText("AgentSmith dashboard mockup") }` — the `aria-label` on the dashboard section is gone. Must be updated to match new dashboard content.

**`apps/web/src/routes/ProtectedLayout.test.tsx` — review required, likely passes:**

Tests assert "Sign out" button, "Loading protected workspace", redirect behavior, and sign-out error display. None of these depend on the nav links being present. Auth logic is preserved. These tests should pass after the top bar refactor. However, if any test queries by `aria-label="Primary auth navigation"`, it will fail.

Scanning `ProtectedLayout.test.tsx` lines 81–153: no test queries `Primary auth navigation`. Tests use role-based queries for "Sign out" button and text assertions. All should pass without modification.

### CSS dead code after Phase 07

Once changes are complete, these CSS blocks in `styles.css` are dead and should be removed:

- `.mockup-app-shell` (lines 82–91)
- `.mockup-dashboard`, `.mockup-dashboard__frame`, `.mockup-dashboard__image`, `.mockup-dashboard__hotspots`, `.mockup-dashboard__hotspot`, `.mockup-dashboard__hotspot:focus-visible` (lines 92–128)
- `.agent-browser`, `.agent-browser__lights`, `.agent-browser__light`, `.agent-browser__light--red/amber/green`, `.agent-browser__controls`, `.agent-browser__glyph`, `.agent-browser__address` (lines 130–194)
- `.agent-review-panel` and all its sub-classes (lines 399–518)
- `@media (max-width: 860px) .agent-browser` block (lines 971–977)
- The `@media (max-width: 1180px) .agent-review-panel` rule (lines 956–959) needs updating since the grid changes from 3-col to 2-col

### `agent-console` Grid Change

Current: `grid-template-columns: 266px minmax(0, 1fr) 324px`

After D-10 (ReviewPanel removed): `grid-template-columns: 266px minmax(0, 1fr)`

The `min-height: calc(100vh - 71px)` on `.agent-console` references `BrowserToolbar` height (71px). After D-05/D-06, the console fills the full viewport below the new `agent-topbar`. This calculation changes — measure `agent-topbar` height and update, or use `min-height: calc(100vh - var(--topbar-height))` with a CSS custom property.

Responsive media queries that reference the 3-col grid require updating:
- `@media (max-width: 1180px)` rule that sets `grid-template-columns: 240px minmax(0, 1fr)` already collapses to 2-col at this breakpoint — safe to keep
- The `agent-review-panel` rules within the 1180px query become dead code

---

## Responsive Behavior

### Current Breakpoint Behavior

| Width | Layout |
|-------|--------|
| `>1180px` | 3-col console (sidebar 266px + main + review 324px) |
| `≤1180px` | 2-col (sidebar 240px + main); review panel collapses below as row spanning full width |
| `≤860px` | 1-col; sidebar stacks above main; sidebar nav becomes 2-col grid |
| `≤640px` | 1-col; no padding on shell/dashboard; nav items in single column |

### After Phase 07

The 3-col case disappears. The shell becomes 2-col at all widths above 860px. The responsive story simplifies:

| Width | Layout |
|-------|--------|
| `>860px` | 2-col (sidebar 240–266px + main) |
| `≤860px` | 1-col; sidebar stacks above main as horizontal bar |
| `≤640px` | 1-col; sidebar nav single column |

For D-12 (tablet usability), the critical concern is the 860px–1024px range (common laptop widths). At 860px the sidebar currently switches to a stacked horizontal bar with a 2-col nav grid. This works for tablet. The planner can choose to keep existing breakpoints or introduce an intermediate collapse (e.g. icon-only sidebar at 900–1100px). Either approach satisfies D-12 as long as there is no overlap or hidden controls.

**Simplest approach satisfying D-12:** Keep the existing three breakpoints. Remove the BrowserToolbar and ReviewPanel rules. Update the `agent-console` grid column definition. No new breakpoints required unless testing reveals a problem.

---

## Implementation Sequencing

Recommended order within Phase 07. Each step leaves the app in a passing-test state.

### Wave 1 — Remove dead components and fix layout
1. Remove `BrowserToolbar` from `AppShell` render and delete the function (D-05)
2. Remove `ReviewPanel` from `AppShell` render and delete the function (D-10)
3. Remove the `if (location.pathname === "/")` branch in `AppShell`, unify to single layout (D-06)
4. Update `agent-console` CSS: 3-col → 2-col, fix min-height calculation
5. Remove dead CSS (mockup-*, agent-browser-*, agent-review-panel-*)
6. Update broken tests: remove ReviewPanel heading assertion, remove `mockup-dashboard` label assertion

### Wave 2 — ProtectedLayout top bar
7. Strip nav links from `ProtectedLayout` header (D-01/D-02)
8. Migrate header from inline styles to `agent-topbar` CSS classes (D-03)
9. Add `agent-topbar` rules to `styles.css`
10. Update tests that reference `aria-label="Primary auth navigation"` or use `.first()` to disambiguate Connectors
11. Update sidebar brand subtitle: `s-os` → `Agent-OS` (D-04)

### Wave 3 — New content
12. Implement `PageTitle` component (D-11); add `agent-page-title` CSS classes
13. Add `<PageTitle>` to each protected route's page component
14. Replace `AssetDashboardPage` with risk card dashboard + Agent Smith hero (D-07/D-08/D-09)
15. Add `agent-dashboard` and `agent-risk-card` CSS classes
16. Update `router.smoke.test.tsx` finder for home route
17. Expand `shell-navigation.spec.ts` to assert new dashboard landmark, PageTitle presence on routes, sidebar-only nav, and sign-out in clean top bar

### Wave 4 — Responsive verification
18. Visual check at 1280px, 1024px, 860px, 768px widths
19. Confirm no overlap or hidden controls (D-12)
20. Add Playwright viewport variants if any breakpoint needs automated coverage

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 1.x (unit/component) + Playwright (E2E) |
| Vitest config | `apps/web/vitest.config.ts` |
| Playwright config | `apps/web/playwright.config.ts` |
| Quick run command | `npx pnpm --filter @agentsmith/web test` |
| Full suite command | `npx pnpm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| SHELL-01 | Sidebar nav items navigate to each primary route with correct `aria-current="page"` | E2E (Playwright) | `npx pnpm --filter @agentsmith/web test:e2e` | Partial — `shell-navigation.spec.ts` covers some routes; needs update for new dashboard |
| SHELL-01 | Utility routes (Connectors, Audit, Docs) navigable from sidebar only | E2E | same | Partial — needs `.first()` disambiguator removal |
| SHELL-02 | Each protected route renders a PageTitle with correct heading | Vitest unit | `npx pnpm --filter @agentsmith/web test` | Not yet — needs new assertions in `router.smoke.test.tsx` |
| SHELL-02 | Home route renders within full shell (sidebar visible on `/`) | E2E | `npx pnpm --filter @agentsmith/web test:e2e` | Partial — `app-smoke.spec.ts` tests nav from `/` but uses old dashboard label |
| SHELL-02 | Sign-out button present in top bar (not nav bar) on all protected routes | E2E | `npx pnpm --filter @agentsmith/web test:e2e` | Covered by `auth.spec.ts` (already passes) |
| SHELL-03 | Shell layout at 1024px viewport — no overlap or hidden controls | E2E viewport | `npx pnpm --filter @agentsmith/web test:e2e` | Not yet — no viewport-specific Playwright project |

### Sampling Rate

- **Per task commit:** `npx pnpm --filter @agentsmith/web test` (Vitest only, fast)
- **Per wave merge:** `npx pnpm test` (full suite including Playwright)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (tests to update or create)

- [ ] `apps/web/tests/shell-navigation.spec.ts` — update: remove ReviewPanel heading assertion (line 14), update dashboard label locator, remove `.first()` disambiguator concern; add: assert `<h1>` from PageTitle on at least two routes, assert sidebar visible on `/`
- [ ] `apps/web/tests/app-smoke.spec.ts` — update: dashboard mockup label (line 35), hotspot link locator (line 70), "Primary auth navigation" label (line 57)
- [ ] `apps/web/src/test/router.smoke.test.tsx` — update: home route finder (line 7) from `findByLabelText("AgentSmith dashboard mockup")` to a new assertion that matches the risk card dashboard
- [ ] Optionally: new Playwright project for tablet viewport (1024x768) asserting no layout overlap — only needed if visual verification reveals an issue

---

## Common Pitfalls

### Pitfall 1: Breaking Sign-Out Tests Mid-Refactor
**What goes wrong:** Removing the `<nav>` from ProtectedLayout while leaving the header render in an intermediate state causes the "Sign out" button to briefly disappear from certain test selectors.
**Why it happens:** The sign-out button was inside the same flex container as the nav. If the header restructure reorders DOM elements, role-based queries can fail.
**How to avoid:** Keep the sign-out button as `<button type="button">` with the same accessible text "Sign out" / "Signing out..." throughout the refactor. `ProtectedLayout.test.tsx` queries by role+name, which is stable.
**Warning signs:** `getByRole("button", { name: "Sign out" })` throws in ProtectedLayout unit tests.

### Pitfall 2: Home Route `end: true` and Active State
**What goes wrong:** After D-06, the home route joins the full shell. The Needs Attention nav item uses `end: true` to prevent the NavLink from matching as active on every route. If `end` is accidentally removed, every route shows "Needs Attention" as active.
**Why it happens:** Refactoring the `if` branch in `AppShell` can cause confusion about whether `end` is still needed.
**How to avoid:** `end: true` in `primaryItems[0]` must be preserved.
**Warning signs:** All sidebar items show as active simultaneously.

### Pitfall 3: `agent-console` Height After BrowserToolbar Removal
**What goes wrong:** `.agent-console` uses `min-height: calc(100vh - 71px)` where 71px is the BrowserToolbar height. After removing BrowserToolbar, this leaves the console 71px shorter than it should be.
**Why it happens:** The `71px` magic number references a removed element.
**How to avoid:** When removing BrowserToolbar and adding the `agent-topbar`, measure the actual topbar height and update the calc, or use `min-height: 0; flex: 1` pattern inside a flex container.
**Warning signs:** Main stage content appears vertically clipped; scrollbar appears prematurely.

### Pitfall 4: CSS Dead Code Left in `styles.css`
**What goes wrong:** Leaving `agent-review-panel` and `mockup-dashboard` CSS in the file causes confusion for Phase 08/09 implementors who may think those classes are still used.
**Why it happens:** CSS removals are often deferred as "harmless."
**How to avoid:** Remove dead CSS blocks in the same wave as the component removal. A grep for `.agent-review-panel` should return zero results after Phase 07.
**Warning signs:** Styles left in file; Phase 08 implementor gets confused about whether ReviewPanel is returning.

### Pitfall 5: `aria-label` on Old Dashboard Section Removed Without Updating Tests
**What goes wrong:** `AssetDashboardPage` renders `<section aria-label="AgentSmith dashboard mockup">`. Three tests query this label. Replacing the page without updating tests causes immediate test failures.
**Why it happens:** The label is a test hook, not a meaningful accessibility label.
**How to avoid:** Update all three test files in the same wave as the dashboard replacement.
**Warning signs:** `shell-navigation.spec.ts` line 8 fails immediately after dashboard replacement.

---

## Code Examples

### Current Shell Grid (to update)

```css
/* styles.css — current */
.agent-console {
  display: grid;
  grid-template-columns: 266px minmax(0, 1fr) 324px;  /* remove 324px ReviewPanel column */
  min-height: calc(100vh - 71px);  /* 71px = BrowserToolbar height — update */
  ...
}
```

### After Phase 07

```css
/* styles.css — after */
.agent-console {
  display: grid;
  grid-template-columns: 266px minmax(0, 1fr);
  min-height: calc(100vh - var(--topbar-height, 60px));
  ...
}
```

### NavLink Active State Pattern (retain as-is)

```tsx
// Already correct in ShellNavigationItem — no change needed
className={({ isActive }) =>
  isActive ? "agent-sidebar__item agent-sidebar__item--active" : "agent-sidebar__item"
}
```

### Sign-Out Logic (preserve verbatim from ProtectedLayout)

The `handleSignOut` function, `isSigningOut` / `signOutError` state, `queryClient.clear()`, and `navigate("/login", { replace: true })` must be preserved exactly. Only the surrounding JSX element structure and class names change.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this phase is pure TypeScript/CSS changes to existing frontend code with no new runtime dependencies).

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `apps/web/src/router.tsx` — complete component inventory
- Direct code inspection of `apps/web/src/styles.css` — complete CSS token and class inventory
- Direct code inspection of `apps/web/src/routes/ProtectedLayout.tsx` — auth logic and header structure
- Direct code inspection of `apps/web/src/routes/dashboard/AssetDashboardPage.tsx` — mockup structure
- Direct code inspection of all four test files — breaking change analysis
- `.planning/phases/07-operator-shell-refresh/07-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)
- React Router NavLink `end` prop and `aria-current` behavior — from codebase usage patterns; consistent with React Router v6 documentation

---

## Metadata

**Confidence breakdown:**
- Current shell architecture: HIGH — read directly from source
- Breaking change analysis: HIGH — read all affected test files
- CSS class inventory: HIGH — read complete `styles.css`
- Implementation sequencing: HIGH — derived from dependency order of locked decisions
- Responsive behavior post-change: MEDIUM — relies on the current breakpoints being adequate for D-12; no actual viewport testing performed during research

**Research date:** 2026-03-29
**Valid until:** 2026-05-29 (stable, no external dependencies)
