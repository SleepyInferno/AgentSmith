# Roadmap: Solo IT Ops Suite

**Created:** 2026-03-26
**Phases:** 13 (7 complete, 6 planned for v1.2)
**v1 Requirements Covered:** 20 of 20
**v1.2 Requirements Covered:** 17 of 17

## Phases

### v1.0 — Core Operational Workflow Foundation

- [x] **Phase 1: Foundations and Secure Data Flow** - Establish auth, connector sync visibility, audit logging, and the shared data backbone
- [x] **Phase 2: Asset Health Dashboard** - Deliver the first high-signal operational dashboard for device risk
- [x] **Phase 3: Lifecycle Automation** - Ship guided onboarding and offboarding workflows with evidence capture
- [x] **Phase 4: Network Visibility Lite** - Deliver a lightweight network inventory, mapper, and triage view for WAN and LAN health
- [x] **Phase 5: Backup Confidence Dashboard** - Show whether systems are protected and recoverable
- [x] **Phase 6: Documentation Assistant** - Make core IT documentation searchable, structured, and reviewable

### v1.1 — Operator Experience

- [x] **Phase 7: Operator Shell Refresh** - Refresh persistent navigation, active-state styling, shared browser chrome, and functional home dashboard
- [ ] **Phase 8: Queue and Detail Refresh** *(stub — deferred to v1.3)* - Consistent queue-to-detail handoffs and shared layout rhythm
- [ ] **Phase 9: Interface Consistency and Hardening** *(stub — deferred to v1.3)* - Keyboard access, responsive refinements, and deeper automation

### v1.2 — Intune Integration

- [x] **Phase 10: Schema and Credential Foundation** - Lay the database and encryption infrastructure that every v1.2 feature depends on (completed 2026-03-30)
- [x] **Phase 11: First-Run Bootstrap** - Let the operator create a local admin account and reach the app without Entra ID (completed 2026-03-31)
- [x] **Phase 12: Integrations Settings UI** - Give the operator a secure page to configure and verify Intune and OpenAI credentials (completed 2026-03-31)
- [x] **Phase 13: Intune Device Sync** - Replace mock device data with live Intune inventory and compliance state (completed 2026-03-31)
- [ ] **Phase 14: Document Ingest Pipeline** - Parse, classify, and organize documents automatically with AI assistance
- [ ] **Phase 15: RAG Search** - Let the operator find documents using natural language with synthesized answers

## Phase Details

### Phase 1: Foundations and Secure Data Flow

Goal: Create the secure platform skeleton, normalized entity model, connector health tracking, and audit logging needed by every later module.

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md - Create the executable repository foundation for Phase 1
- [x] 01-02-PLAN.md - Implement Entra ID authentication and the first secure application shell
- [x] 01-03-PLAN.md - Implement connector health visibility and the shared audit trail surfaces for Phase 1

Requirements:
- PLAT-01
- PLAT-02
- PLAT-03

Success criteria:
1. Operator can sign in with Entra ID and reach an authenticated application shell.
2. Connector status page shows source health, last sync time, and freshness state.
3. User actions and background workflow events are persisted to an audit trail.
4. Shared canonical entities exist for users, devices, systems, groups, and documents.

UI hint: yes

### Phase 2: Asset Health Dashboard

Goal: Provide a morning-start dashboard that tells the solo IT admin which endpoints need attention first and why.

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md - Define canonical asset-health fields, freshness semantics, and risk scoring
- [x] 02-02-PLAN.md - Expose read-only inventory, queue, and detail asset APIs
- [x] 02-03-PLAN.md - Build the dashboard, queue, inventory, detail, and stale-data UX
- [x] 02-04-PLAN.md - Close inventory sort controls and watch-level web contract gaps

Requirements:
- ASST-01
- ASST-02
- ASST-03
- ASST-04

Success criteria:
1. Operator can browse and filter a normalized device inventory with key health fields.
2. A ranked queue highlights the riskiest devices without requiring manual spreadsheet work.
3. Device detail screens explain the signals driving each risk status.
4. The dashboard clearly indicates when source data is stale or incomplete.

UI hint: yes

