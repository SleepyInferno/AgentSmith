# Requirements: Solo IT Ops Suite

**Defined:** 2026-03-28
**Core Value:** One overextended IT generalist can see the highest-risk issues first and complete critical operational workflows consistently without relying on memory.
**Prior milestone archive:** `.planning/milestones/v1.0-REQUIREMENTS.md`
**v1.1 archive:** `.planning/milestones/v1.1-REQUIREMENTS.md`

## v1.1 Requirements

### Operator Shell

- [x] **SHELL-01**: Operator can move between primary tools and utility routes from persistent navigation with clear active-state feedback.
- [x] **SHELL-02**: Operator can understand where they are and what to do next from shared shell chrome, route context, and review-side infrastructure.
- [x] **SHELL-03**: Operator can use the shell comfortably on common laptop and tablet widths without clipped, overlapping, or hidden navigation.

### Workflow Surfaces *(deferred to v1.3)*

- [ ] **FLOW-01**: Operator can move from each overview queue to its matching inventory or detail screen through clear, consistent calls to action.
- [ ] **FLOW-02**: Operator can move back from every detail screen to the right queue or inventory context without losing relevant filter state.
- [ ] **FLOW-03**: Operator sees consistent layout patterns for queue cards, inventory tables, detail summaries, and review panels across the five tools.
- [ ] **FLOW-04**: Operator can distinguish loading, empty, stale, error, read-only, and action-required states without relearning page-specific conventions.

### Experience Hardening *(deferred to v1.3)*

- [ ] **QUAL-01**: Operator can navigate primary routes, filters, dialogs, and review forms with keyboard access and visible focus treatment.
- [ ] **QUAL-02**: Operator can rely on accessible labels, headings, and readable contrast across shared navigation and workflow surfaces.
- [ ] **QUAL-03**: Operator gets responsive layouts that preserve hierarchy, spacing, and tap targets at narrower widths.

### Verification *(deferred to v1.3)*

- [ ] **TEST-01**: Team can run automated UI coverage for shell navigation, route links, back-links, and key workflows from the standard root test command.
- [ ] **TEST-02**: Team can verify shared UI infrastructure and major workflow components with targeted automated tests before human visual review.

## v1.2 Requirements

### Bootstrap

- [x] **BOOT-01**: Operator can create a local admin account (username + password) on first run when no admin exists.
- [x] **BOOT-02**: App detects bootstrap state server-side and routes unauthenticated users to setup before any protected route is accessible.
- [x] **BOOT-03**: Bootstrap endpoint is permanently locked in the database after the first admin is created.

### Integrations Settings

- [x] **CRED-01**: Operator can configure Intune credentials (tenant ID, client ID, client secret) from the integrations settings page.
- [x] **CRED-02**: Operator can configure an OpenAI API key from the integrations settings page.
- [x] **CRED-03**: Credentials are stored encrypted server-side and never returned to the browser after initial save.
- [x] **CRED-04**: Operator can verify connection health for each integration and see last-sync status from the settings page.

### Intune Sync

- [ ] **SYNC-01**: Operator can see live Intune device inventory with device name, compliance state, OS/version, last check-in, and encryption status.
- [ ] **SYNC-02**: Operator can see per-device compliance policy assignment and pass/fail state.
- [ ] **SYNC-03**: Operator can see when Intune data was last synced and whether it is stale or failed.

### Document Ingest

- [x] **INGEST-01**: Operator can configure a source folder and output folder for document ingest from the settings page.
- [x] **INGEST-02**: Ingest pipeline parses md, txt, docx, and pdf files from the source folder.
- [x] **INGEST-03**: Ingest uses OpenAI to classify, summarize, and tag each document and copies organized files to the output folder in a structured hierarchy.
- [x] **INGEST-04**: Ingest runs automatically when new files are added to the source folder (watch folder).
- [x] **INGEST-05**: Operator can trigger ingest manually from the UI.

### RAG Search

- [x] **RAG-01**: Operator can search documents using natural language and receive a synthesized answer with cited sources.
- [x] **RAG-02**: Existing keyword search remains available as fallback when no OpenAI key is configured.

## v2 Requirements

### Operations Expansion

- **OPS-02**: Operator can manage recurring maintenance schedules and renewal reminders
- **OPS-03**: Operator can intake and triage internal support requests
- **OPS-04**: Operator can track license utilization across Microsoft 365 and related tools
- **OPS-05**: Operator can map shared resources such as printers and departmental shares

## Out of Scope

| Feature | Reason |
|---------|--------|
| Net-new operational modules in v1.1 | Preserve the five-tool surface while the UI foundation is being refreshed |
| New high-trust write actions | The overhaul should strengthen clarity and review UX before action expansion |
| Full design-system extraction or token platform work | Keep this milestone focused on the production app experience, not a parallel platform project |
| Mobile-native app work | The operator web experience remains the priority |
| Intune app inventory per device (detectedApps) | High data volume, lower urgency than device compliance — defer to v1.3 |
| Multi-user accounts or role management | Solo IT admin tool — single admin account is sufficient for v1.2 |
| Real-time sync / webhooks | Polling-based sync is sufficient for v1.2; webhook infra adds significant complexity |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 07 | Complete |
| SHELL-02 | Phase 07 | Complete |
| SHELL-03 | Phase 07 | Complete |
| FLOW-01 | Phase 08 | Deferred → v1.3 |
| FLOW-02 | Phase 08 | Deferred → v1.3 |
| FLOW-03 | Phase 08 | Deferred → v1.3 |
| FLOW-04 | Phase 08 | Deferred → v1.3 |
| QUAL-01 | Phase 09 | Deferred → v1.3 |
| QUAL-02 | Phase 09 | Deferred → v1.3 |
| QUAL-03 | Phase 09 | Deferred → v1.3 |
| TEST-01 | Phase 09 | Deferred → v1.3 |
| TEST-02 | Phase 09 | Deferred → v1.3 |
| BOOT-01 | Phase 11 | Complete |
| BOOT-02 | Phase 11 | Complete |
| BOOT-03 | Phase 11 | Complete |
| CRED-01 | Phase 12 | Complete |
| CRED-02 | Phase 12 | Complete |
| CRED-03 | Phase 12 | Complete |
| CRED-04 | Phase 12 | Complete |
| SYNC-01 | Phase 13 | Pending |
| SYNC-02 | Phase 13 | Pending |
| SYNC-03 | Phase 13 | Pending |
| INGEST-01 | Phase 14 | Complete |
| INGEST-02 | Phase 14 | Complete |
| INGEST-03 | Phase 14 | Complete |
| INGEST-04 | Phase 14 | Complete |
| INGEST-05 | Phase 14 | Complete |
| RAG-01 | Phase 15 | Complete |
| RAG-02 | Phase 15 | Complete |

**Coverage:**
- v1.1 requirements: 12 total (3 complete, 9 deferred → v1.3)
- v1.2 requirements: 17 total (17 mapped across Phases 11-15; Phase 10 is infrastructure with no named user requirement)

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-30 — v1.2 traceability finalized (Phases 10-15)*
