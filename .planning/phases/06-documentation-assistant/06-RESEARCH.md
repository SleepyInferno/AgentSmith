# Phase 6: Documentation Assistant - Research

**Researched:** 2026-03-28
**Domain:** Searchable operational documentation, structured metadata tagging, review aging, and audit-friendly metadata changes
**Confidence:** MEDIUM

<user_constraints>
## User Constraints

No `06-CONTEXT.md` exists yet for this phase. The planning constraints below are inferred from `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, and `AGENTS.md`.

### Locked or strongly implied decisions

- Keep the phase inside the five-tool v1 boundary. Do not turn this into a full wiki, CMDB rewrite, or generalized knowledge-management platform.
- Preserve the queue-first and explanation-first product pattern from Phases 02 through 05 so the operator can decide what matters within minutes of opening the app.
- Search must work across SOPs, infrastructure notes, vendor notes, contacts, and recovery procedures, not only across document titles.
- Search relevance must come from a mix of document content, structured metadata, and operational freshness. A plain client-side table filter is not enough.
- Documents must be taggable and linkable by system, site, owner, and category.
- Review dates and history must make stale knowledge visible.
- Any write action introduced in this phase, especially metadata changes such as tags or review dates, must be explicit, reviewable, and logged.
- Connector-specific ingestion details must stay isolated from canonical documentation models.
- The phase should remain useful even before a live documentation connector exists, so seeded-example fallback is still valuable.

### the agent's Discretion

- Whether document body storage is a plain text field, a markdown field, or a normalized search field can be finalized during planning as long as searchable content exists in the canonical model.
- Search implementation can use PostgreSQL full-text search plus optional trigram fallback, or a narrower deterministic fallback if extension or migration constraints make that safer.
- The exact UX split between overview, search inventory, detail page, and metadata review drawer can be decided during planning as long as the first screen stays queue-first and the write boundary stays explicit.
- The phase can treat full document authoring and rich-text editing as out of scope while still supporting metadata tagging and review-date changes required by `DOCS-02` and `DOCS-03`.

### Deferred Ideas (OUT OF SCOPE)

- Rich-text or markdown editor for full document authoring
- AI answer synthesis, chat-over-docs, or semantic retrieval pipelines
- Bidirectional connector write-back into external documentation systems
- Multi-step approval workflows for content publishing
- Attachment ingestion, OCR, or binary document parsing
- Full diff viewer for every revision

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-01 | Operator can search operational documentation across SOPs, vendors, contacts, infrastructure notes, and recovery procedures | Use a server-owned search service over canonical document content plus typed metadata, with ranking and fallback seeded data |
| DOCS-02 | Operator can tag documents by system, site, owner, and category so search results stay relevant | Model typed metadata assignments and system links separately from connector-specific fields; expose explicit reviewable mutation flows |
| DOCS-03 | Operator can view document history and review dates so stale documentation is visible | Persist review metadata and revision history, then surface aging and change context in queue, search, and detail views |

</phase_requirements>

## Project Constraints (from AGENTS.md and STATE.md)

- Preserve the five-tool v1 scope unless a roadmap update explicitly expands it.
- Favor guided workflows and clear risk queues over broad enterprise-style dashboard sprawl.
- Keep connector-specific logic isolated from internal domain models.
- Treat write actions as high-trust operations that require auditability and clear review UX.
- The app should help a solo admin decide what matters next within a few minutes of opening it.
- Sensitive actions are explicit, reviewable, and logged.
- Each phase should produce a usable slice, not just scaffolding.
- Phase 01 foundations are not fully complete yet, so Phase 06 cannot assume fully live auth, connector sync, or production audit actor attribution.

## Summary

Phase 6 should be planned as a narrow documentation catalog plus review workflow, not as a generic knowledge base. The strongest shape is: a canonical document read model, typed metadata assignments for system/site/owner/category relevance, server-owned search ranking, a queue-first overview of stale or weakly classified documents, a searchable inventory, and a detail page that shows history, review age, and linked context. This delivers operational value while preserving the product's "what matters next" posture.

The main architectural decision is search. PostgreSQL full-text search is the best fit for v1 because the repo already uses PostgreSQL through Prisma, and official PostgreSQL docs support weighted `tsvector` search, `websearch_to_tsquery` for forgiving user input, ranking functions, and highlighting. Prisma can model PostgreSQL index types such as `GIN`, but Prisma's schema support does not cover function-based indexes like `to_tsvector(...)`, so the search index should be created in a custom SQL migration and the query logic should live behind a repository boundary. If typo tolerance matters for short vendor or contact names, `pg_trgm` is a good secondary tool because PostgreSQL supports similarity operators and index-backed `LIKE`/`ILIKE` searches; Prisma docs also confirm extensions can be enabled with standard SQL.

The main product risk is accidental scope expansion. If planning starts to include document authoring, attachment management, connector sync, AI Q&A, approval workflows, or a large metadata admin surface, Phase 6 will drift out of v1. The safer boundary is read-heavy documentation discovery plus a very narrow, review-first write flow for metadata tags and review scheduling. That is enough to satisfy `DOCS-02` and `DOCS-03` while honoring the project's high-trust mutation rule.

**Primary recommendation:** Plan Phase 6 around five slices: canonical schema and fixtures, search/read APIs, queue-first overview plus search inventory UI, explanation-first detail/history UI, and a final gap-closure slice for metadata write review, audit logging, and relevance edge-case tests.

## Standard Stack

### Core

| Library or system | Repo status | Purpose | Why it fits |
|-------------------|------------|---------|-------------|
| PostgreSQL via Prisma | already in repo | Canonical persistence for documents, metadata, links, and history | Current app already centers canonical models in Prisma |
| Fastify route modules | already in repo | Search, inventory, detail, and metadata-update endpoints | Matches existing `buildServer` dependency-injection pattern |
| React Router + React Query | already in repo | Queue, inventory, detail, and explicit review flows | Same app-shell and server-state pattern as Phases 02 through 05 |
| `node:test` + `tsx` | already in repo | Route and repository verification | Matches existing API test setup |

### Supporting

| Tool | Purpose | When to use |
|------|---------|-------------|
| PostgreSQL full-text search (`to_tsvector`, `websearch_to_tsquery`, `ts_rank_cd`) | Weighted content search and ranking | Primary search implementation for `DOCS-01` |
| PostgreSQL `pg_trgm` extension | Similarity and typo-tolerant fallback for short labels | Optional improvement for vendor, contact, and title matching when exact token search is too brittle |
| Existing app review panel pattern | Explicit mutation confirmation UX | Metadata tag or review-date changes only |

### Alternatives Considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL full-text search | Client-side filtering over fetched documents | Simpler to scaffold, but weak relevance and poor scalability for real operator use |
| Typed metadata joins | Freeform JSON tags only | Faster to code, but weaker filtering, linking, and auditability |
| Narrow metadata edits only | Full document editor | Larger surface area, harder trust boundary, and unnecessary for current requirements |
| Repository-owned ranking | UI-owned search sorting | Easier to prototype, but would duplicate relevance logic and drift across pages |

## Architecture Patterns

### Recommended Project Structure

```text
prisma/
`-- schema.prisma                       # canonical document, tag, link, review, and revision models

apps/api/src/
|-- modules/docs/                       # repository, search service, fixtures, types, relevance helpers
|-- routes/docs.ts                      # HTTP contract mapping and explicit metadata review actions
`-- server.ts                           # registerDocsRoutes(app, deps)