### Phase 3: Lifecycle Automation

Goal: Replace memory-driven joiner/leaver work with reusable templates and guided execution records.

**Plans:** 4 plans

Plans:
- [x] 03-01-PLAN.md - Define lifecycle run persistence, grouped templates, and summary engine helpers
- [x] 03-02-PLAN.md - Expose lifecycle launch, active-run, step-update, and summary API routes
- [x] 03-03-PLAN.md - Build the lifecycle landing page with template launch and active-run visibility
- [x] 03-04-PLAN.md - Deliver grouped run detail, evidence capture, and close-out summary UX
- [x] 03-05-PLAN.md - Close the queue-to-detail lifecycle handoff from launch and active-run cards

Requirements:
- LIFE-01
- LIFE-02
- LIFE-03
- LIFE-04

Success criteria:
1. Operator can launch onboarding from a template and see required identity, license, access, and device steps.
2. Operator can run offboarding with explicit coverage for deprovisioning, recovery, and handoff tasks.
3. Each workflow step supports status, notes, and evidence capture.
4. Finished runs produce a readable summary for audit and follow-up purposes.

UI hint: yes

### Phase 4: Network Visibility Lite

Goal: Give the solo IT operator a lightweight, trustworthy view of sites, WAN links, LAN segments, and core network infrastructure without turning the app into a full network management suite.

**Plans:** 4 plans

Plans:
- [x] 04-01-PLAN.md - Create the canonical Phase 4 backend read model before routes or UI depend on it
- [x] 04-02-PLAN.md - Expose the Phase 4 backend read model through stable API contracts
- [x] 04-03-PLAN.md - Deliver the queue-first network landing page and filterable inventory experience
- [x] 04-04-PLAN.md - Deliver the topology map and explanation-first detail workflow for Phase 4

Requirements:
- NET-01
- NET-02
- NET-03

Success criteria:
1. Operator can view a normalized network inventory across sites, WAN links, switches, firewalls, APs, and key DHCP or VPN infrastructure with status and freshness context.
2. A lightweight network mapper shows sites, WAN and LAN segments, and core network devices with clear confirmed versus inferred relationships.
3. A prioritized queue highlights offline infrastructure, stale telemetry, and topology gaps that need review.
4. Network detail views explain the affected site or segment, last-seen state, and source-confidence context.

UI hint: yes

### Phase 5: Backup Confidence Dashboard

Goal: Show whether key systems are protected, recently backed up, and actually tested for recovery.

**Plans:** 5 plans

Plans:
- [x] 05-01-PLAN.md - Define the Phase 5 source boundary, coverage baseline, and canonical backup model
- [x] 05-02-PLAN.md - Expose the canonical backup overview, queue, inventory, and detail APIs
- [x] 05-03-PLAN.md - Deliver the queue-first backup overview and protected-system inventory
- [x] 05-04-PLAN.md - Deliver the explanation-first backup detail workflow
- [x] 05-05-PLAN.md - Close trust-boundary, verification, and edge-case gaps for backup confidence

Requirements:
- BACK-01
- BACK-02
- BACK-03

Success criteria:
1. Operator can view a protected-system inventory with backup source and recency indicators.
2. Systems lacking backup coverage or recent proof are highlighted automatically.
3. Backup confidence reflects both backup freshness and restore-test recency.
4. The module distinguishes missing data from healthy protection status.

UI hint: yes

### Phase 6: Documentation Assistant

Goal: Centralize the operational knowledge that solo admins usually carry in their head, inbox, or scattered notes.

**Plans:** 5 plans

Plans:
- [x] 06-01-PLAN.md - Define the canonical document model, metadata links, history records, and seeded search corpus
- [x] 06-02-PLAN.md - Expose server-owned docs overview, search, and detail APIs with ranked relevance and seeded fallback
- [x] 06-03-PLAN.md - Deliver the queue-first documentation overview and bookmarkable search inventory
- [x] 06-04-PLAN.md - Deliver the explanation-first document detail and review-history workflow
- [x] 06-05-PLAN.md - Add explicit metadata review, audit logging, and search relevance hardening

Requirements:
- DOCS-01
- DOCS-02
- DOCS-03

