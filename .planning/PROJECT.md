# Solo IT Ops Suite

## What This Is

Solo IT Ops Suite is an internal operations console for a one-person or very small IT team that has to keep devices, accounts, backups, and documentation under control without dropping important tasks. It combines Microsoft tenant visibility with workflow automation so the admin can spot risk fast, act from one place, and leave behind usable operational history instead of scattered notes.

## Core Value

One overextended IT generalist can see the highest-risk issues first and complete critical operational workflows consistently without relying on memory.

## Requirements

### Validated

- [x] Asset health dashboard gives a trustworthy daily picture of device risk and maintenance posture. Validated in Phase 2: Asset Health Dashboard.
- [x] Onboarding and offboarding workflows reduce skipped steps and produce an audit trail. Validated in Phase 3: Lifecycle Automation.
- [x] Network visibility shows sites, WAN links, LAN segments, and core network infrastructure health without requiring a full NMS. Validated in Phase 4: Network Visibility Lite.
- [x] Backup confidence shows whether protected systems are actually recoverable without hiding duplicate, excluded, outage, or operator-attested trust states. Validated in Phase 5: Backup Confidence Dashboard.
- [x] Documentation assistant makes SOPs, contacts, infrastructure notes, and recovery procedures searchable, reviewable, and explicitly maintainable through audited metadata review. Validated in Phase 6: Documentation Assistant.

### Active

- [ ] Phase 1 foundations still need the protected shell, secure tenant data flow, connector health, and audit-log groundwork closed out explicitly.

### Out of Scope

- Full PSA/help desk replacement - not core to reducing operational risk in the first release.
- Full RMM replacement - too broad for v1 and overlaps heavily with established tools.
- Advanced network automation - useful later, but secondary to identity, endpoint, backup, and documentation hygiene.
- Billing, procurement, and contract management - operationally related but not part of the first high-value workflow set.

## Context

- The starting point is an existing app that already integrates with Intune for foreign IP monitoring.
- The target user is effectively a solo IT department covering endpoint support, account lifecycle work, maintenance, networking, and general firefighting.
- The strongest opportunity is reducing repeated manual checking and turning important but easy-to-forget tasks into guided workflows.
- The environment is likely Microsoft-centric, with Intune, Entra ID, Microsoft 365, and related security/admin data as primary sources.
- The product should support both read-heavy oversight workflows and a smaller set of high-confidence administrative actions with strong auditability.
- Existing EDR coverage reduces the value of a separate identity-risk dashboard, so identity hygiene should live inside the lifecycle workflow surface when it needs tracked follow-through.
- A lightweight network visibility and mapping surface fills the vacated v1 module slot because it addresses an operational gap that existing endpoint and security tooling does not cover cleanly.

## Current State

- Phase 2 is complete and verified. The app now includes a queue-first asset health dashboard, explainable device detail, and a filterable, sortable device inventory backed by one server-owned risk model.
- Phase 3 is complete and verified. The app now includes a queue-first lifecycle workflow that launches onboarding and offboarding runs, guides grouped step execution with evidence capture, and closes work out with unresolved follow-up visibility.
- Phase 4 is complete and verified. The app now includes a queue-first network overview, filterable inventory, lightweight topology map, and explanation-first detail flow for network triage.
- Phase 5 is complete and verified. The app now includes a backup confidence workflow that keeps protection coverage, restore proof, and trust-state explanations read-only and explicit.
- Phase 6 is complete and verified. The app now includes searchable operational documentation, explanation-first detail, visible review history, and one audited metadata-review flow.
- All five v1 tool modules are now implemented, but Phase 1 still has unfinished protected-shell and connector work that needs explicit reconciliation before the release can be treated as fully closed.

## Constraints

- **Security**: Admin data and actions must be tightly permissioned and auditable - the app will touch identity, device, and potentially backup metadata.
- **Integration**: Microsoft Graph, Intune, and Entra ID need to be first-class connectors - the product is most valuable if it fits the current tenant reality.
- **Usability**: A solo admin needs immediate signal, not a dense enterprise dashboard - every screen should help prioritize next action.
- **Delivery**: The first release should focus on the five highest-value tools before expanding into broader IT operations features.
- **Extensibility**: The architecture should support adding future modules such as license tracking, maintenance scheduling, and deeper network automation without a rewrite.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build a modular internal web app instead of separate single-purpose scripts | Shared auth, shared data model, and a common dashboard make each tool more useful together | - Pending |
| Treat Microsoft tenant data as the primary system of record for v1 | Existing investment and available telemetry make it the fastest path to value | - Pending |
| Keep future operations ideas in deferred scope instead of mixing them into v1 | Helps preserve focus and ship the highest-value workflows sooner | - Pending |
| Favor guided workflows and risk summaries over fully automated remediation | A solo IT admin still needs control over sensitive actions | - Pending |
| Let the EDR own broad identity alerting while AgentSmith owns lifecycle-linked identity follow-through | Avoids duplicating an existing detection surface and keeps this app focused on guided remediation | - Pending |
| Replace the former security module with Network Visibility Lite | Gives the operator site and infrastructure context that is not already covered by the existing EDR stack | - Pending |

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
*Last updated: 2026-03-28 after Phase 6 completion*