apps/web/src/
|-- lib/docs.ts                         # typed fetchers and mutation helpers
|-- routes/docs/                        # overview, inventory, detail, metadata review routes
`-- components/docs/                    # queue, search results, history timeline, metadata review UI
```

### Pattern 1: Canonical document plus typed metadata assignments

**What:** Keep one canonical `Document` record as the stable domain root, then hang relevance metadata and history off it with typed tables instead of many connector-specific columns.

**Why:** The current schema already has a `Document` model, but it is too thin for `DOCS-01` through `DOCS-03`. Search, linking, and review aging need structured metadata.

**Recommended shape:**

- Extend `Document` with canonical search fields such as `summary`, `contentText`, `reviewStatus`, `lastReviewedAt`, `sourceUpdatedAt`, `contentUpdatedAt`, and maybe `searchDocument` or a migration-owned search vector backing field.
- Add a typed metadata assignment model for dimensions like `system`, `site`, `owner`, and `category`.
- Add a system-link relation that can point at existing `System` records without inventing a new `Site` model first.
- Add revision or history records that capture change type, change summary, changed fields, actor snapshot if available, and timestamps.

**Important inference:** Because there is no first-class `Site` model in the current schema, site and owner should remain normalized string dimensions for now, while system links can use real relations.

### Pattern 2: Repository-owned search pipeline