Success criteria:
1. Operator can search documentation across SOPs, infrastructure notes, contacts, vendors, and recovery procedures.
2. Documents can be tagged and linked to systems, sites, owners, and categories.
3. Document history and review dates make aging knowledge easy to spot.
4. Search results remain relevant enough to support real operational use, not just storage.

UI hint: yes

### Phase 7: Operator Shell Refresh

Goal: Refresh the shared operator shell so the operator can move through the app without hunting for controls. Covers persistent navigation consolidation, active-state styling, shared browser chrome, route context visibility, and a functional home dashboard.

**Plans:** 5/5 plans complete

Plans:
- [x] 07-01-PLAN.md - Remove dead shell components (BrowserToolbar, ReviewPanel) and unify home route into full shell layout
- [x] 07-02-PLAN.md - Introduce clean agent-topbar replacing the ProtectedLayout inline-styled header nav
- [x] 07-03-PLAN.md - Add active-state styling and route context chrome
- [x] 07-04-PLAN.md - Replace mockup dashboard with functional risk card dashboard
- [x] 07-05-PLAN.md - Rebrand sidebar subtitle and finalize shell polish

Requirements:
- SHELL-01
- SHELL-02
- SHELL-03

Success criteria:
1. Sidebar is the single navigation surface for all primary and utility routes.
2. Active-state styling clearly indicates current route across all protected pages.
3. Shell remains usable at common laptop and tablet widths without overlap or hidden controls.
4. Home route renders functional risk summary dashboard, not a mockup image.

UI hint: yes

### Phase 8: Queue and Detail Refresh *(stub — deferred to v1.3)*

Goal: Deliver consistent queue-to-detail and queue-to-inventory handoffs, back-links, shared layout rhythm, and coherent empty/error/stale state treatment across the five tools.

**Depends on:** Phase 7

Requirements:
- FLOW-01
- FLOW-02
- FLOW-03
- FLOW-04

Success criteria:
1. Operator can move from each overview queue to its matching inventory or detail screen through a consistent call to action.
2. Operator can return from every detail screen to the correct queue or inventory context without losing filter state.
3. Queue cards, inventory tables, detail summaries, and review panels share a recognizable layout rhythm across all five tools.
4. Loading, empty, stale, error, read-only, and action-required states are visually distinguishable without page-specific conventions.

**Plans:** TBD
**UI hint**: yes

### Phase 9: Interface Consistency and Hardening *(stub — deferred to v1.3)*

Goal: Harden the operator experience with keyboard access, accessible labels, responsive layouts, and broader automated UI coverage.

**Depends on:** Phase 8

Requirements:
- QUAL-01
- QUAL-02
- QUAL-03
- TEST-01
- TEST-02

Success criteria:
1. Operator can navigate primary routes, filters, dialogs, and review forms entirely by keyboard with visible focus indicators.
2. Shared navigation and workflow surfaces carry accessible labels, correct heading hierarchy, and sufficient color contrast.
3. All layouts preserve hierarchy, spacing, and tap targets at narrower widths without horizontal scroll.
4. Shell navigation, route links, back-links, and key workflows are covered by automated tests that run from the standard test command.

**Plans:** TBD
**UI hint**: yes

### Phase 10: Schema and Credential Foundation

**Goal:** Lay the database schema and server-side encryption infrastructure that every v1.2 runtime feature depends on. No feature that reads credentials, stores local auth state, or writes embeddings can be built safely until this phase is complete.

**Depends on:** Phase 7

**Requirements:** None (infrastructure prerequisite — unlocks BOOT-01..03, CRED-01..04, INGEST-01..05, RAG-01..02)

**Success criteria** (what must be TRUE):
1. Database has a `User.passwordHash` field and `User.role` field available for local admin creation without breaking existing Entra login.
2. An `IntegrationCredential` table exists with AES-256-GCM encrypted value storage; no plaintext credential can be written through any API route.
3. The pgvector extension is active in the database and the `DocumentEmbedding` table with HNSW index exists, ready to accept embedding vectors.
4. Entra ID environment variables are marked optional so the app starts and logs in without Entra pre-configuration.

