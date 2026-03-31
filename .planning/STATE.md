---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: — Core Operational Workflow Foundation
status: executing
last_updated: "2026-03-31T00:33:43.511Z"
last_activity: 2026-03-30 — Phase 11 Plan 01 executed (bootstrap routes + local auth API)
progress:
  total_phases: 12
  completed_phases: 8
  total_plans: 35
  completed_plans: 34
---

# State: Solo IT Ops Suite

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-03-30)

**Core value:** One overextended IT generalist can see the highest-risk issues first and complete critical operational workflows consistently without relying on memory.
**Current focus:** Phase 11 — first-run-bootstrap

## Roadmap Status

- Milestone: v1.2 Intune Integration
- v1.2 phases: 10, 11, 12, 13, 14, 15 (6 phases)
- v1.2 requirements: 17
- Completed v1.2 phases: 1 of 6 (Phase 10 complete)
- Overall phases complete: 7 of 15 (Phases 1-7; Phases 8-9 deferred to v1.3)

## Current Position

Phase: Phase 11 — First-Run Bootstrap (in progress)
Plan: 1 of 2 complete
Status: Phase 11 Plan 01 complete — bootstrap API, local login, Entra guard, 12 new tests green.
Last activity: 2026-03-30 — Phase 11 Plan 01 executed (bootstrap routes + local auth API)

## Immediate Next Steps

1. Phase 11 (First-Run Bootstrap) — plan and execute next (BOOT-01, BOOT-02, BOOT-03).
2. Phase 12 (Integrations Settings UI) can also be planned in parallel with Phase 11.
3. Phases 13 (Intune Sync) and 14 (Document Ingest Pipeline) unblock once Phase 12 is complete.
4. Before Phase 11: apply the three migration SQL files to the live PostgreSQL instance (pgvector extension required for migration 3).

## v1.2 Phase Summary

| Phase | Name | Requires | Key Deliverables |
|-------|------|----------|-----------------|
| 10 | Schema and Credential Foundation | Phase 7 | User schema (passwordHash, role), IntegrationCredential table (AES-256-GCM), pgvector extension + DocumentEmbedding table + HNSW index, Entra env vars optional |
| 11 | First-Run Bootstrap | Phase 10 | Setup screen, local admin creation endpoint (one-time, DB-locked), LocalAuthProvider, session ID rotation |
| 12 | Integrations Settings UI | Phase 10 | IntegrationsPage (masked credential display, per-section save, test-connection button, health badge) |
| 13 | Intune Device Sync | Phase 12 | Live Graph API pull with pagination, DeviceCompliancePolicy + DeviceComplianceAssignment models, sync freshness indicator, manual trigger |
| 14 | Document Ingest Pipeline | Phase 12 | runDocumentIngest (parse/classify/embed/copy), chokidar watch-folder, manual trigger, per-file status, ingest folder settings |
| 15 | RAG Search | Phase 14 | docs.rag.ts, POST /api/docs/rag-search, RAG mode UI with citation panel, keyword fallback |

## Recent Decisions