**What:** Build one search service in the API layer that combines weighted full-text search, structured filter matching, and freshness signals into a stable result DTO.

**Why:** PostgreSQL supports weighted vectors, forgiving query parsing, and relevance ranking. The API should own that logic so overview, inventory, and detail surfaces all reflect the same relevance semantics.

**Recommended search behavior:**

- Build a weighted search document from title, summary, body text, and tag values.
- Weight title and key labels above body text.
- Use `websearch_to_tsquery` for raw user text so the operator can type natural queries without syntax errors.
- Combine database rank with operational factors such as exact tag matches, overdue review date penalties, and recent revision boosts where helpful.
- Return matched metadata and reason labels so the UI can explain why a document surfaced.

**Important implementation constraint:** Prisma docs indicate that function-based indexes such as `to_tsvector(...)` are not yet supported in Prisma schema definitions, so the plan should isolate search index creation in custom SQL migrations while keeping the query contract in repository code.

### Pattern 3: Queue-first documentation overview

**What:** The first docs screen should answer "what knowledge needs attention?" before it becomes a generic search page.

**Good queue candidates:**

- overdue review dates
- documents missing category, owner, or site metadata
- documents not linked to any system when they should be
- recently changed documents that have not been reviewed
- searches or sections with zero high-confidence matches, if the repository can surface that signal

**Why:** This matches the product's existing queue-first posture and keeps the module useful even for operators who are not actively searching.

### Pattern 4: Explicit reviewable metadata writes

**What:** Narrow write flows to metadata relevance work such as tag assignment, system linking, and review-date updates. Keep them behind explicit review UI and audit records.

**Why:** `DOCS-02` requires tagging. The project rules say writes must be high-trust and logged.

**Recommended mutation shape:**

- Load current metadata into a review form or side panel.
- Show before-and-after changes for tag assignments and review dates.
- Persist the change and append both an audit event and a document history event.
- Keep document body editing out of scope for this phase.

**Important practical note:** Phase 01 audit foundations are not fully complete, so planning should rely on the existing `AuditEvent` model without assuming perfect actor identity enrichment yet.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Search relevance | Client-side manual sorting rules across multiple pages | One repository-owned ranking query | Prevents drift between overview, inventory, and detail |
| Metadata tagging | Four unrelated nullable columns plus ad hoc arrays | Typed metadata assignments and system links | Easier to filter, audit, and extend |
| History | Recomputing "last changed" from arbitrary fields | Explicit revision or review-event records | Makes staleness and history visible and testable |
| Mutation safety | Inline save button with silent write | Explicit review step plus audit event | Matches project trust boundary |
| v1 discovery | AI-generated answer engine | Search, filters, and relevance explanations | Delivers current requirement with less risk |

## Anti-Patterns to Avoid

- Turning Phase 6 into a generic document editor or wiki migration
- Hiding stale documentation signals behind a pure search box
- Using connector-specific fields directly in UI DTOs
- Storing metadata as untyped freeform JSON only
- Making tags editable without a review step or audit event
- Depending on Prisma schema alone for function-based search indexes
- Recomputing search ranking differently in the UI and API

## Common Pitfalls

### Pitfall 1: Search works only for exact titles

**What goes wrong:** Operators can only find documents when they already remember the exact title.

**Why it happens:** Search is implemented as `ILIKE title` plus client-side filtering.

