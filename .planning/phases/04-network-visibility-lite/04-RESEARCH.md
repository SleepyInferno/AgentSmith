# Phase 4: Network Visibility Lite - Research

**Researched:** 2026-03-27
**Domain:** Read-only network inventory, confidence-aware topology, and queue-first network triage
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Claude's Discretion
- The exact mapping visual language can stay flexible as long as confirmed and inferred relationships are unmistakable.
- LAN density can be shown with endpoint counts, sample attachments, or subnet summaries as long as the mapper stays legible.
- The exact connector sources used for topology inference can be finalized during planning based on what can be represented honestly in the current repo.

### Deferred Ideas (OUT OF SCOPE)
- Full network management, configuration automation, packet capture, or a live NMS replacement
- A perfect real-time topology engine or a drag-and-drop graph editor
- Broad identity hygiene outside the lifecycle surface
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NET-01 | Operator can view a lightweight network inventory across sites, WAN links, firewalls, switches, APs, and key DHCP or VPN services with status and last-seen freshness | A canonical network read model with typed resource kinds, freshness reuse from Phase 1, and read-only inventory APIs |
| NET-02 | Operator can open a network mapper that shows sites, WAN and LAN segments, core network devices, and whether relationships are confirmed or inferred | A relation model with explicit confidence labels, server-shaped map DTOs, and a deliberate lightweight layout instead of a topology engine |
| NET-03 | Operator can review network findings for offline infrastructure, stale telemetry, topology gaps, or unclear ownership and understand the affected site or segment plus the suggested next step | Server-derived findings, queue ranking, scoped detail payloads, and explanation-first UI states |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Preserve the five-tool v1 scope unless a roadmap update explicitly expands it.
- Favor guided workflows and clear risk queues over broad enterprise-style dashboard sprawl.
- Keep connector-specific logic isolated from internal domain models.
- Treat write actions as high-trust operations that require auditability and clear review UX.
- The app should help a solo admin decide what matters next within a few minutes of opening it.
- Sensitive actions must be explicit, reviewable, and logged.
- Each phase should produce a usable slice, not just scaffolding.

## Summary

Phase 4 should be planned as a narrow network-context layer, not as a monitoring suite. The repo already has the right product pattern: a server-owned read model, queue-first landing pages, route-layer DTO mapping, and explicit freshness messaging. The network slice should reuse those patterns instead of inventing a second architecture.

The strongest planning shape is a canonical network module with three concerns: typed network resources for inventory, confidence-aware relationships for the mapper, and server-derived findings for the queue and detail views. That gives the operator a trustworthy answer to "what exists, how is it related, and what needs review?" without implying full discovery coverage or real-time certainty.

The main planning risk is not rendering the map. It is data honesty. If the plan does not make confirmed versus inferred relationships, freshness, and provenance first-class fields, the UI will overclaim certainty. If the plan assumes a full network connector stack already exists, the phase will stall. Keep the read model narrow, allow source confidence to be explicit, and plan a deterministic server-shaped map rather than a generic graph engine.

**Primary recommendation:** Build a read-only network module around canonical `NetworkResource`, `NetworkRelationship`, and `NetworkFinding` concepts, expose queue/inventory/map/detail APIs through Fastify route adapters, and deliver the UI as a queue-first landing page plus dedicated mapper and detail views inside the existing app shell.

## Standard Stack

### Core
| Library | Workspace Version | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| Prisma ORM | `6.19.2` | Canonical persistence for network resources, relations, findings, and provenance | Already the repo's write model and the cleanest place to keep provider-specific normalization out of the UI |
| Fastify | `^5.3.3` in package manifest | Network inventory, map, finding, and detail APIs | Matches the existing injected route registration and route-layer DTO mapping patterns |
| `@tanstack/react-query` | `^5.95.2` | Server-state reads for queue, map, and detail screens | Already established in asset and lifecycle flows |
| `react-router-dom` | `^7.13.2` | Route integration for a new top-level network surface | Already used by the shared app shell |

