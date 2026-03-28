# Requirements: Solo IT Ops Suite

**Defined:** 2026-03-26
**Core Value:** One overextended IT generalist can see the highest-risk issues first and complete critical operational workflows consistently without relying on memory.

## v1 Requirements

### Platform

- [x] **PLAT-01**: Operator can sign in with Entra ID and access the app without managing separate local credentials
- [x] **PLAT-02**: Operator actions and workflow runs are recorded in an audit log with timestamp, actor, and result
- [x] **PLAT-03**: Operator can see connector health, last sync time, and data freshness for each integrated source

### Asset Health

- [x] **ASST-01**: Operator can view a unified device inventory with owner, department, site, OS, encryption, AV, patch status, and last check-in
- [x] **ASST-02**: Operator can filter and sort devices by risk indicators such as stale check-in, low disk, missing encryption, missing AV, age, and unsupported OS
- [x] **ASST-03**: Operator can open a device detail view showing the health signals contributing to its risk status
- [x] **ASST-04**: Operator can see a prioritized "needs attention" queue for the riskiest devices

### Lifecycle Automation

- [x] **LIFE-01**: Operator can start onboarding from a reusable template that includes identity, licensing, group, device, and checklist steps
- [x] **LIFE-02**: Operator can run offboarding from a guided workflow that covers access removal, device recovery, mailbox or file handoff, and follow-up tasks
- [x] **LIFE-03**: Operator can mark workflow steps as automated, manual, skipped, or blocked and capture notes or evidence for each
- [x] **LIFE-04**: Operator can review a final workflow summary showing what completed, what failed, and what still needs manual work

### Network Visibility Lite

- [x] **NET-01**: Operator can view a lightweight network inventory across sites, WAN links, firewalls, switches, APs, and key DHCP or VPN services with status and last-seen freshness
- [x] **NET-02**: Operator can open a network mapper that shows sites, WAN and LAN segments, core network devices, and whether relationships are confirmed or inferred
- [x] **NET-03**: Operator can review network findings for offline infrastructure, stale telemetry, topology gaps, or unclear ownership and understand the affected site or segment plus the suggested next step

### Backup Confidence

- [x] **BACK-01**: Operator can view a protected-system inventory with backup source, last successful backup, and last restore-test date
- [x] **BACK-02**: Operator can see systems that are missing backup coverage or have stale backup evidence
- [x] **BACK-03**: Operator can review backup confidence status using both backup freshness and restore-test recency

### Documentation Assistant

- [x] **DOCS-01**: Operator can search operational documentation across SOPs, vendors, contacts, infrastructure notes, and recovery procedures
- [x] **DOCS-02**: Operator can tag documents by system, site, owner, and category so search results stay relevant
- [x] **DOCS-03**: Operator can view document history and review dates so stale documentation is visible

## v2 Requirements

### Operations Expansion

- **OPS-02**: Operator can manage recurring maintenance schedules and renewal reminders
- **OPS-03**: Operator can intake and triage internal support requests
- **OPS-04**: Operator can track license utilization across Microsoft 365 and related tools
- **OPS-05**: Operator can map shared resources such as printers and departmental shares

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full remote monitoring and management suite | Too broad for the first release |
| End-user self-service portal | Lower value than operator efficiency in v1 |
| Procurement and budget workflows | Important, but outside the five highest-value tools |
| Full network automation and configuration management | Higher risk and lower immediate leverage than the chosen v1 scope |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |
| ASST-01 | Phase 2 | Complete |
| ASST-02 | Phase 2 | Complete |
| ASST-03 | Phase 2 | Complete |
| ASST-04 | Phase 2 | Complete |
| LIFE-01 | Phase 3 | Complete |
| LIFE-02 | Phase 3 | Complete |
| LIFE-03 | Phase 3 | Complete |
| LIFE-04 | Phase 3 | Complete |
| NET-01 | Phase 4 | Complete |
| NET-02 | Phase 4 | Complete |
| NET-03 | Phase 4 | Complete |
| BACK-01 | Phase 5 | Complete |
| BACK-02 | Phase 5 | Complete |
| BACK-03 | Phase 5 | Complete |
| DOCS-01 | Phase 6 | Complete |
| DOCS-02 | Phase 6 | Complete |
| DOCS-03 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 - complete

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-28 after Phase 1 completion*