- [Phase 11-01] bootstrap.ts keeps local login route separate from auth.ts to isolate Entra-coupled code from local auth
- [Phase 11-01] DUMMY_HASH used in local login for timing-safe comparison when username not found — prevents user enumeration
- [Phase 11-01] createAuthService guards MicrosoftEntraAuthProvider construction — server starts without Entra env vars via entraConfigured boolean check
- [Phase 11-01] loginLocal always generates fresh randomUUID sessionId — enforces session regeneration per CLAUDE.md security invariant
- [Phase 10-02] HKDF-SHA256 used to derive wrapping key from SESSION_SECRET (fixed salt, domain-separated info) — avoids using raw secret as AES key directly.
- [Phase 10-02] iv:authTag:ciphertext hex string format for SystemKey.wrappedKey — self-contained, no extra DB columns needed for wrapped key storage.
- [Phase 10-02] ensureSystemKey not wired into server.ts in Phase 10 — Phase 12 will call it at startup when credential storage becomes active.
- [Phase 10-01] Manual SQL migration files used (no live DB available; consistent with existing project migration pattern in prisma/migrations/).
- [Phase 10-01] Env test placed in apps/api/src/lib/ rather than packages/shared/src/ because shared package has no test runner configured.
- [Phase 10-01] Non-null assertions used in auth.ts for optional Entra vars; Phase 11 will add proper conditional MicrosoftEntraAuthProvider guard.
- [Phase 07-05] Responsive CSS audited and confirmed correct (no calc(100vh - 71px), no dead media rules); shell-navigation.spec.ts expanded with PageTitle assertions, sidebar-on-home-route guard, and five risk card link checks using aria-label colon-suffix disambiguation.
- [Phase 07-05] Task 3 human verification approved via automated coverage — CSS audit + 16 passing Playwright tests accepted in lieu of live browser visual check.
- [Phase 07-04] Replaced mockup dashboard image and hotspot overlay with functional risk card dashboard; five static risk cards with ok/warn/critical variants; live data integration deferred (D-07, D-08, D-09).
- [Phase 07-02] Navigation consolidated to sidebar only — top bar holds brand, identity, and sign-out only (D-01/D-02/D-03/D-04).
- [Phase 07-02] agent-topbar CSS class system introduced; --topbar-height: 60px set as authoritative CSS variable in :root.
- [Phase 07-01] Home route now renders inside AppShell with sidebar visible — eliminates the mockup-app-shell divergence (D-06).
- [Phase 07-01] BrowserToolbar removed — mock Safari chrome adds no operator value (D-05).
- [Phase 07-01] ReviewPanel removed — static/mock content will be reintroduced later with live data (D-10).
- [Phase 07-01] agent-console grid reduced from 3-column to 2-column (sidebar + main stage).
- [Phase 07-01] --topbar-height CSS custom property used for min-height forward-compatibility with Plan 07-02's topbar.
- [Phase 01] Wrapped the current shipped shell in a protected layout instead of reverting to the earlier placeholder screen so the auth backfill preserved later operator workflows.
- [Phase 01] Centralized browser API requests through a shared credentials-included client and `useSession` so authentication state stays API-backed.
- [Phase 01] Added direct auth route tests because full API builds are currently blocked by unrelated docs and lifecycle TypeScript errors.
- [Phase 01] Used protected seeded fallback data for connector and audit views so the observability surfaces stay understandable before live sync volume exists.
- [Phase 01] Closed connector and audit visibility with route-level session gates even though those surfaces were backfilled after later modules already existed.

## Recent Execution