**Plans:** 2/2 plans complete

Plans:
- [x] 10-01-PLAN.md — Prisma schema additions (User fields, IntegrationCredential, SystemKey, pgvector/DocumentEmbedding) + Entra env vars optional
- [x] 10-02-PLAN.md — Credential encryption runtime (credential-crypto module, SystemKey boot initialization, tests)

### Phase 11: First-Run Bootstrap

**Goal:** Let the operator create a local admin account and reach the full application on a fresh install before any external service is configured.

**Depends on:** Phase 10

**Requirements:** BOOT-01, BOOT-02, BOOT-03

**Success criteria** (what must be TRUE):
1. On first launch with no admin account, the operator is automatically redirected to a setup screen rather than a login or error page.
2. Operator can submit a username and password on the setup screen and immediately log in with those credentials.
3. After the first admin is created, the setup endpoint returns a permanent error for any further attempt — the screen is inaccessible to all subsequent visitors.
4. Operator can reach all protected routes using local credentials without configuring Entra ID.

**Plans:** 2/2 plans complete

Plans:
- [x] 11-01-PLAN.md — API-side bootstrap and local auth (auth service loginLocal, Entra guard, bootstrap routes, local login route, tests)
- [x] 11-02-PLAN.md — Web-side bootstrap UI (SetupPage, useBootstrapStatus hook, ProtectedLayout redirect, LoginPage dual-mode, mock API, tests)

**UI hint**: yes

### Phase 12: Integrations Settings UI

**Goal:** Give the operator a secure, in-app page to configure Intune and OpenAI credentials and confirm that each connection is working before sync or ingest is attempted.

**Depends on:** Phase 10

**Requirements:** CRED-01, CRED-02, CRED-03, CRED-04

**Success criteria** (what must be TRUE):
1. Operator can enter tenant ID, client ID, and client secret for Intune and save them; the form confirms save success without echoing the secret back.
2. Operator can enter an OpenAI API key and save it; the saved value is never returned in full to the browser on any subsequent page load.
3. Operator can press a test-connection button for each integration and see a clear pass or fail result with a human-readable hint on failure.
4. Operator can see the last-verified time and current health status for each integration from the settings page without leaving it.

**Plans:** 3/3 plans complete

Plans:
- [x] 12-01-PLAN.md — Schema migration + ensureSystemKey startup wiring + integration API routes + unit tests
- [x] 12-02-PLAN.md — IntegrationsPage UI + Toast component + router wiring + web unit tests
- [ ] 12-03-PLAN.md — Playwright E2E tests + human verification checkpoint

**UI hint**: yes

### Phase 13: Intune Device Sync

**Goal:** Replace mock device data with a live, paginated pull from Microsoft Graph so the asset health dashboard reflects the real Intune fleet.

**Depends on:** Phase 12

**Requirements:** SYNC-01, SYNC-02, SYNC-03

**Success criteria** (what must be TRUE):
1. Operator can view a device inventory populated with real Intune data including device name, compliance state, OS and version, last check-in, and encryption status.
2. Operator can see per-device compliance policy assignments and whether each policy is passing or failing on that device.
3. Operator can see when the last sync completed, how many devices were retrieved, and whether the data is stale or the last sync failed.
4. Operator can trigger a manual sync from the UI and see the inventory refresh when it completes.

**Plans:** 3/3 plans complete

Plans:
- [x] 13-01-PLAN.md — Prisma schema migration + Graph API helpers + real Intune provider + connector registry factory + sync trigger route
- [x] 13-02-PLAN.md — Compliance API endpoint + UI changes (freshness bar, compliance badge, compliance table, sync button)
- [x] 13-03-PLAN.md — Playwright E2E tests + human verification checkpoint

**UI hint**: yes

### Phase 14: Document Ingest Pipeline

**Goal:** Automatically parse, classify, and organize documents from a source folder using OpenAI so the documentation library stays current without manual curation.

**Depends on:** Phase 12

**Requirements:** INGEST-01, INGEST-02, INGEST-03, INGEST-04, INGEST-05

