# Phase 12: Integrations Settings UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 12-integrations-settings-ui
**Areas discussed:** Credential masking, Test-connection feedback, Health badge presence, Settings nav placement

---

## Credential Masking

| Option | Description | Selected |
|--------|-------------|----------|
| Always empty (secret fields) | Fields load blank; "Configured" badge beside label shows secret exists; blank submission = keep existing | ✓ |
| Placeholder dots | Show ••••••••; user clicks to clear and type | |
| Read-only + Update toggle | Shows "Configured" disabled state; click Update to unlock | |

**User's choice:** Always empty for secret fields
**Follow-up:** Non-secret fields (tenantId, clientId) — pre-filled with saved values
**Notes:** Blank submission on save means "keep existing value." Configured badge only appears when value is already saved.

---

## Test-Connection Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Inline beneath the button | Persistent result under the button; stays until next test or save | ✓ |
| Updates the health badge | Badge at section header updates in place | ✓ |
| Toast notification | Floating auto-dismissing notification | ✓ |

**User's choice:** All three ("Can we do all three?")
**Notes:** Three layers serve different needs — toast for instant signal, inline for readable error detail, badge for lasting state.

---

## Health Badge Presence

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Shows "Not yet verified" before first test; updates after | ✓ |
| Only after first test | Hidden until operator runs a test | |

**User's choice:** Always visible
**Notes:** Mirrors ConnectorStatusPage pattern. Health state persists in DB (lastTestedAt, lastTestResult fields).

---

## Settings Nav Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Utility nav alongside Connectors | 4th utility item; settings icon already defined in router.tsx | ✓ |
| New 'Config' section below utilities | Separate "Configuration" or "Admin" group | |

**User's choice:** Utility nav alongside Connectors
**Label follow-up:** "Integrations" (not "Settings") — specific to phase scope

---

## Claude's Discretion

- Toast implementation (custom vs. library) — keep minimal
- Exact form layout within sections
- Loading/pending states during save and test operations
- Wording of human-readable failure hints

## Deferred Ideas

- Document ingest folder path config (INGEST-01 — belongs in Phase 14)
- General app settings beyond integrations (post-v1.2)