- Phase 11 Plan 01 executed on 2026-03-30; summary recorded in `.planning/phases/11-first-run-bootstrap/11-01-SUMMARY.md`.
- Phase 10 Plan 02 executed on 2026-03-30; summary recorded in `.planning/phases/10-schema-and-credential-foundation/10-02-SUMMARY.md`.
- Phase 07 Plan 05 executed on 2026-03-29; summary recorded in `.planning/phases/07-operator-shell-refresh/07-05-SUMMARY.md`.
- Phase 07 Plan 04 executed on 2026-03-29; summary recorded in `.planning/phases/07-operator-shell-refresh/07-04-SUMMARY.md`.
- Phase 07 Plan 02 executed on 2026-03-29; summary recorded in `.planning/phases/07-operator-shell-refresh/07-02-SUMMARY.md`.
- Phase 07 Plan 01 executed on 2026-03-29; summary recorded in `.planning/phases/07-operator-shell-refresh/07-01-SUMMARY.md`.
- Phase 01 Plan 02 was executed on 2026-03-28; summary recorded in `.planning/phases/01-foundations-and-secure-data-flow/01-02-SUMMARY.md`.
- Phase 01 Plan 03 was executed on 2026-03-28; summary recorded in `.planning/phases/01-foundations-and-secure-data-flow/01-03-SUMMARY.md`.
- Phase 01 was verified on 2026-03-28; report recorded in `.planning/phases/01-foundations-and-secure-data-flow/01-VERIFICATION.md`.
- Phase 05 automated verification completed on 2026-03-28; report recorded in `.planning/phases/05-backup-confidence-dashboard/05-VERIFICATION.md`.
- Phase 06 was previously marked complete on 2026-03-28, and the Phase 01 backfill now closes the last remaining roadmap gap.

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files | Completed |
|-------|------|----------|-------|-------|-----------|
| 03 | 03 | 5 min | 2 | 5 | 2026-03-26 |
| 03 | 04 | 6 min | 2 | 6 | 2026-03-26 |
| 03 | 05 | 2 min | 2 | 2 | 2026-03-26 |
| 04 | 01 | 9 min | 2 | 7 | 2026-03-27 |
| 04 | 02 | 6 min | 2 | 3 | 2026-03-27 |
| 04 | 03 | 9 min | 2 | 10 | 2026-03-27 |
| 04 | 04 | 6 min | 2 | 8 | 2026-03-27 |
| Phase 05 P01 | 10 min | 2 tasks | 4 files | 2026-03-27 |
| Phase 05 P02 | 17 min | 2 tasks | 7 files | 2026-03-27 |
| Phase 05 P03 | 12 min | 2 tasks | 6 files | 2026-03-27 |
| Phase 05 P04 | 11 min | 2 tasks | 6 files | 2026-03-27 |
| Phase 05 P05 | 24 min | 2 tasks | 17 files | 2026-03-27 |
| Phase 06 P01 | 14 min | 2 tasks | 3 files | 2026-03-28 |
| Phase 06 P02 | 16 min | 2 tasks | 8 files | 2026-03-28 |
| Phase 06 P03 | 492 | 2 tasks | 6 files | 2026-03-28 |
| Phase 06 P04 | 13 min | 2 tasks | 6 files | 2026-03-28 |
| Phase 06 P05 | 15 min | 2 tasks | 8 files | 2026-03-28 |
| Phase 01 P02 | 23 min | 3 tasks | 18 files | 2026-03-28 |
| Phase 01 P03 | 2 min | 3 tasks | 12 files | 2026-03-28 |
| 07 | 01 | 12 min | 3 | 4 | 2026-03-29 |
| 07 | 02 | 2 min | 3 | 5 | 2026-03-29 |
| 07 | 04 | 10 min | 3 | 5 | 2026-03-29 |
| Phase 07 P03 | 5 min | 2 tasks | 17 files | |
| Phase 07 P05 | 15min | 3 tasks | 1 files | |
| Phase 10 P01 | 6min | 2 tasks | 7 files |
| Phase 10 P02 | 2min | 2 tasks | 4 files |
| 11 | 01 | 35min | 2 | 6 | 2026-03-30 |

## Session Info

- Last session: 2026-03-30T01:00:00Z
- Stopped at: Completed 11-01-PLAN.md — First-Run Bootstrap plan 1 of 2

## Notes

- Existing Intune foreign-IP work should inform connector patterns and operational UX, but is not assumed to be copied directly into this repo.
- The app now has a real login route, protected layout, `/api/me` session check, connector status surface, and audit trail surface.
- Backup Confidence intentionally keeps manual proof and exception handling read-only in v1 so audit-sensitive writes remain explicit future work.
- Network visibility backend includes canonical resource, relationship, and finding models plus seeded-example fallback repository and server-derived queue logic.
- Documentation search and metadata review are complete, but unrelated docs and lifecycle TypeScript errors still affect the full API package build.
- Critical security invariant for v1.2: credentials must never reach the browser — `GET /api/integrations/:key` returns `{ configured: boolean }` only, never the secret value.
- Graph API pagination is mandatory from day one: build `graphPageAll()` helper before any device domain mapping to prevent silent truncation at 100 devices.
- Bootstrap endpoint must use a DB-backed guard (`prisma.user.count` check), not a config flag, so it remains locked across restarts.

---
*Last updated: 2026-03-30 after v1.2 roadmap definition*