**Success criteria** (what must be TRUE):
1. Operator can configure a source folder path and an output folder path from the settings page and save them without the paths being the same location.
2. When a supported file (md, txt, docx, pdf) is added to the source folder, it is automatically classified, summarized, tagged, and copied to the output folder in an organized hierarchy without operator action.
3. Operator can trigger ingest manually from the UI and see per-file status (pending, processing, done, or failed) update during the run.
4. A file that fails to parse or classify is recorded with a failed status and does not block other files in the same run.
5. Files already processed are not re-ingested on restart or re-trigger unless they have changed.

**Plans:** 4 plans

Plans:
- [x] 14-01-PLAN.md — Prisma schema (AppSetting, IngestRun, IngestFile) + settings API routes + document parsers
- [ ] 14-02-PLAN.md — Ingest service (classify/embed/copy) + chunker + queue + watcher + ingest API routes
- [ ] 14-03-PLAN.md — IngestSection UI on IntegrationsPage (folder inputs, trigger, status table with polling)
- [ ] 14-04-PLAN.md — Playwright E2E tests + human verification checkpoint

**UI hint**: yes

### Phase 15: RAG Search

**Goal:** Make the documentation library answerable in natural language so the operator can ask questions and get synthesized responses with traceable sources rather than scanning a list of files.

**Depends on:** Phase 14

**Requirements:** RAG-01, RAG-02

**Success criteria** (what must be TRUE):
1. Operator can type a natural-language question into the search interface and receive a synthesized answer that cites the specific documents it drew from.
2. Each citation in the answer links to or identifies the source document so the operator can verify the answer without trusting it blindly.
3. When no OpenAI key is configured or vector similarity falls below a useful threshold, the search interface falls back to keyword results rather than returning no answer.

**Plans:** TBD
**UI hint**: yes

## Delivery Notes

- Each phase should leave behind something directly useful to the solo IT admin, not only internal plumbing.
- Asset Health comes first among the feature modules because it proves the data model and delivers immediate daily value.
- Network Visibility Lite replaces the former standalone identity module because the existing EDR already covers the broader identity alerting surface while network context remains a real operator gap.
- Identity hygiene can still land later as a lifecycle enhancement if a concrete gap remains after the EDR plus workflow combination is in use.
- Deferred modules such as ticket triage and maintenance scheduling should only enter planning after the five-tool v1 is stable.
- Phase 7 begins v1.1 Operator Experience milestone, refreshing UX without expanding the five-tool scope.
- Phases 8 and 9 are reserved stubs for deferred v1.1 work; they execute under v1.3.
- Phase 10 carries no named user-facing requirement but is a mandatory infrastructure prerequisite — every v1.2 runtime feature depends on the schema and encryption it delivers.
- Phases 13 and 14 can be developed in parallel once Phase 12 delivers a working credential store.

---
*Last updated: 2026-04-01 — Phase 14 plans defined*

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations and Secure Data Flow | 3/3 | Complete | 2026-03-28 |
| 2. Asset Health Dashboard | 4/4 | Complete | 2026-03-28 |
| 3. Lifecycle Automation | 5/5 | Complete | 2026-03-26 |
| 4. Network Visibility Lite | 4/4 | Complete | 2026-03-27 |
| 5. Backup Confidence Dashboard | 5/5 | Complete | 2026-03-27 |
| 6. Documentation Assistant | 5/5 | Complete | 2026-03-28 |
| 7. Operator Shell Refresh | 5/5 | Complete | 2026-03-29 |
| 8. Queue and Detail Refresh | 0/TBD | Deferred -> v1.3 | - |
| 9. Interface Consistency and Hardening | 0/TBD | Deferred -> v1.3 | - |
| 10. Schema and Credential Foundation | 2/2 | Complete   | 2026-03-30 |
| 11. First-Run Bootstrap | 2/2 | Complete    | 2026-03-31 |
| 12. Integrations Settings UI | 2/3 | Complete    | 2026-03-31 |
| 13. Intune Device Sync | 3/3 | Complete    | 2026-03-31 |
| 14. Document Ingest Pipeline | 0/4 | Planning complete | - |
| 15. RAG Search | 0/TBD | Not started | - |
