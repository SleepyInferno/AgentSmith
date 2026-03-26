# Phase 3: Lifecycle Automation - Research

**Researched:** 2026-03-26
**Domain:** Guided lifecycle workflow templates, execution records, and audit-ready summaries
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Workflow structure
- **D-01:** Model onboarding and offboarding as grouped workflow phases rather than one long flat checklist.
- **D-02:** Use domain-oriented step groups such as identity, licensing, access, device, handoff, and follow-up so the operator can scan progress quickly and understand what kind of work remains.
- **D-03:** Keep onboarding and offboarding as reusable templates that launch guided runs, not ad hoc task lists.

### Automation boundary
- **D-04:** Phase 3 is tracking-only: workflow steps are executed manually by the operator and recorded in the app rather than triggered as live administrative actions.
- **D-05:** Preserve room in the model for future automation by allowing a step to be labeled as automated, but do not implement real step execution in this phase.
- **D-06:** Maintain explicit review-first workflow behavior so sensitive lifecycle actions stay high-trust, auditable, and easy to verify before future automation is considered.

### Step status and evidence
- **D-07:** Each workflow step must support the statuses `automated`, `manual`, `skipped`, and `blocked`.
- **D-08:** Require a reason whenever a step is marked `skipped` or `blocked` so exceptions are reviewable later.
- **D-09:** Support structured evidence capture per step with note text plus optional reference fields such as ticket ID, asset ID, mailbox reference, handoff reference, or similar operator-entered identifiers.

### Run completion and follow-up
- **D-10:** Finished workflow runs should end with a readable audit-style summary showing what completed, what failed or stalled, and what was skipped.
- **D-11:** The final summary must include a distinct unresolved follow-up section for manual work that still remains after the run is closed.
- **D-12:** The unresolved work list should help the solo operator decide what matters next instead of burying remaining tasks inside the full step history.

### Claude's Discretion
- Exact naming of workflow groups and the visual layout for grouped steps can be finalized during planning as long as the grouped structure stays clear and consistent.
- The precise set of structured evidence reference fields can be shaped by the existing schema and UI ergonomics, provided note text remains available and skipped/blocked reasons are mandatory.
- The planner can decide whether onboarding and offboarding share one generic workflow engine plus template definitions or use thin specialized wrappers on top of the same internal model.

### Deferred Ideas (OUT OF SCOPE)
- Real administrative step execution from the workflow UI - future phase once the review and audit model is proven.
- Broader lifecycle analytics or dashboarding beyond the run summary and unresolved follow-up list - later phase if needed.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIFE-01 | Operator can start onboarding from a reusable template that includes identity, licensing, group, device, and checklist steps | Separate template tables from run tables; seed onboarding templates; route-level launch API; queue-first run list |
| LIFE-02 | Operator can run offboarding from a guided workflow that covers access removal, device recovery, mailbox or file handoff, and follow-up tasks | Use the same engine with offboarding template definitions and grouped phases; support unresolved follow-up on close |
| LIFE-03 | Operator can mark workflow steps as automated, manual, skipped, or blocked and capture notes or evidence for each | Typed run-step status enum, mandatory exception reason, structured evidence fields, React Query invalidation on step mutations |
| LIFE-04 | Operator can review a final workflow summary showing what completed, what failed, and what still needs manual work | Persist run summaries from step state, compute unresolved follow-up server-side, expose summary endpoint and summary UI |
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

Phase 3 should be planned as a small, explicit workflow engine for two lifecycle templates, not as general automation. The right shape is: reusable template definitions, immutable run snapshots created from those templates, step-level evidence and exception handling, and server-generated run summaries with unresolved follow-up pulled forward. That satisfies the locked tracking-only scope while leaving a clean seam for future automation metadata.

The existing codebase already gives the right extension points. Prisma is the canonical write model, Fastify route modules are injected into `buildServer`, HTTP contracts stay in the route layer, and the web app already uses React Router for navigation plus React Query for server state. Planning should preserve those patterns and avoid introducing a second data-loading model or a generic BPMN-style engine.

