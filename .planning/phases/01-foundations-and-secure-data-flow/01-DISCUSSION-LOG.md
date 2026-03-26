# Phase 1: Foundations and Secure Data Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 1-Foundations and Secure Data Flow
**Areas discussed:** application foundation, authentication and auditability, connector slice and data freshness, canonical data model

---

## Application foundation

| Option | Description | Selected |
|--------|-------------|----------|
| React + TypeScript + Vite with Node API | Matches prior stack research, keeps the UI and API modular, and is a strong fit for dashboard-heavy internal tooling | yes |
| Full-stack framework | Could unify app and API concerns, but would override the existing stack guidance without a strong project-specific reason | |
| Script-first bootstrap | Faster for experiments, but weak for the authenticated shell and reusable platform goals of Phase 1 | |

**User's choice:** Auto-selected recommended default based on `.planning/research/STACK.md` and the Phase 1 goal.
**Notes:** A minimal authenticated shell is part of the phase so later modules attach to a real secured application surface.

---

## Authentication and auditability

| Option | Description | Selected |
|--------|-------------|----------|
| Entra ID SSO only with structured audit logging | Directly satisfies PLAT-01 and supports the Microsoft-centric operating model of the product | yes |
| Add local credentials alongside SSO | Increases credential surface area and conflicts with the app's Microsoft-first value proposition | |
| Defer audit logging until later phases | Would weaken trust and make sensitive actions harder to review from the start | |

**User's choice:** Auto-selected recommended default based on Phase 1 requirements and project constraints.
**Notes:** Sign-ins, sync runs, and operator-triggered actions are all treated as auditable events in the foundation.

---

## Connector slice and data freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Start with Entra ID and Intune connector foundations | Highest leverage for both platform visibility and the upcoming asset health module | yes |
| Start with backup providers first | Valuable later, but does not establish the shared entity backbone as effectively | |
| Live API reads only | Simpler at first, but poor for stale-data detection, reuse, and auditability | |

**User's choice:** Auto-selected recommended default based on roadmap ordering and architecture research.
**Notes:** Connector status should expose health, sync timing, outcomes, and freshness rather than acting as a hidden implementation detail.

---

## Canonical data model

| Option | Description | Selected |
|--------|-------------|----------|
| Normalize core entities early and keep source provenance | Matches project research and supports later modules without leaking provider schemas into the UI | yes |
| Keep raw provider payloads as the primary data model | Faster initially, but increases coupling and makes cross-module reasoning harder | |
| Delay canonical modeling until feature modules demand it | Would undercut the stated purpose of Phase 1 as the shared platform backbone | |

**User's choice:** Auto-selected recommended default based on `.planning/research/STACK.md` and `.planning/research/ARCHITECTURE.md`.
**Notes:** Core entities include users, devices, systems, groups, and documents, with supporting connector, sync-run, and audit-event records.

---

## the agent's Discretion

- Exact library choices within the chosen stack
- Visual design details for the shell, connector page, and audit timeline

## Deferred Ideas

None