**How to avoid:** Build a weighted search document over title, summary, content, and typed metadata. Include exact tag and system matches in the rank strategy.

### Pitfall 2: Metadata becomes impossible to trust

**What goes wrong:** Documents accumulate inconsistent categories, duplicate owners, and one-off labels.

**Why it happens:** Metadata is stored in freeform arrays or in page-local state without normalization.

**How to avoid:** Use typed metadata assignments with normalized keys and human labels, and centralize writes through reviewed API routes.

### Pitfall 3: Review dates exist but do not matter

**What goes wrong:** `reviewDueAt` is present in the schema but operators do not see overdue knowledge until after a failed search.

**Why it happens:** Review aging stays hidden in the detail page.

**How to avoid:** Make overdue review dates and unreviewed recent changes first-class queue items on the docs overview page.

### Pitfall 4: Search index implementation leaks into product planning

**What goes wrong:** Planning gets blocked on Prisma index limitations or migration tooling details.

**Why it happens:** Search is designed around ORM convenience rather than the stable API contract.

**How to avoid:** Keep repository DTOs and API contracts stable while allowing the search index to be implemented with custom SQL migrations as needed.

### Pitfall 5: Tagging quietly becomes content editing

**What goes wrong:** The module grows a large content-authoring surface, approval states, and formatting concerns.

**Why it happens:** The plan treats `DOCS-02` as a request for full document management.

**How to avoid:** Keep Phase 6 focused on discoverability, metadata quality, history visibility, and explicit small-scope metadata writes.

## Open Questions

1. **Does v1 need full document body editing or only metadata updates?**
   - What we know: Requirements explicitly demand search, tags, links, history, and review dates.
   - What is unclear: Whether the operator must author full document content inside this app.
   - Recommendation: Plan only metadata updates in Phase 6 and defer authoring/editing until a later phase if the user asks for it.

2. **Should typo tolerance ship in the first slice or as a hardening step?**
   - What we know: PostgreSQL `pg_trgm` supports similarity search and indexed `LIKE`/`ILIKE`.
   - What is unclear: Whether v1's seeded or early live corpus will be large enough to justify the extra migration and query complexity immediately.
   - Recommendation: Keep full-text search as the baseline and treat trigram similarity as a later plan or final hardening task if search quality looks weak.

3. **How much history must be visible to satisfy `DOCS-03`?**
   - What we know: The requirement calls for document history and review dates so stale documentation is visible.
   - What is unclear: Whether a timestamped change list is enough, or whether users need field-level diff visibility.
   - Recommendation: Plan for revision events and review events now; defer full diff rendering.

4. **How should site and owner metadata be normalized without first-class domain models?**
   - What we know: Current schema has `System` as a first-class model but not `Site`.
   - What is unclear: Whether introducing new site tables helps or adds unnecessary scope.
   - Recommendation: Keep site and owner as typed metadata values in Phase 6 and only add first-class domain tables when another phase truly needs them.

## Environment Availability