### Supporting
| Library | Workspace Version | Purpose | When to Use |
|---------|-------------------|---------|-------------|
| React | `^19.1.0` | Network queue, map, inventory, and detail views | Use for the UI slice within the existing shell |
| `@tanstack/react-table` | `^8.21.3` | Dense network inventory scanning | Use for inventory screens where filters and columns matter more than card layout |
| `node:test` with `tsx` | Node `25.8.1` runtime | Route and repository verification | Already used by the API package for source-level tests |
| Plain SVG/CSS in React | none new | Lightweight mapper rendering | Prefer this for Phase 4 before reaching for a graph library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain React + SVG mapper | React Flow or a general graph library | Faster pan/zoom features, but drags the phase toward an editor mental model the product does not need yet |
| A narrow canonical network module | Separate tables for every network object family | More strict typing, but more joins, more polymorphism pain, and slower planning for a lightweight v1 slice |
| Server-derived findings and map DTOs | Client-side ranking and relation shaping | Duplicates truth in the browser and risks UI-only confidence logic |

**Installation:**
```bash
# No new package is required for the baseline Phase 4 slice.
# Reuse the current workspace stack unless execution proves a hard gap.
```

## Architecture Patterns

### Recommended Project Structure
```text
apps/api/src/
|-- modules/network/
|   |-- network.types.ts
|   |-- network.repository.ts
|   |-- network.findings.ts
|   `-- network.fixtures.ts
|-- routes/network.ts
`-- server.ts

apps/web/src/
|-- lib/network.ts
|-- routes/network/
|   |-- NetworkOverviewPage.tsx
|   |-- NetworkMapPage.tsx
|   `-- NetworkDetailPage.tsx
`-- components/network/

prisma/
`-- schema.prisma
```

### Pattern 1: Narrow canonical network resource model
**What:** Keep the network domain intentionally small. Model typed resources, typed relationships, and findings instead of a full CMDB or discovery engine.
**When to use:** Always for Phase 4 baseline persistence and repository design.
**Example:**
```prisma
enum NetworkResourceKind {
  site
  wan_link
  lan_segment
  firewall
  switch
  access_point
  dhcp_service
  vpn_service
}

enum NetworkRelationConfidence {
  confirmed
  inferred
}

model NetworkResource {
  id             String              @id @default(cuid())
  sourceSystem   String
  sourceId       String
  kind           NetworkResourceKind
  name           String
  operationalStatus String?
  freshnessState FreshnessState      @default(stale)
  lastSeenAt     DateTime?
  siteLabel      String?
  cidr           String?
  managementIp   String?
  metadata       Json?
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@unique([sourceSystem, sourceId])
}

model NetworkRelationship {
  id              String                   @id @default(cuid())
  fromResourceId  String
  toResourceId    String
  relationship    String
  confidence      NetworkRelationConfidence
  sourceSystem    String
  lastSeenAt      DateTime?
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt
}
```
**Why:** The phase needs a trustworthy map more than perfect network semantics. Typed resources plus typed relationships are enough to power inventory, map, and findings while keeping connector-specific inference outside the UI.

### Pattern 2: Route-layer DTO mapping with explicit trust fields
**What:** Keep HTTP response shapes in `apps/api/src/routes/network.ts`, just like assets and lifecycle do today. Every response should carry freshness, confidence, and scope fields explicitly.
**When to use:** For queue, inventory, map, and detail endpoints.
**Example:**
```typescript
// Pattern source: apps/api/src/routes/assets.ts
app.get("/api/network/map", routeOptions, async (request) => {
  const graph = await options.networkRepository.getMap();

  return {
    sites: graph.sites.map((site) => ({
      siteId: site.id,
      siteName: site.name,
      freshnessState: site.freshnessState,
    })),
    relationships: graph.relationships.map((edge) => ({
      fromId: edge.fromId,
      toId: edge.toId,
      confidence: edge.confidence,
      relationship: edge.relationship,
    })),
  };
});
```
**Why:** The frontend should never have to infer whether a relationship is confirmed or stale from provider-specific fields.

### Pattern 3: Server-derived queue and mapper inputs
**What:** Compute findings, queue rank, relationship confidence labels, and map groupings on the server. The UI should render operator-facing meaning, not invent it.
**When to use:** For NET-02 and NET-03, especially the queue landing page and detail explanations.
**Example:**
```typescript
// Pattern source: apps/api/src/modules/assets/asset-health.repository.ts
const findings = resources
  .map((resource) => scoreNetworkFinding(resource, relationships))
  .filter((finding) => finding !== null)
  .sort((left, right) => left.queueRank - right.queueRank);