The main planning risk is not library choice. It is data shape discipline. If template definitions and mutable run state get mixed together, or if evidence is stored only in freeform text, Phase 3 will either lose auditability or require a rewrite in Phase 4/5. Keep templates, runs, step state, evidence, and final summaries separate from day one.

**Primary recommendation:** Build one generic lifecycle module with distinct template, run, group, step, and summary records; expose it through Fastify route adapters; drive the UI from grouped active runs and unresolved follow-up lists.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma ORM | `6.19.2` in workspace, `7.5.0` latest registry | Relational persistence for templates, runs, step state, and audit metadata | Already canonical in this repo; relation queries, nested writes, and transactions fit template-to-run snapshot creation well |
| Fastify | `5.8.4` | API route registration and request handling | Matches existing server composition and injected repository test pattern |
| `@tanstack/react-query` | `5.95.2` | Query, mutation, and cache invalidation for lifecycle pages | Already used in the web app; avoids inventing a second client state model |
| `react-router-dom` | `7.13.2` | Route registration and app-shell navigation | Existing app shell already uses route objects and nested pages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React | `19.2.4` | UI composition for grouped run pages and summaries | Use for lifecycle pages and evidence forms inside the existing shell |
| `node:test` | Node `25.8.1` runtime | API and repository verification | Use for route and service tests; it is already passing in this workspace |
| `@tanstack/react-table` | `8.21.3` | Dense read-oriented tables for run summaries or history views | Use only where tabular scanning is better than grouped cards |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing Prisma 6 line | Prisma 7.x | Current registry is newer, but a Prisma major upgrade is not Phase 3 scope and would blur lifecycle planning with platform migration |
| React Query + fetch helpers | React Router loaders/actions for all lifecycle writes | Adds a second server-state pattern in a repo that already standardized on React Query in Phase 2 |
| Relational template/run tables | One large JSON blob per workflow | Faster to scaffold, but poor for audit queries, summary derivation, and future automation seams |

**Installation:**
```bash
# No new package is required for the baseline lifecycle slice.
# Reuse the existing workspace stack and only add packages if planning finds a hard validation gap.
```

**Version verification:** Verified on 2026-03-26 with `npm view`.
- Prisma latest: `7.5.0` published 2026-03-11. Workspace CLI currently resolves to `6.19.2`.
- Fastify latest: `5.8.4` published 2026-03-23.
- `@tanstack/react-query` latest: `5.95.2` published 2026-03-23.
- `react-router-dom` latest: `7.13.2` published 2026-03-23.
- React latest stable: `19.2.4` published 2026-01-26.

## Architecture Patterns

### Recommended Project Structure
```text
apps/api/src/
|-- modules/lifecycle/          # Prisma-backed repositories, domain types, summary builder
|-- routes/lifecycle.ts         # HTTP contract mapping and request validation
`-- server.ts                   # registerLifecycleRoutes(app, deps)

apps/web/src/
|-- lib/lifecycle.ts            # Fetch helpers and lifecycle DTOs
|-- routes/lifecycle/           # Active runs, run detail, summary views
`-- components/lifecycle/       # Grouped step lists, evidence forms, summary cards

prisma/
`-- schema.prisma               # Template/run/group/step/audit relations
```

### Pattern 1: Template Snapshot Engine
**What:** Keep reusable template definitions separate from mutable execution records. Starting a run copies ordered groups and steps into run tables so history does not drift when templates change later.
**When to use:** Always for LIFE-01 and LIFE-02.
**Example:**
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
await prisma.$transaction(async (tx) => {
  const template = await tx.lifecycleTemplate.findUniqueOrThrow({
    where: { key: "employee-onboarding" },
    include: { groups: { include: { steps: true }, orderBy: { position: "asc" } } },
  });

  await tx.lifecycleRun.create({
    data: {
      templateId: template.id,
      kind: "onboarding",
      subjectUserId,
      groups: {
        create: template.groups.map((group) => ({
          key: group.key,
          label: group.label,
          position: group.position,
          steps: {
            create: group.steps.map((step) => ({
              key: step.key,
              title: step.title,
              instructions: step.instructions,
              automationMode: step.automationMode,
              position: step.position,
              status: "manual",
            })),
          },
        })),
      },
    },
  });
});
```

