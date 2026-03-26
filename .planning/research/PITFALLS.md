# Pitfalls Research

## 1. Trying to Fully Automate High-Risk Admin Actions Too Early

- **Warning signs**: Broad write permissions, weak approval steps, no review screen, and missing audit evidence
- **Prevention**: Start with assistive automation and human-confirmed execution for joiner/leaver and privilege actions
- **Best phase to address**: Phase 1 and Phase 3

## 2. Mixing Raw Connector Data Directly into UI Logic

- **Warning signs**: UI code knows provider field names, every screen transforms data differently, and small API changes break multiple pages
- **Prevention**: Introduce canonical internal entities and centralize mapping in connector/domain layers
- **Best phase to address**: Phase 1

## 3. Building Fancy Dashboards Without Actionable Prioritization

- **Warning signs**: Many charts, weak queues, no "what should I do next?" answer
- **Prevention**: Favor prioritized lists, health scoring explanations, and direct follow-up actions over vanity metrics
- **Best phase to address**: Phase 2

## 4. Ignoring Partial or Stale Data States

- **Warning signs**: Dashboards imply certainty when syncs have failed, missing systems look healthy, or data freshness is invisible
- **Prevention**: Track connector status, last sync time, and confidence indicators across all modules
- **Best phase to address**: Phase 1 and Phase 5

## 5. Treating Documentation as an Unstructured Dump

- **Warning signs**: Search returns noise, documents age without owners, and notes are not tied to systems or workflows
- **Prevention**: Use typed document metadata, ownership, review cadence, and entity linking from the start
- **Best phase to address**: Phase 6

## 6. Letting v1 Scope Expand Into Every IT Problem

- **Warning signs**: Ticketing, networking, procurement, and every maintenance task land in the initial build plan
- **Prevention**: Keep the first release centered on the five highest-value workflows and defer adjacent ideas explicitly
- **Best phase to address**: Throughout roadmap planning
