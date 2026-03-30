---
phase: 06
slug: documentation-assistant
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-28
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` on the API side plus `vite build` and TypeScript compile on the web side |
| **Config file** | none |
| **Quick run command** | `npx pnpm --filter @agentsmith/api test` |
| **Full suite command** | `npx pnpm build` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task's automated verify command
- **After every plan wave:** Run `npx pnpm --filter @agentsmith/api test` for API-heavy waves and `npx pnpm --filter @agentsmith/web build` for web-heavy waves
- **Before `$gsd-verify-work`:** `npx pnpm build` must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | DOCS-01, DOCS-02, DOCS-03 | schema + shared type contract | `node -e "const fs=require('node:fs');const schema=fs.readFileSync('prisma/schema.prisma','utf8');const types=fs.readFileSync('apps/api/src/modules/docs/docs.types.ts','utf8');for (const token of ['enum DocumentKind','enum DocumentReviewState','enum DocumentMetadataDimension','enum DocumentRevisionType','model DocumentMetadataAssignment','model DocumentSystemLink','model DocumentRevision','searchText String','documentationLinks DocumentSystemLink[]','metadata_review_only','DocumentationSearchResponse']) { if (!(schema+types).includes(token)) process.exit(1); }"` | planned | pending |
| 06-01-02 | 01 | 1 | DOCS-01, DOCS-02, DOCS-03 | fixture corpus static contract | `node -e "const fs=require('node:fs');const fixtures=fs.readFileSync('apps/api/src/modules/docs/docs.fixtures.ts','utf8');for (const token of ['documentationFixtures','documentMetadataAssignmentFixtures','documentSystemLinkFixtures','documentRevisionFixtures','documentationFixtureSearchCases','doc-m365-break-glass','Review due date has passed','Document metadata is incomplete for operational search','Content changed after the last review','sharepoint restore','fiber noc circuit']) { if (!fixtures.includes(token)) process.exit(1); }"` | planned | pending |
| 06-02-01 | 02 | 2 | DOCS-01, DOCS-03 | repository tests | `node --import tsx --test apps/api/src/modules/docs/docs.repository.test.ts` | W0 | pending |
| 06-02-02 | 02 | 2 | DOCS-01, DOCS-03 | route tests | `node --import tsx --test apps/api/src/routes/docs.test.ts` | W0 | pending |
| 06-03-01 | 03 | 3 | DOCS-01, DOCS-02 | router + shared query-key contract | `node -e "const fs=require('node:fs');const lib=fs.readFileSync('apps/web/src/lib/docs.ts','utf8');const router=fs.readFileSync('apps/web/src/router.tsx','utf8');for (const token of ['docsQueryKeys','docs-overview','searchRoot','docs-search','docs-detail','/docs','/docs/search']) { if (!(lib+router).includes(token)) process.exit(1); }"` | planned | pending |
| 06-03-02 | 03 | 3 | DOCS-01, DOCS-02 | queue/search handoff contract | `node -e "const fs=require('node:fs');const overview=fs.readFileSync('apps/web/src/routes/docs/DocumentationOverviewPage.tsx','utf8');const queue=fs.readFileSync('apps/web/src/components/docs/DocumentationReviewQueue.tsx','utf8');const search=fs.readFileSync('apps/web/src/routes/docs/DocumentationSearchPage.tsx','utf8');const table=fs.readFileSync('apps/web/src/components/docs/DocumentationSearchResultsTable.tsx','utf8');for (const token of ['/docs/','docs-overview','focusReason','docs-search','searchQuery']) { if (!(overview+queue+search+table).includes(token)) process.exit(1); }"` | planned | pending |
| 06-04-01 | 04 | 4 | DOCS-01, DOCS-03 | detail route + adapter contract | `node -e "const fs=require('node:fs');const lib=fs.readFileSync('apps/web/src/lib/docs.ts','utf8');const router=fs.readFileSync('apps/web/src/router.tsx','utf8');for (const token of ['getDocumentationDetail','docsQueryKeys.detail','reviewAgeLabel','nextReviewStatus','historyHighlights','/docs/:documentId']) { if (!(lib+router).includes(token)) process.exit(1); }"` | planned | pending |
| 06-04-02 | 04 | 4 | DOCS-01, DOCS-03 | detail UI build | `npx pnpm --filter @agentsmith/web build` | planned | pending |
| 06-05-01 | 05 | 5 | DOCS-01, DOCS-02, DOCS-03 | repository + route tests | `node --import tsx --test apps/api/src/modules/docs/docs.repository.test.ts apps/api/src/routes/docs.test.ts` | W0 | pending |
| 06-05-02 | 05 | 5 | DOCS-02, DOCS-03 | metadata review UI build | `npx pnpm --filter @agentsmith/web build` | planned | pending |

*Status: pending, green, red, flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/docs/docs.repository.test.ts` - search ranking, metadata filters, queue derivation, detail history, and metadata-review mutation coverage
- [ ] `apps/api/src/routes/docs.test.ts` - overview, search, detail, and metadata-review HTTP contracts
- [ ] `apps/api/src/modules/docs/docs.search.ts` - shared ranking, excerpt, facet, and short-query fallback helpers
- [ ] `apps/api/src/modules/docs/docs.repository.ts` - canonical repository surface for overview, search, detail, and metadata updates
- [ ] `apps/api/src/routes/docs.ts` - route module registration, DTO mapping, and metadata-review mutation endpoint

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Queue-to-detail handoff preserves the surfaced reason when opening a queued document | DOCS-01, DOCS-03 | Static contracts can verify route-state fields exist, but not whether the context reads clearly to an operator | Open `/docs`, click a queued document, and confirm the detail page shows that it came from the overview queue plus the specific reason that surfaced it |
| Search result ordering feels operationally relevant on a realistic corpus | DOCS-01 | Automated tests can verify rank rules and contract fields, but not end-user usefulness | Seed at least 8-12 realistic docs across SOPs, vendors, contacts, and recovery notes; run 5 representative searches and confirm the first 3 results are useful without scrolling through the full list |
| Metadata review UX makes the write boundary explicit and refreshes overview/search/detail after save | DOCS-02, DOCS-03 | Build and route tests do not prove the operator understands the before/after confirmation step or notices refreshed state | Open the metadata review flow, confirm current and proposed tags are both shown, submit one review, and ensure the detail page plus overview/search surfaces reflect the updated metadata without a manual reload |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify coverage or a Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 45s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-28