```
**Why:** Queue-first workflows only stay trustworthy when ranking and explanation come from one server-owned definition.

### Anti-Patterns to Avoid
- **Full NMS schema in v1:** The phase needs operational trust, not exhaustive vendor-specific modeling.
- **UI-only confidence logic:** Confirmed versus inferred must come from the API contract.
- **Connector payload leakage:** Do not let raw vendor field names become the web contract.
- **Drag-and-drop map editor behavior:** This phase is read-only and review-focused.
- **Config or remediation actions:** Anything beyond read-only context breaks the locked scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Network topology | A real-time discovery or path-computation engine | Deterministic server-shaped map DTOs | The operator needs trustworthy context, not graph-theory ambition |
| Inventory semantics | Separate view models per connector | One canonical network resource model | Keeps provider-specific logic isolated |
| Queue ranking | Client-side scoring | Repository/service-derived findings | Matches Phase 2's single-truth approach |
| Relationship truth | Implicit UI heuristics | Explicit `confirmed` / `inferred` confidence fields | Prevents the app from overstating certainty |

**Key insight:** Phase 4 is about explainable operational context. Treat confidence and freshness as product features, not metadata.

## Common Pitfalls

### Pitfall 1: Overclaiming topology certainty
**What goes wrong:** The map looks authoritative even when relationships were inferred from partial data.
**Why it happens:** Confidence is not modeled explicitly, or the UI makes inferred edges look identical to confirmed ones.
**How to avoid:** Make confidence an enum in the canonical model and a required field in map DTOs. Render inferred edges with a clearly different badge or line style.
**Warning signs:** Plans talk about "the network map" without mentioning confirmed versus inferred relationships.

### Pitfall 2: Letting the phase depend on perfect connector coverage
**What goes wrong:** Planning assumes SNMP, VPN, DHCP, and topology discovery are all live before the UI can ship.
**Why it happens:** The phase confuses inventory normalization with full discovery automation.
**How to avoid:** Plan a repository and fixture seam that supports honest read-only data now and connector-backed normalization later.
**Warning signs:** Plans introduce packet capture, live polling, or full network discovery as prerequisites.

### Pitfall 3: Making the map a visual toy instead of an operator tool
**What goes wrong:** The mapper becomes a dense graph with weak triage value.
**Why it happens:** The phase optimizes for visual complexity instead of helping the operator decide what matters next.
**How to avoid:** Keep the landing page queue-first and use the mapper to explain scope and relationships, not to replace the queue.
**Warning signs:** The plan leads with pan/zoom or node dragging before findings, freshness, and scope explanations exist.

### Pitfall 4: Hiding scope and next-step context inside the map only
**What goes wrong:** Offline or stale findings have no readable site, segment, or next-step explanation outside the visual map.
**Why it happens:** NET-03 gets treated as a map feature instead of a queue/detail requirement.
**How to avoid:** Model findings separately from graph edges and ensure detail payloads include affected site or segment plus suggested next step.
**Warning signs:** Plans mention map rendering but not a dedicated finding queue or detail contract.

## Code Examples

Verified patterns from the current repo that Phase 4 should extend:

### Register new routes through the shared server composition
```typescript
// Source: apps/api/src/server.ts
const assetHealthRepository = options.assetRoutes?.assetHealthRepository ?? new AssetHealthRepository(prisma);
const lifecycleRepository = options.lifecycleRoutes?.lifecycleRepository ?? new LifecycleRepository(prisma);

