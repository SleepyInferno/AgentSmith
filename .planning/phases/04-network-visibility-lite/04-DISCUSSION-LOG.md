# Phase 04: network-visibility-lite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 04-network-visibility-lite
**Areas discussed:** module replacement, mapper scope

---

## Module replacement

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the former security slot | Continue using Phase 4 for a standalone security or identity module | |
| Replace it with Network Visibility Lite | Use the vacated slot for a lightweight network inventory, mapper, and triage module | x |

**User's choice:** Replace the former security module with Network Visibility Lite.
**Notes:** The user already has an EDR solution and preferred to use the vacated module slot for something that adds new operational value.

---

## Mapper scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full NMS or topology engine | Attempt deep network management, automation, and exact real-time topology | |
| Lightweight network mapper | Show LAN, WAN, site, and infrastructure relationships with practical confidence labels and read-only triage | x |

**User's choice:** Add a lightweight network mapper that gives a layout of LAN, WAN, and related infrastructure for a roughly 200-employee company.
**Notes:** The user explicitly liked the Network Visibility Lite direction and suggested a mapper-style view of LAN and WAN layout, which is practical if the product stays read-only and honest about inferred relationships.

---

## the agent's Discretion

- Exact data sources, mapping visual language, and queue grouping were intentionally left for planning.

## Deferred Ideas

- Full network management and automation
- Perfect real-time topology reconstruction