### Pattern 2: Route-Layer DTO Mapping
**What:** Keep lifecycle HTTP response shapes in the Fastify route layer and keep Prisma/domain records internal.
**When to use:** Every new lifecycle endpoint.
**Example:**
```typescript
// Source: /F:/AI/AgentSmith/apps/api/src/routes/assets.ts
export async function registerLifecycleRoutes(app, options) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/lifecycle/runs/:runId", routeOptions, async (request, reply) => {
    const run = await options.lifecycleRepository.getRun(request.params.runId);
    if (!run) {
      reply.code(404);
      return { message: "Run not found" };
    }

    return mapRunResponse(run);
  });
}
```

### Pattern 3: Query-Keyed Mutations With Explicit Invalidation
**What:** Treat run detail, active runs, and summary views as server state. Mutations should invalidate affected queries instead of patching multiple screens manually.
**When to use:** Step status updates, evidence saves, run close operations.
**Example:**
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
const queryClient = useQueryClient();

const updateStep = useMutation({
  mutationFn: saveLifecycleStep,
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: ["lifecycle-run", variables.runId] });
    queryClient.invalidateQueries({ queryKey: ["lifecycle-active-runs"] });
    queryClient.invalidateQueries({ queryKey: ["lifecycle-summary", variables.runId] });
  },
});
```

### Anti-Patterns to Avoid
- **Flat checklist model:** It directly violates D-01/D-02 and makes unresolved follow-up harder to surface.
- **Template and run state in one table:** Historical runs will silently change when templates are edited.
- **Freeform-only evidence:** Good for notes, bad for searchable audit context. Keep note text plus structured reference fields.
- **Client-side summary truth:** Final summary and unresolved follow-up should be derived server-side from persisted run state.
- **Live admin actions in Phase 3:** Out of scope and conflicts with the tracking-only decision.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Workflow persistence | A generic workflow/BPMN engine | Thin lifecycle-specific template/run tables in Prisma | Phase 3 only needs guided execution records, not orchestration semantics |
| Request validation | Ad hoc `if`/`else` body parsing in handlers | Fastify schemas or route-level typed parsing | Write operations need predictable, reviewable contracts |
| Query synchronization | Manual component-to-component refresh logic | React Query invalidation keyed by run/list/summary | Prevents stale grouped views after step updates |
| Summary generation | Hand-edited final notes | Server-side aggregation from persisted run-step state | Keeps LIFE-04 deterministic and auditable |

**Key insight:** The complexity in this phase is audit-safe state transitions, not automation. Keep the engine narrow and lifecycle-specific.

## Common Pitfalls

### Pitfall 1: Mutating historical runs when templates change
**What goes wrong:** Editing a template changes old onboarding/offboarding records retroactively.
**Why it happens:** The run points at live template rows instead of a copied snapshot.
**How to avoid:** Copy group and step definitions into run tables at launch time.
**Warning signs:** Re-opening an old run shows new steps that were not present when it was executed.

### Pitfall 2: Treating `automated` as actual execution
**What goes wrong:** The UI suggests the app performed admin actions even though Phase 3 is tracking-only.
**Why it happens:** The status name is overloaded.
**How to avoid:** Store `automationMode` on the step definition and `status` on the run step; in this phase, `automated` means "completed through an external automated process and recorded here," not "triggered by this app."
**Warning signs:** Planning starts adding buttons that disable accounts, revoke access, or recover devices.

### Pitfall 3: Losing exception context
**What goes wrong:** A run says a step was skipped or blocked but nobody knows why.
**Why it happens:** Reason fields are optional or buried in generic notes.
**How to avoid:** Make `reason` mandatory for `skipped` and `blocked`, keep note text separate, and surface exception counts in the summary.
**Warning signs:** Summary pages show skipped steps with empty explanation fields.

### Pitfall 4: Building the summary only in the UI
**What goes wrong:** Different pages disagree about what is unresolved.
**Why it happens:** Each screen computes follow-up differently from raw step data.
**How to avoid:** Centralize summary derivation in the API or repository layer.
**Warning signs:** Active-run view, detail view, and final summary disagree on blocked/skipped counts.

## Code Examples

Verified patterns from official sources and current repo structure:

### Launch a Run With Nested Writes
```typescript
// Source: https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries
const run = await prisma.lifecycleRun.create({
  data: {
    kind: "offboarding",
    templateId,
    groups: {
      create: snapshotGroups,
    },
  },
  include: {
    groups: {
      include: { steps: true },
      orderBy: { position: "asc" },
    },
  },
});
```

### Update a Step and Refresh Affected Screens
```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/reference/useMutation
const mutation = useMutation({
  mutationFn: updateLifecycleStep,
  onSuccess: (_, { runId }) => {
    queryClient.invalidateQueries({ queryKey: ["lifecycle-run", runId] });
    queryClient.invalidateQueries({ queryKey: ["lifecycle-active-runs"] });
  },
});
```

### Register Lifecycle Routes the Same Way Assets Are Registered
```typescript
// Source: /F:/AI/AgentSmith/apps/api/src/server.ts
const lifecycleRepository = options.lifecycleRoutes?.repository ?? new LifecycleRepository(prisma);