| Dependency | Required by | Available | Notes |
|------------|-------------|-----------|-------|
| Node.js | API, web, tests | yes | local workspace already runs TSX and node-based tests |
| `npx pnpm` | workspace scripts | yes | top-level scripts already rely on it |
| Prisma CLI | schema and client generation | yes | available via workspace dependencies |
| PostgreSQL runtime | custom SQL migrations and real search behavior | not verified in this planning run | phase planning should not assume a live DB check succeeded |
| PostgreSQL extension permissions | `pg_trgm` and search migration options | not verified in this planning run | treat as migration-time concern and keep fallback path available |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` on the API side plus `vite build` and TypeScript compile on the web side |
| Config file | none |
| Quick run command | `npx pnpm --filter @agentsmith/api test` |
| Full suite command | `npx pnpm build` |
| Estimated runtime | ~45 seconds |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOCS-01 | Search returns relevant documents across content and metadata | repository + route | `node --import tsx --test apps/api/src/modules/docs/docs.repository.test.ts apps/api/src/routes/docs.test.ts` | no - Wave 0 |
| DOCS-02 | Metadata updates are explicit, reviewable, and persisted | route + repository | `node --import tsx --test apps/api/src/modules/docs/docs.repository.test.ts apps/api/src/routes/docs.test.ts` | no - Wave 0 |
| DOCS-03 | Detail responses expose history and review aging | route + repository | `node --import tsx --test apps/api/src/modules/docs/docs.repository.test.ts apps/api/src/routes/docs.test.ts` | no - Wave 0 |

### Suggested Wave 0 coverage

- `apps/api/src/modules/docs/docs.repository.test.ts` - search ranking, filter semantics, history projection, and queue derivation
- `apps/api/src/routes/docs.test.ts` - search, overview, detail, and metadata-review HTTP contracts
- `apps/web/src/routes/docs/DocumentationOverviewPage.tsx` build coverage via `npx pnpm --filter @agentsmith/web build`
- `apps/web/src/routes/docs/DocumentationSearchPage.tsx` build coverage via `npx pnpm --filter @agentsmith/web build`
- `apps/web/src/routes/docs/DocumentationDetailPage.tsx` build coverage via `npx pnpm --filter @agentsmith/web build`

### Sampling Rate

- After every API task commit: run the task's exact `node --import tsx --test ...` command
- After every web task commit: run `npx pnpm --filter @agentsmith/web build`
- After every plan wave: run `npx pnpm --filter @agentsmith/api test` or `npx pnpm build`, depending on the wave scope
- Before `$gsd-verify-work`: full API tests and web build should be green

## Sources

### Primary (HIGH confidence)

- `F:\AI\AgentSmith\AGENTS.md` - project scope, trust-boundary, and product intent
- `F:\AI\AgentSmith\.planning\ROADMAP.md` - Phase 6 goal, requirements, success criteria, and UI hint
- `F:\AI\AgentSmith\.planning\REQUIREMENTS.md` - requirement traceability for `DOCS-01` through `DOCS-03`
- `F:\AI\AgentSmith\.planning\STATE.md` - current product posture and active phase context
- `F:\AI\AgentSmith\prisma\schema.prisma` - current `Document`, `System`, and `AuditEvent` model boundaries
- `F:\AI\AgentSmith\apps\api\src\server.ts` - injected route-registration pattern
- `F:\AI\AgentSmith\apps\api\src\routes\assets.ts` - route-layer DTO mapping pattern
- `F:\AI\AgentSmith\apps\api\src\routes\backup.ts` - current queue-plus-inventory route shape and explicit read-only contract
- `F:\AI\AgentSmith\apps\web\src\router.tsx` - shell navigation pattern and existing ghost "Documentation" utility entry
- `F:\AI\AgentSmith\apps\web\src\routes\backup\BackupOverviewPage.tsx` - queue-first module UX pattern
- [PostgreSQL text search controls](https://www.postgresql.org/docs/current/textsearch-controls.html) - weighted vectors, forgiving query parsing with `websearch_to_tsquery`, ranking, and application-specific relevance
- [PostgreSQL pg_trgm](https://www.postgresql.org/docs/current/pgtrgm.html) - similarity search and index-backed `LIKE`/`ILIKE` support
- [Prisma indexes docs](https://www.prisma.io/docs/v6/orm/prisma-schema/data-model/indexes) - PostgreSQL `GIN` index support in Prisma and the limitation around function-based indexes such as `to_tsvector(...)`
- [Prisma Postgres extensions docs](https://www.prisma.io/docs/postgres/database/postgres-extensions) - extensions can be enabled with standard SQL and custom migrations

### Secondary (MEDIUM confidence)

- Local patterns from Phase 05 plan files in `F:\AI\AgentSmith\.planning\phases\05-backup-confidence-dashboard\`

## Metadata

**Confidence breakdown:**

- Product scope boundary: HIGH
- Repo architecture fit: HIGH
- Search implementation approach: MEDIUM
- Exact schema shape for typed metadata and history: MEDIUM
- Need for trigram similarity in v1: LOW to MEDIUM

**Research date:** 2026-03-28
**Valid until:** 2026-04-27