app.register(registerAssetRoutes, assetRouteOptions);
app.register(registerLifecycleRoutes, lifecycleRouteOptions);
```

### Keep HTTP contracts in the route layer
```typescript
// Source: apps/api/src/routes/assets.ts
return {
  items: items.map(mapInventoryRowResponse),
};
```

### Treat UI data as server state
```typescript
// Source: apps/web/src/routes/dashboard/AssetDashboardPage.tsx
const queueQuery = useQuery({
  queryKey: ["asset-queue"],
  queryFn: getNeedsAttentionQueue,
});
```

### Reuse shared query defaults
```typescript
// Source: apps/web/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No network module in the app shell | Phase 4 introduces a dedicated network surface | Roadmap updated 2026-03-27 | Network context now occupies the vacated security-module slot |
| Queue-first endpoint triage only | Queue-first operator workflow is already proven in assets and lifecycle | Phases 2 and 3 completed | Phase 4 should follow the same high-signal entry pattern |
| Device-only normalized inventory | Canonical network inventory is now required | Phase 4 context locked 2026-03-27 | Schema and repository layer need a new network-specific read model |
| Implicit topology assumptions | Confirmed versus inferred relationships are now a hard product distinction | Phase 4 context locked 2026-03-27 | Confidence must be encoded in persistence, APIs, and UI |

**Deprecated/outdated:**
- Treating network context as part of the former standalone identity module
- Assuming a dense dashboard is the right UX for a solo admin

## Open Questions

1. **Should DHCP and VPN services be modeled as separate resources or just device capabilities?**
   - What we know: NET-01 names them as inventory items, and the phase context treats them as first-class network entities.
   - What's unclear: Whether the operator needs them as their own rows, badges on a device, or both.
   - Recommendation: Model them as resource kinds or inventory-presentable derived resources so they can appear in inventory, queue, and detail views without being buried inside device metadata.

2. **Does Phase 4 need a dedicated map route or only an embedded map section on the landing page?**
   - What we know: NET-02 requires an operator to "open a network mapper."
   - What's unclear: Whether the landing page can satisfy that, or whether the operator needs a focused map screen.
   - Recommendation: Plan a queue-first overview plus a dedicated map route. The overview should preview findings and freshness; the map route can hold the wider topology context.

3. **How should the phase handle the lack of an existing network connector slice in this repo?**
   - What we know: The current codebase has asset and lifecycle implementations, but no network normalization module yet.
   - What's unclear: Whether execution will have real source data available during the phase.
   - Recommendation: Keep the plan honest by defining a repository/fixture seam first and treating connector-backed ingestion as a source adapter concern, not a UI prerequisite.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API, web, tests | yes | `v25.8.1` | none |
| npm | package execution and registry access | yes | `11.11.1` | none |
| pnpm | workspace scripts | no on PATH | `10.11.1` via `npx pnpm` | Use `npx pnpm ...` |
| Prisma CLI | schema and migration checks | yes via `npx` | `6.19.2` | Use `npx prisma ...` |
| PostgreSQL server | schema migration and persisted repository verification | not confirmed healthy | `localhost:5432` configured but `prisma migrate status` currently errors | Favor injected repository tests until DB reachability is restored |

**Missing dependencies with fallback:**
- `pnpm` on `PATH` - use `npx pnpm`
- Prisma global CLI - use `npx prisma`

