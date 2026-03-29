# Requirements: Solo IT Ops Suite

**Defined:** 2026-03-28
**Core Value:** One overextended IT generalist can see the highest-risk issues first and complete critical operational workflows consistently without relying on memory.
**Prior milestone archive:** `.planning/milestones/v1.0-REQUIREMENTS.md`

## v1.1 Requirements

### Operator Shell

- [x] **SHELL-01**: Operator can move between primary tools and utility routes from persistent navigation with clear active-state feedback.
- [x] **SHELL-02**: Operator can understand where they are and what to do next from shared shell chrome, route context, and review-side infrastructure.
- [ ] **SHELL-03**: Operator can use the shell comfortably on common laptop and tablet widths without clipped, overlapping, or hidden navigation.

### Workflow Surfaces

- [ ] **FLOW-01**: Operator can move from each overview queue to its matching inventory or detail screen through clear, consistent calls to action.
- [ ] **FLOW-02**: Operator can move back from every detail screen to the right queue or inventory context without losing relevant filter state.
- [ ] **FLOW-03**: Operator sees consistent layout patterns for queue cards, inventory tables, detail summaries, and review panels across the five tools.
- [ ] **FLOW-04**: Operator can distinguish loading, empty, stale, error, read-only, and action-required states without relearning page-specific conventions.

### Experience Hardening

- [ ] **QUAL-01**: Operator can navigate primary routes, filters, dialogs, and review forms with keyboard access and visible focus treatment.
- [ ] **QUAL-02**: Operator can rely on accessible labels, headings, and readable contrast across shared navigation and workflow surfaces.
- [ ] **QUAL-03**: Operator gets responsive layouts that preserve hierarchy, spacing, and tap targets at narrower widths.

### Verification

- [ ] **TEST-01**: Team can run automated UI coverage for shell navigation, route links, back-links, and key workflows from the standard root test command.
- [ ] **TEST-02**: Team can verify shared UI infrastructure and major workflow components with targeted automated tests before human visual review.

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

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 07 | Complete |
| SHELL-02 | Phase 07 | Complete |
| SHELL-03 | Phase 07 | Pending |
| FLOW-01 | Phase 08 | Pending |
| FLOW-02 | Phase 08 | Pending |
| FLOW-03 | Phase 08 | Pending |
| FLOW-04 | Phase 08 | Pending |
| QUAL-01 | Phase 09 | Pending |
| QUAL-02 | Phase 09 | Pending |
| QUAL-03 | Phase 09 | Pending |
| TEST-01 | Phase 09 | Pending |
| TEST-02 | Phase 09 | Pending |

**Coverage:**
- v1.1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 - complete

---
*Requirements defined: 2026-03-28*
*Last updated: 2026-03-28 after starting milestone v1.1 Operator Experience*
