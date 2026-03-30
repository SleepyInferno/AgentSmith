# Solo IT Ops Suite

## What This Is

Solo IT Ops Suite is an internal operations console for a one-person or very small IT team that has to keep devices, accounts, backups, network visibility, and documentation under control without dropping important tasks. It combines Microsoft tenant visibility with guided operational workflows so the admin can spot risk fast, act from one place, and leave behind usable operational history instead of scattered notes.

## Core Value

One overextended IT generalist can see the highest-risk issues first and complete critical operational workflows consistently without relying on memory.

## Current Milestone: v1.2 Intune Integration

**Goal:** Connect the app to live Microsoft Intune data, add an AI-powered document ingest pipeline, and introduce a first-run bootstrap so the app can be set up without Entra ID as a hard dependency.

**Target features:**
- First-run bootstrap: one-time setup screen to create a local admin account; Entra ID becomes optional
- Integrations settings page: configure Intune credentials and OpenAI API key with server-side storage and connection health indicators
- Intune sync: live device inventory, compliance policies, app inventory, and sync status/freshness
- Document ingest pipeline: parse md/txt/docx/pdf from a source folder, use OpenAI to classify/summarize/tag, copy to an organized output folder
- Watch folder (auto) and UI button (on-demand) ingest triggers
- RAG search: embeddings at ingest time, GPT synthesis at query time; existing keyword search as fallback

## Requirements

### Validated

- [x] Protected shell, connector health visibility, and audit-log groundwork are closed out explicitly. Validated in Phase 1: Foundations and Secure Data Flow.
- [x] Asset health dashboard gives a trustworthy daily picture of device risk and maintenance posture. Validated in Phase 2: Asset Health Dashboard.
- [x] Onboarding and offboarding workflows reduce skipped steps and produce an audit trail. Validated in Phase 3: Lifecycle Automation.
- [x] Network visibility shows sites, WAN links, LAN segments, and core network infrastructure health without requiring a full NMS. Validated in Phase 4: Network Visibility Lite.
- [x] Backup confidence shows whether protected systems are actually recoverable without hiding duplicate, excluded, outage, or operator-attested trust states. Validated in Phase 5: Backup Confidence Dashboard.
- [x] Documentation assistant makes SOPs, contacts, infrastructure notes, and recovery procedures searchable, reviewable, and explicitly maintainable through audited metadata review. Validated in Phase 6: Documentation Assistant.

### Active

- [ ] First-run bootstrap allows the operator to create a local admin account on initial setup without requiring Entra ID pre-configuration.
- [ ] Integrations settings page lets the operator configure and verify Intune and OpenAI credentials from within the app.
- [ ] Live Intune sync surfaces real device inventory, compliance state, and app inventory with freshness indicators.
- [ ] Document ingest pipeline parses a source folder, uses OpenAI to classify and organize files, and writes to a structured output folder.
- [ ] RAG-powered search lets the operator find documents using natural language, with existing keyword search as fallback.

### Out of Scope

- Full PSA/help desk replacement - not core to reducing operational risk in this product.
- Full RMM replacement - too broad and overlaps heavily with established tools.
- Advanced network automation - useful later, but secondary to identity, endpoint, backup, and documentation hygiene.
- Billing, procurement, and contract management - operationally related but not part of the highest-value workflow set.
- Net-new operational modules during v1.1 - preserve the five-tool scope while the UI foundation is being refreshed.
- Broad write automation expansion - strengthen navigation, review UX, and operator confidence before adding more high-trust actions.

## Context

- The starting point is an existing app that already integrates with Intune for foreign IP monitoring.
- The target user is effectively a solo IT department covering endpoint support, account lifecycle work, maintenance, networking, and general firefighting.
- The strongest opportunity remains reducing repeated manual checking and turning important but easy-to-forget tasks into guided workflows.
- The environment is Microsoft-centric, with Intune, Entra ID, Microsoft 365, and related security/admin data as primary sources.
- The product should support both read-heavy oversight workflows and a smaller set of high-confidence administrative actions with strong auditability.
- Existing EDR coverage reduces the value of a separate identity-risk dashboard, so identity hygiene should live inside the lifecycle workflow surface when it needs tracked follow-through.
- A lightweight network visibility and mapping surface fills the vacated v1 module slot because it addresses an operational gap that existing endpoint and security tooling does not cover cleanly.
- v1.0 is complete and verified across foundations, asset health, lifecycle automation, network visibility, backup confidence, and documentation assistant.
- The next milestone is intentionally focused on operator experience, consistency, and trustworthiness of the current surface before new scope is added.
- Automated verification now covers API contracts, route-level React rendering, and mocked-browser workflow coverage for the main non-human flows.

## Current State

- v1.0 shipped the protected shell and the five-tool operational workflow set.
- v1.1 shipped sidebar-only navigation, full dark theme, banner topbar, and functional risk-card dashboard. Phases 08–09 deferred to v1.3.
- v1.2 Intune Integration is active. Requirements and roadmap are being defined.
- The standard root test command passes across API tests, web unit tests, and 16 Playwright browser tests.
- The full API typecheck still has pre-existing docs and lifecycle TypeScript debt outside this milestone.

## Constraints

- **Scope**: Preserve the five-tool surface - strengthen existing workflows before adding new modules.
- **Security**: Admin data and actions must be tightly permissioned and auditable because the app touches identity, device, backup, and documentation metadata.
- **Integration**: Microsoft Graph, Intune, and Entra ID remain first-class connectors because the product is most valuable when it fits the current tenant reality.
- **Usability**: A solo admin needs immediate signal, not dense dashboard sprawl - every screen should help prioritize next action.
- **Verification**: Non-human UI behavior should be covered by automated tests wherever practical so the overhaul stays regression-resistant.
- **Architecture**: Keep connector-specific logic isolated from internal domain models.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build a modular internal web app instead of separate single-purpose scripts | Shared auth, shared data model, and a common dashboard make each tool more useful together | - Pending |
| Treat Microsoft tenant data as the primary system of record for v1 | Existing investment and available telemetry make it the fastest path to value | - Pending |
| Keep future operations ideas in deferred scope instead of mixing them into v1 | Helps preserve focus and ship the highest-value workflows sooner | - Pending |
| Favor guided workflows and risk summaries over fully automated remediation | A solo IT admin still needs control over sensitive actions | - Pending |
| Let the EDR own broad identity alerting while AgentSmith owns lifecycle-linked identity follow-through | Avoids duplicating an existing detection surface and keeps this app focused on guided remediation | - Pending |
| Replace the former security module with Network Visibility Lite | Gives the operator site and infrastructure context that is not already covered by the existing EDR stack | - Pending |
| Treat the UI overhaul as a focused v1.1 milestone instead of expanding scope immediately | v1.0 already covers the core five-tool surface; operator speed and clarity now offer more leverage than new modules | - Pending |
| Continue phase numbering from 07 for v1.1 | Preserves planning history and keeps the v1.0 archive intact | - Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after starting milestone v1.2 Intune Integration*