**Potential blockers:**
- `.env` still has empty Entra credentials, which is acceptable for this read-only phase but confirms Phase 1 auth work is not fully closed.
- PostgreSQL connectivity or schema-engine health is not currently reliable enough to assume database-backed end-to-end verification.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` with `tsx`, plus existing web build checks |
| Config file | none |
| Quick run command | `npx pnpm --filter @agentsmith/api test` |
| Full suite command | `cmd /c "npx pnpm --filter @agentsmith/api test && npx pnpm --filter @agentsmith/web build"` |
| Estimated runtime | ~45 seconds |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NET-01 | Inventory returns typed resources with status, freshness, and source context | repository + route | `node --import tsx --test apps/api/src/modules/network/network.repository.test.ts apps/api/src/routes/network.test.ts` | no - Wave 0 |
| NET-02 | Mapper returns sites, segments, infrastructure, and explicit confirmed or inferred relationships | repository + route | `node --import tsx --test apps/api/src/modules/network/network.repository.test.ts apps/api/src/routes/network.test.ts` | no - Wave 0 |
| NET-03 | Findings queue and detail outputs explain affected scope and suggested next step | repository + route | `node --import tsx --test apps/api/src/modules/network/network.findings.test.ts apps/api/src/routes/network.test.ts` | no - Wave 0 |

### Sampling Rate
- **Per task commit:** Run the task's automated verify command
- **Per wave merge:** Run API tests for API waves and `npx pnpm --filter @agentsmith/web build` for web waves
- **Phase gate:** Both network API tests and web build should pass before `$gsd-verify-work`
- **Max feedback latency:** 45 seconds

### Wave 0 Gaps
- [ ] `apps/api/src/modules/network/network.repository.test.ts` - inventory, map DTO, and freshness coverage for NET-01 and NET-02
- [ ] `apps/api/src/modules/network/network.findings.test.ts` - ranking and explanation coverage for NET-03
- [ ] `apps/api/src/routes/network.test.ts` - HTTP contract coverage for queue, inventory, map, and detail endpoints
- [ ] Database-backed verification path - PostgreSQL needs to be healthy before end-to-end persistence checks can become required

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` - project scope, v1 boundaries, and operator-trust rules
- `.planning/PROJECT.md` - network module rationale and current project state
- `.planning/REQUIREMENTS.md` - NET-01 through NET-03 traceability
- `.planning/ROADMAP.md` - Phase 4 goal and success criteria
- `.planning/STATE.md` - current phase handoff and prior phase decisions
- `.planning/phases/04-network-visibility-lite/04-CONTEXT.md` - locked product decisions for Phase 4
- `.planning/phases/01-foundations-and-secure-data-flow/01-CONTEXT.md` - connector isolation, freshness, and normalized-entity rules
- `prisma/schema.prisma` - current enums and canonical persistence patterns
- `apps/api/src/server.ts` - injected route registration pattern
- `apps/api/src/routes/assets.ts` - route-layer DTO and filter parsing pattern
- `apps/api/src/routes/lifecycle.ts` - route-layer mutation and detail contract pattern
- `apps/api/src/modules/assets/asset-health.repository.ts` - server-derived ranking and repository mapping pattern
- `apps/api/src/modules/lifecycle/lifecycle.repository.ts` - repository and audit-event integration pattern
- `apps/api/src/routes/assets.test.ts` - current route-test style using injected dependencies
- `apps/web/src/router.tsx` - shared shell and top-level route integration
- `apps/web/src/routes/dashboard/AssetDashboardPage.tsx` - queue-first landing pattern
- `apps/web/src/routes/lifecycle/LifecycleQueuePage.tsx` - module landing-page and React Query mutation patterns
- `apps/web/src/routes/assets/DeviceDetailPage.tsx` - explanation-first detail page pattern
- `apps/web/src/lib/queryClient.ts` - shared query defaults

### Secondary (MEDIUM confidence)
- `package.json`, `apps/api/package.json`, `apps/web/package.json` - current workspace versions and available scripts
- `.env` - confirms current service configuration gaps relevant to execution risk

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Architecture: MEDIUM - strongly grounded in repo patterns, but the exact network persistence shape is still a planning recommendation
- Verification approach: HIGH - based on existing test and build scripts already used in this workspace
- Execution risk: MEDIUM - the product direction is clear, but current DB health and missing network source adapters may affect implementation sequencing

**Research date:** 2026-03-27
**Valid until:** 2026-04-26
