# Phase 3: lifecycle-automation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 03-lifecycle-automation
**Areas discussed:** Workflow structure, Automation boundary, Step status and evidence, Run completion and follow-up

---

## Workflow structure

| Option | Description | Selected |
|--------|-------------|----------|
| One linear checklist per workflow | Simplest run view, but long onboarding and offboarding flows become harder to scan. | |
| Grouped phases inside each workflow | Organize work into groups like identity, licensing, access, device, handoff, and follow-up. | yes |
| Domain cards with independent task bundles | More flexible, but risks feeling like a dashboard instead of a guided workflow. | |

**User's choice:** Grouped phases inside each workflow
**Notes:** The workflow should stay guided, but the operator needs better scanability than a single long checklist would provide.

---

## Automation boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Tracking-only in Phase 3 | Every step is completed manually and only recorded in the app. | yes |
| Guided workflow with a few explicit action buttons | Keeps review-first UX while allowing a small number of operator-triggered actions. | |
| Broad automation across many steps | Expands scope and increases execution risk in this phase. | |

**User's choice:** Tracking-only in Phase 3
**Notes:** Phase 3 should focus on guided execution records and auditability rather than live admin actions.

---

## Step status and evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Simple statuses and optional notes | Low-friction, but weak audit quality. | |
| Required reasoning for skipped or blocked plus structured evidence | Keep statuses `automated`, `manual`, `skipped`, `blocked`; require reasons for exceptions and support note text plus reference fields. | yes |
| Heavy evidence collection on every step | Strong audit trail, but too much friction for the solo operator. | |

**User's choice:** Required reasoning for skipped or blocked plus structured evidence
**Notes:** The workflow needs real exception handling and useful evidence capture without turning every step into paperwork.

---

## Run completion and follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only audit summary | Shows status outcomes, but weak next-step guidance. | |
| Audit summary plus unresolved follow-up section | End with a readable record and a distinct list of manual work that still remains. | yes |
| Full post-run dashboard with analytics | Better for later maturity, but out of scope for this phase. | |

**User's choice:** Audit summary plus unresolved follow-up section
**Notes:** The operator should be able to close a run and immediately understand what still needs attention.

---

## the agent's Discretion

- Exact workflow group names
- Exact evidence reference field set
- Specific data-model split between templates, runs, step instances, and summaries

## Deferred Ideas

- Real admin action execution from workflow steps
- Broader lifecycle analytics beyond per-run summaries and unresolved follow-up