app.register(registerLifecycleRoutes, {
  repository: lifecycleRepository,
  preHandler: options.lifecycleRoutes?.preHandler,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Memory-driven onboarding/offboarding | Reusable templates plus execution records | Current requirement set, 2026-03-26 | Makes lifecycle work inspectable and repeatable |
| One long operational checklist | Grouped workflow phases | Locked in Phase 3 context, 2026-03-26 | Improves scanability for a solo operator |
| Summary hidden inside step history | Explicit final summary plus unresolved follow-up | Locked in Phase 3 context, 2026-03-26 | Surfaces what matters next immediately |
| Repo package manifests at older caret ranges | Installed workspace currently resolves newer patch/minor versions | Verified 2026-03-26 | Plan around the installed stack; do not bundle a dependency-upgrade phase into lifecycle work |

**Deprecated/outdated:**
- Ad hoc lifecycle task lists: replaced here by reusable template snapshots and explicit run records.
- Silent background writes for this phase: replaced by review-first tracked operations.

## Open Questions

1. **Should templates be editable in the UI during Phase 3?**
   - What we know: Requirements only demand reusable templates, not template administration.
   - What's unclear: Whether operators need runtime template editing before v1 ships.
   - Recommendation: Seed templates in code or migrations for Phase 3 and defer template-editing UX.

2. **Should lifecycle DTOs move into `@agentsmith/shared` now?**
   - What we know: Phase 2 kept asset DTO typing local to the web package because shared exports were not ready for that slice.
   - What's unclear: Whether Phase 3 should standardize shared lifecycle DTOs or keep the same local pattern.
   - Recommendation: Keep DTOs local unless both API and web need them across package boundaries immediately. Do not expand shared package scope without a concrete pain point.

3. **How many structured evidence reference fields should ship in v1?**
   - What we know: Note text is required to remain available, and structured references are discretionary.
   - What's unclear: The minimum field set that gives audit value without slowing operators down.
   - Recommendation: Start with a narrow optional set such as `ticketId`, `assetId`, `mailboxRef`, and `handoffRef`, plus a generic note.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API, web, tests | yes | `v25.8.1` | none |
| npm | Registry checks, local CLI execution | yes | `11.11.1` | none |
| pnpm | Workspace scripts and package-manager standard | yes via fallback | `10.11.1` through `npx pnpm` | Use `npx pnpm ...` until `pnpm` is on `PATH` |
| Prisma CLI | Schema/client generation | yes via fallback | `6.19.2` through `npx prisma` | Use `npx prisma ...` |
| PostgreSQL server | Prisma datasource, migrations, end-to-end run persistence | no | localhost:5432 unreachable | No runtime fallback for actual persistence |
| `psql` CLI | Manual DB inspection | no | none | Use Prisma CLI where possible; manual SQL inspection unavailable |

**Missing dependencies with no fallback:**
- PostgreSQL reachability for real migrations and persisted lifecycle run testing.

**Missing dependencies with fallback:**
- `pnpm` on `PATH` - use `npx pnpm`.
- Prisma global CLI - use `npx prisma`.
- `psql` CLI - not needed for baseline coding, but limits manual DB inspection.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` on Node `25.8.1` |
| Config file | none |
| Quick run command | `npx pnpm --filter @agentsmith/api test` |
| Full suite command | `npx pnpm --filter @agentsmith/api test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIFE-01 | Launch onboarding from reusable grouped template | route + repository | `node --import tsx --test apps/api/src/modules/lifecycle/lifecycle.service.test.ts` | no - Wave 0 |
| LIFE-02 | Launch offboarding and retain grouped follow-up steps | route + repository | `node --import tsx --test apps/api/src/modules/lifecycle/lifecycle.service.test.ts` | no - Wave 0 |
| LIFE-03 | Update step status with required exception reason and structured evidence | route | `node --import tsx --test apps/api/src/routes/lifecycle.test.ts` | no - Wave 0 |
| LIFE-04 | Return final summary with completed/failed/unresolved follow-up counts | repository + route | `node --import tsx --test apps/api/src/modules/lifecycle/lifecycle-summary.test.ts` | no - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx pnpm --filter @agentsmith/api test`
- **Per wave merge:** `npx pnpm --filter @agentsmith/api test`
- **Phase gate:** API lifecycle tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/lifecycle/lifecycle.service.test.ts` - template launch and step-transition coverage for LIFE-01 through LIFE-03
- [ ] `apps/api/src/routes/lifecycle.test.ts` - HTTP contract coverage for launch, step updates, and summary fetch
- [ ] `apps/api/src/modules/lifecycle/lifecycle-summary.test.ts` - unresolved follow-up aggregation coverage for LIFE-04
- [ ] Database-backed verification path - Phase 3 implementation can start with injected repositories, but end-to-end persistence still needs PostgreSQL reachable

## Sources

### Primary (HIGH confidence)
- [Prisma relation queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries) - verified nested writes and relation loading patterns
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - verified transaction guidance for multi-record lifecycle launch
- [Prisma JSON fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) - verified when JSON is appropriate for structured evidence metadata
- [Fastify routes reference](https://fastify.dev/docs/latest/Reference/Routes/) - verified route registration model
- [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) - verified request/response validation approach
- [TanStack Query `useMutation`](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation) - verified mutation contract
- [TanStack Query invalidation from mutations](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations) - verified cache invalidation pattern
- [server.ts](/F:/AI/AgentSmith/apps/api/src/server.ts) - confirmed dependency-injected Fastify registration pattern
- [assets.ts](/F:/AI/AgentSmith/apps/api/src/routes/assets.ts) - confirmed route-layer DTO mapping pattern
- [asset-health.repository.ts](/F:/AI/AgentSmith/apps/api/src/modules/assets/asset-health.repository.ts) - confirmed Prisma repository style and server-side derivation pattern
- [router.tsx](/F:/AI/AgentSmith/apps/web/src/router.tsx) - confirmed lifecycle pages should plug into the existing shell
- [queryClient.ts](/F:/AI/AgentSmith/apps/web/src/lib/queryClient.ts) - confirmed shared React Query defaults
- [03-CONTEXT.md](/F:/AI/AgentSmith/.planning/phases/03-lifecycle-automation/03-CONTEXT.md) - locked decisions and scope boundaries
- [REQUIREMENTS.md](/F:/AI/AgentSmith/.planning/REQUIREMENTS.md) - requirement traceability for LIFE-01 through LIFE-04
- [STATE.md](/F:/AI/AgentSmith/.planning/STATE.md) - current toolchain and Phase 2 continuity guidance

### Secondary (MEDIUM confidence)
- npm registry package metadata checked on 2026-03-26 via `npm view` for Prisma, Fastify, React Query, React Router, and React versions

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against current registry metadata and existing repo usage
- Architecture: MEDIUM - strongly supported by current repo patterns, but lifecycle schema shape is still an implementation inference
- Pitfalls: MEDIUM - derived from locked decisions plus standard persistence/UI failure modes

**Research date:** 2026-03-26
**Valid until:** 2026-04-25
