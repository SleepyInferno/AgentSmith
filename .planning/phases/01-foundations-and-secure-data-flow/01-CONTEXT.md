# Phase 1: Foundations and Secure Data Flow - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the secure platform skeleton that every later module depends on: Entra ID operator sign-in, an authenticated application shell, connector health visibility, audit logging, and the shared canonical entity model for users, devices, systems, groups, and documents. This phase establishes trusted data flow and operational traceability; feature-specific dashboards and workflows remain in later phases.

</domain>

<decisions>
## Implementation Decisions

### Application foundation
- **D-01:** Build Phase 1 as a TypeScript-first internal web application with a React + TypeScript + Vite frontend, a Node.js + TypeScript API layer, and PostgreSQL as the shared operational datastore.
- **D-02:** Establish a minimal authenticated app shell in this phase with navigation for dashboard home, connectors, and audit history so later modules plug into a real secured surface instead of a temporary prototype.
- **D-03:** Keep connector logic, domain logic, and UI concerns separated from the beginning so later modules can reuse the same platform contracts without exposing provider-specific schemas directly to the frontend.

### Authentication and auditability
- **D-04:** Use Microsoft Entra ID as the only sign-in path for v1 operators; do not introduce local credentials or password management.
- **D-05:** Treat sign-in events, connector sync runs, and operator-triggered actions as first-class audit events with timestamp, actor, target, result, and structured metadata.
- **D-06:** Favor reviewable, explicit operator actions over background write automation in Phase 1 so the secure foundation is read-heavy and trustworthy before sensitive mutations are introduced.

### Connector slice and data freshness
- **D-07:** Implement Microsoft-first connector foundations in Phase 1, with Entra ID and Intune data as the first vertical slice because they directly support platform requirements and unlock the next dashboard phase.
- **D-08:** The connector status surface should show per-source health, last successful sync, last attempted sync, freshness state, and sync outcome so stale data is visible instead of silently trusted.
- **D-09:** Background sync behavior should normalize source data into stored snapshots rather than relying on live API-only reads, enabling auditability, stale-data detection, and reuse across later modules.

### Canonical data model
- **D-10:** Create canonical entities for users, devices, systems, groups, and documents in Phase 1, plus connector, sync run, and audit event records needed to support observability and provenance.
- **D-11:** Preserve source-system identifiers and provenance alongside normalized fields so later modules can explain where each record came from and avoid coupling UI behavior to raw provider schemas.
- **D-12:** Design the data model to degrade gracefully when connectors are partially unavailable by distinguishing healthy, stale, incomplete, and error states instead of collapsing everything into missing data.

### the agent's Discretion
- Exact package and library choices within the selected stack, such as the auth middleware and ORM, can be finalized during planning.
- The exact visual treatment of the authenticated shell, connector status cards, and audit timeline is flexible as long as the screens emphasize signal clarity over dense enterprise-style chrome.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and requirements
- `.planning/PROJECT.md` - Product intent, Microsoft-centric constraints, and the solo-admin operating model this phase must support.
- `.planning/REQUIREMENTS.md` - Platform requirements PLAT-01 through PLAT-03 and the full traceability map for later phases.
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, and ordering rationale relative to the rest of v1.
- `.planning/STATE.md` - Current project focus and the original handoff notes for Phase 1.

### Prior research
- `.planning/research/STACK.md` - Recommended stack, integration priorities, and technical principles for v1.
- `.planning/research/ARCHITECTURE.md` - Proposed system components, data flow, and build-order implications.
- `.planning/research/SUMMARY.md` - Concise build strategy, table stakes, and failure modes to avoid while implementing the foundation.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application code exists yet; this phase will create the first reusable foundation rather than integrating into an existing implementation.

### Established Patterns
- The planning artifacts consistently prefer a modular web application, Microsoft-first connectors, normalized internal models, and explicit auditability over implicit automation.
- Research notes already establish a TypeScript-first stack and a clean separation between connector services, domain modules, and the frontend.

### Integration Points
- Phase 1 should establish the shared app shell, API contracts, database schema boundaries, and sync/audit infrastructure that Phases 2 through 6 will build on.

</code_context>

<specifics>
## Specific Ideas

- The product should feel like a trustworthy internal operations console for a solo IT admin, not a generic enterprise dashboard overloaded with noise.
- Connector health must make data freshness obvious, because later risk dashboards are only valuable if the operator can trust the recency of the underlying syncs.
- The first vertical slice should bias toward read visibility and traceability, using Microsoft tenant data as the operational backbone for v1.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundations-and-secure-data-flow*
*Context gathered: 2026-03-26*
