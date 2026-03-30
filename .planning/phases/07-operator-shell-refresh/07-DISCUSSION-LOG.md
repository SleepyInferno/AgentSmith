# Phase 07: Operator Shell Refresh - Discussion Log

**Session:** 2026-03-29
**Participants:** User + Claude

---

## Gray Areas Presented

1. Navigation consolidation (recommended)
2. Dashboard shell treatment
3. Review panel behavior
4. Route context chrome
5. "The character of Agent Smith in the banner" (user-added)

All five areas were selected for discussion.

---

## Q&A Log

### Area: Navigation Layout

**Q:** The shell currently has two navigations: a top header bar (user name, sign-out, partial nav) and a full sidebar (all tools). Which layout should survive?

**Options presented:**
- Sidebar only (Recommended) — Remove ProtectedLayout header nav; user identity/sign-out moves to sidebar footer
- Top bar + sidebar — Top bar holds identity + sign-out only; sidebar holds all navigation; no redundancy
- Top bar only — Collapse to horizontal top nav; sidebar removed

**Selected:** Top bar + sidebar

**User note:** "Rebrand from Agent-SOS to Agent-OS"

---

### Area: Dashboard Shell Treatment

**Q:** The home route (/) uses a full-width mockup image with hotspot overlays and NO sidebar or top bar. How should it behave after the shell refresh?

**Options presented:**
- Gets the full shell (Recommended) — Dashboard renders inside top bar + sidebar like every other route
- Stays as special surface — Keep full-bleed mockup treatment; sidebar and top bar render but main stage is unconstrained

**Selected:** Gets the full shell

**User note:** "Also remove the 'browser' very very top bar. It looks like it is a safari browser with the close, minimize, and maximize buttons on the top left."

---

### Area: Review Panel Behavior

**Q:** The review panel is currently always visible with static placeholder content. What should it do in Phase 07?

**Options presented:**
- Remove it for now (Recommended) — Strip from shell; reintroduce properly in Phase 08/09
- Keep it, but empty/hidden — Preserve layout slot, render nothing
- Keep with placeholder, scoped to action routes — Show only on lifecycle/docs routes

**Selected:** Remove it for now

---

### Area: Route Context Chrome

**Q:** Should Phase 07 introduce shared page titles or route context labels inside the main stage?

**Options presented:**
- Yes — page title per route (Recommended) — Shared component, consistent heading at top of main stage
- Yes — section label only — Lightweight eyebrow label
- No — sidebar nav is enough — Defer to Phase 08

**Selected:** Yes — page title per route

---

### Area: Agent Smith Character in Banner

**Q:** The dashboard mockup image includes the Agent Smith character banner. What happens to it in Phase 07?

**Options presented:**
- Keep the mockup image as-is
- Replace mockup with real content
- Keep but resize/reframe

**User selected "Other":** "Can it be 2 but integrate the mockup character in some way and keep the same look, but functional? I want the Agent Smith character mockup."

---

### Area: Dashboard Scope (follow-up)

**Q:** Building functional dashboard content with Agent Smith integrated is real work. Where should it land?

**Options presented:**
- Defer to Phase 08 (Recommended) — Phase 07 moves mockup inside shell; Phase 08 builds functional content
- Include in Phase 07 — Phase 07 builds both shell AND functional dashboard

**Selected:** Include in Phase 07

---

### Area: Dashboard Content (follow-up)

**Q:** What functional content should the dashboard show alongside the Agent Smith character?

**Options presented:**
- Risk summary cards (Recommended) — Cards per tool showing status; Agent Smith as hero element
- Keep hotspot layout, make it functional — Image+hotspots concept, better integrated
- Agent Smith + single priority queue — Character prominent, single consolidated feed

**Selected:** Risk summary cards

**User note:** "Can you use Impeccable to help with this?"

---

## Final Status

All areas resolved. CONTEXT.md written. Ready for `/gsd:plan-phase 7`.

---

*Discussion log generated: 2026-03-29*
