# Phase 3: lifecycle-automation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace memory-driven onboarding and offboarding work with reusable templates and guided execution records. This phase covers launching onboarding and offboarding runs, organizing steps into clear workflow groups, tracking status and evidence for each step, and producing a final run summary with unresolved manual follow-up. Broad administrative automation and additional lifecycle-adjacent modules remain out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

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

### the agent's Discretion
- Exact naming of workflow groups and the visual layout for grouped steps can be finalized during planning as long as the grouped structure stays clear and consistent.
- The precise set of structured evidence reference fields can be shaped by the existing schema and UI ergonomics, provided note text remains available and skipped/blocked reasons are mandatory.
- The planner can decide whether onboarding and offboarding share one generic workflow engine plus template definitions or use thin specialized wrappers on top of the same internal model.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project scope and requirements
- `.planning/PROJECT.md` - Product intent, guided-workflow bias, Microsoft-centric operating model, and auditability expectations for sensitive operator actions.
- `.planning/REQUIREMENTS.md` - Lifecycle requirements LIFE-01 through LIFE-04 that define template-based runs, guided offboarding, per-step status/evidence, and final summaries.
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, and phase ordering within the v1 five-tool scope.
- `.planning/STATE.md` - Current project status, Phase 2 carry-forward notes, and guidance to reuse the established router and query-client approach.
- `.planning/phases/01-foundations-and-secure-data-flow/01-CONTEXT.md` - Platform rules around Entra-first auth, explicit auditability, isolated connector logic, normalized entities, and reviewable operator actions.

### Existing implementation references
- `prisma/schema.prisma` - Current canonical entities and existing audit event model that Phase 3 should extend rather than bypass.
- `apps/api/src/server.ts` - Fastify server composition and route registration pattern for adding lifecycle APIs.
- `apps/api/src/routes/assets.ts` - Existing route-layer mapping pattern that keeps HTTP contracts stable while repositories stay internal.
- `apps/web/src/router.tsx` - Current application shell and routing structure that new lifecycle pages should plug into.
- `apps/web/src/lib/queryClient.ts` - Shared React Query defaults to reuse for lifecycle workflow data loading.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma`: already defines `User`, `Device`, `Group`, `System`, and `AuditEvent`, which gives Phase 3 a starting point for actor, target, and evidence relationships.
- `apps/api/src/server.ts`: builds the API by injecting repositories into registered route modules, which is a good fit for adding lifecycle modules without coupling them directly to Prisma everywhere.
- `apps/api/src/routes/assets.ts`: demonstrates the established pattern of parsing request filters in the route layer and mapping repository/domain records into stable HTTP responses.
- `apps/web/src/router.tsx`: provides the shared app shell and route registration pattern that lifecycle pages can extend.
- `apps/web/src/lib/queryClient.ts` and `apps/web/src/lib/assets.ts`: show the existing React Query plus thin fetch helper pattern to reuse for workflow templates, runs, and summaries.

### Established Patterns
- The app currently favors queue-first operator workflows with broad inventory views as secondary navigation, which suggests lifecycle UX should start from active runs and exceptions rather than from a dense admin console.
- API contracts are intentionally kept in the route layer so internal domain changes do not leak directly to the frontend.
- The project already treats derived operational views separately from canonical entities, which supports adding workflow-run records without overloading source-system entities.
- Prior phase context locks in explicit, reviewable operator actions and strong auditability over invisible automation.

### Integration Points
- New lifecycle routes should be added to the Fastify server alongside the existing asset routes using the same dependency-injected route module approach.
- New lifecycle pages should plug into the existing React Router shell rather than introducing a second navigation model.
- Workflow run completion should integrate with the existing audit trail direction established in `AuditEvent` and Phase 1 context.
- Workflow steps will likely reference existing canonical records such as users, devices, groups, and systems when capturing notes and evidence.

</code_context>

<specifics>
## Specific Ideas

- Onboarding and offboarding should feel like guided operational runbooks rather than freeform task trackers.
- Grouped phases should help a solo operator scan where a run stands and which operational area still needs attention.
- Final summaries should read like something the operator could reopen later to understand exactly what happened and what still needs manual work.

</specifics>

<deferred>
## Deferred Ideas

- Real administrative step execution from the workflow UI - future phase once the review and audit model is proven.
- Broader lifecycle analytics or dashboarding beyond the run summary and unresolved follow-up list - later phase if needed.

</deferred>

---

*Phase: 03-lifecycle-automation*
*Context gathered: 2026-03-26*
