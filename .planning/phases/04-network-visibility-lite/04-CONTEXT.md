# Phase 04: network-visibility-lite - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a lightweight, trustworthy network visibility module that helps the operator understand sites, WAN links, LAN segments, and core network infrastructure without turning the app into a full network management suite. This phase covers read-only inventory, a lightweight mapper, explainable network findings, and clear freshness or confidence labels. It does not include config management, packet capture, or fully automated topology discovery claims.

</domain>

<decisions>
## Implementation Decisions

### Module boundary
- **D-01:** Ship Phase 4 as a standalone Network Visibility Lite module that replaces the former security-module slot in v1.
- **D-02:** Keep the phase read-only and operator-focused; do not introduce network automation, configuration management, or remote control actions.

### Inventory and mapper scope
- **D-03:** Cover sites, WAN links, LAN segments, firewalls, switches, APs, and key DHCP or VPN infrastructure as the first-class network entities in this phase.
- **D-04:** Include a lightweight mapper that shows site-to-WAN-to-LAN relationships plus core network devices rather than attempting a perfect real-time topology engine.
- **D-05:** Distinguish confirmed relationships from inferred relationships so the operator can trust the map without assuming every edge is authoritative.

### Triage and detail workflow
- **D-06:** Provide a prioritized queue for offline network devices, stale telemetry, topology gaps, and unclear ownership or segment mapping.
- **D-07:** Each finding and detail view must explain the affected site or segment, last-seen state, freshness, confidence level, and suggested next step.

### the agent's Discretion
- The exact mapping visual language can be finalized during planning as long as it stays legible and clearly separates confirmed from inferred relationships.
- The planner can decide whether endpoint counts, sample attached devices, or subnet summaries are the best way to represent LAN density without overloading the mapper.
- The exact source connectors for topology inference can be finalized during planning based on what data is already available and trustworthy.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product scope and network-visibility boundary
- `.planning/PROJECT.md` - Core value, operator-focus, and the decision to use Network Visibility Lite as the replacement for the former security-module slot.
- `.planning/REQUIREMENTS.md` - Network Visibility Lite requirements NET-01 through NET-03 plus the broader v1 constraints that still shape this phase.
- `.planning/ROADMAP.md` - Phase 4 goal, success criteria, and module replacement rationale for Network Visibility Lite.
- `.planning/STATE.md` - Current roadmap status and the recorded decision to replace the former standalone identity module with network visibility.

### Prior phase context
- `.planning/phases/01-foundations-and-secure-data-flow/01-CONTEXT.md` - Connector isolation, normalized entities, freshness semantics, and explicit operator-trust rules that still apply here.
- `.planning/phases/03-lifecycle-automation/03-CONTEXT.md` - Queue-first workflow expectations, review-first handling of operational work, and established route plus UI patterns worth reusing.

### Existing implementation references
- `prisma/schema.prisma` - Existing `Device`, `System`, `ConnectorSource`, `SyncRun`, and freshness-related models that can inform network visibility persistence and provenance.
- `apps/api/src/server.ts` - Dependency-injected Fastify route registration pattern for adding new network visibility endpoints.
- `apps/api/src/routes/assets.ts` - Established queue, detail, and filter parsing pattern for read-heavy operational views.
- `apps/web/src/router.tsx` - Current top-level navigation and lifecycle route integration points.
- `apps/web/src/routes/dashboard/AssetDashboardPage.tsx` - Existing queue-first dashboard treatment that can inform how network findings are presented.
- `apps/web/src/routes/assets/DeviceDetailPage.tsx` - Detail-page presentation pattern for explainable findings and freshness messaging.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/router.tsx`: already exposes multiple top-level operator modules within the shared app shell, which makes adding a network section straightforward.
- `apps/api/src/routes/assets.ts`: provides a proven pattern for queue, detail, and filter query parsing in read-heavy operational views.
- `apps/web/src/routes/dashboard/AssetDashboardPage.tsx`: shows how a queue-first landing page can combine findings and freshness context.
- `prisma/schema.prisma`: already contains `Device`, `System`, `ConnectorSource`, and `SyncRun`, which can anchor network entities, freshness, and source provenance.

### Established Patterns
- The app favors queue-first operator workflows, with broad inventories or detail views as secondary navigation.
- API contracts stay in the route layer so internal repository and Prisma shapes do not leak directly into the frontend.
- Read-heavy, server-derived operational views are preferred over speculative client-owned state.
- Server-owned state and query invalidation are preferred over client-owned workflow truth.

### Integration Points
- New network visibility routes should register through the same Fastify server composition used by assets and lifecycle.
- The shared app shell should gain a top-level network visibility route rather than burying the module inside lifecycle.
- Network entities and findings should connect cleanly to sites, systems, and source-sync provenance so the operator can understand what is known versus inferred.

</code_context>

<specifics>
## Specific Ideas

- The operator wants a network mapper of LAN, WAN, and related infrastructure, and the company size is small enough that a lightweight mapped view should be practical if source data is trustworthy.
- The mapper should prioritize clarity and operational usefulness over topology perfection.
- Freshness and confidence labels matter because the product should never imply a certainty level the source data cannot support.

</specifics>

<deferred>
## Deferred Ideas

- Full network management, packet capture, and configuration automation remain out of scope.
- A perfect real-time topology engine or full Visio replacement is deferred unless later source coverage proves it practical.
- Broader identity hygiene remains a lifecycle-adjacent concern rather than a standalone v1 module.

</deferred>

---

*Phase: 04-network-visibility-lite*
*Context gathered: 2026-03-27*
