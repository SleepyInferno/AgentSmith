# Roadmap: Solo IT Ops Suite

**Created:** 2026-03-26
**Phases:** 6
**v1 Requirements Covered:** 20 of 20

## Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundations and Secure Data Flow | Establish auth, connector sync visibility, audit logging, and the shared data backbone | 3 | 4 |
| 2 | Asset Health Dashboard | Deliver the first high-signal operational dashboard for device risk | 4 | 4 |
| 3 | Lifecycle Automation | Ship guided onboarding and offboarding workflows with evidence capture | 4 | 4 |
| 4 | Network Visibility Lite | Deliver a lightweight network inventory, mapper, and triage view for WAN and LAN health | 3 | 4 |
| 5 | Backup Confidence Dashboard | Show whether systems are protected and recoverable | 3 | 4 |
| 6 | Documentation Assistant | Make core IT documentation searchable, structured, and reviewable | 3 | 4 |

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

## Delivery Notes

- Each phase should leave behind something directly useful to the solo IT admin, not only internal plumbing.
- Asset Health comes first among the feature modules because it proves the data model and delivers immediate daily value.
- Network Visibility Lite replaces the former standalone identity module because the existing EDR already covers the broader identity alerting surface while network context remains a real operator gap.
- Identity hygiene can still land later as a lifecycle enhancement if a concrete gap remains after the EDR plus workflow combination is in use.
- Deferred modules such as ticket triage and maintenance scheduling should only enter planning after the five-tool v1 is stable.
- Phase 7 begins v1.1 Operator Experience milestone, refreshing UX without expanding the five-tool scope.

---
*Last updated: 2026-03-29 after completing Phase 7 Plan 01*
