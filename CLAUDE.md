# Claude Handoff: v1.2 Intune Integration

v1.0 and v1.1 are complete and archived. v1.2 is the active milestone.

## Read This First

1. `AGENTS.md`
2. `.planning/PROJECT.md`
3. `.planning/REQUIREMENTS.md`
4. `.planning/ROADMAP.md`
5. `.planning/STATE.md`
6. `.planning/MILESTONES.md`

## Current Status

- v1.0 complete and archived.
- v1.1 complete and archived. Phase 07 shipped. Phases 08–09 stubbed and deferred to v1.3.
- v1.2 Intune Integration is active. Roadmap defined — Phase 10 is next.
- The standard automated regression path currently passes:
  - `npx pnpm test`
- That green path currently covers:
  - API tests
  - Web unit and route-smoke tests
  - 16 Playwright browser tests (auth, shell navigation, inventory/detail, lifecycle/docs)
- Browser tests use mocked `/api` and `/auth` — not a real API integration profile yet.
- Full API typecheck still has pre-existing docs/lifecycle TypeScript debt outside this milestone.

## Milestone Scope

**Goal:** Connect the app to live Microsoft Intune data, add an AI-powered document ingest pipeline, and introduce a first-run bootstrap so the app can be set up without Entra ID as a hard dependency.

## Phase Plan

### Phase 10: Schema and Credential Foundation

Infrastructure prerequisite — no named user requirements but everything else blocks on it.

Deliverables:
- `User.passwordHash` and `User.role` fields (Prisma migration)
- `IntegrationCredential` table with AES-256-GCM encrypted storage
- pgvector extension + `DocumentEmbedding` table with HNSW index
- Entra ID env vars made optional (Zod schema change)

### Phase 11: First-Run Bootstrap

Requirements: `BOOT-01`, `BOOT-02`, `BOOT-03`

Focus:
- Unauthenticated setup route (redirect when no admin exists)
- Local admin creation endpoint — DB-locked after first use
- `LocalAuthProvider` implementing existing `AuthProvider` interface
- Session ID regeneration on login (both auth paths)

### Phase 12: Integrations Settings UI

Requirements: `CRED-01`, `CRED-02`, `CRED-03`, `CRED-04`

Focus:
- Integrations page: Intune section + OpenAI section
- Credential masking — never return full secret to browser
- Test-connection button with human-readable pass/fail
- Last-verified timestamp and health badge per integration

### Phase 13: Intune Device Sync

Requirements: `SYNC-01`, `SYNC-02`, `SYNC-03`

Focus:
- `@microsoft/microsoft-graph-client` — real Graph API calls (providers are currently stubs)
- `graphPageAll()` helper for pagination — mandatory before any device mapping
- 429 retry with exponential backoff + `Retry-After` header
- Graph scopes: `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All`
- DeviceCompliancePolicy + DeviceComplianceAssignment models
- Manual sync trigger + freshness indicator

### Phase 14: Document Ingest Pipeline

Requirements: `INGEST-01` through `INGEST-05`

Focus:
- `chokidar` v5 watch-folder (module-level singleton, SIGTERM handler, hash dedup)
- Parser stack: `mammoth` (docx), `unpdf` (pdf), native fs (md/txt)
- OpenAI classify + summarize + tag + embed (async queue, never in HTTP path)
- 512-token recursive chunking with overlap
- Organized output folder copy
- Per-file status (pending/processing/done/failed)

### Phase 15: RAG Search

Requirements: `RAG-01`, `RAG-02`

Focus:
- Embed query → pgvector similarity search → top-K chunks → GPT synthesis
- Citation panel (source doc name + excerpt, linked to doc detail)
- Keyword fallback when no OpenAI key configured or similarity too low
- Constrained system prompt ("answer only from provided context")

## Key Security Invariants

- Credentials must **never** reach the browser — `GET /api/integrations/:key` returns `{ configured: boolean }` only
- Bootstrap endpoint must use `prisma.user.count` DB-backed guard, not a config flag
- Session ID must be regenerated on every login (both local and Entra paths)

## Deferred to v1.3

- `FLOW-01→04`: Queue/detail navigation consistency (Phase 08 stub exists)
- `QUAL-01→03`: Keyboard/accessibility/responsive hardening (Phase 09 stub exists)
- `TEST-01→02`: Automated UI coverage gaps
- Intune app inventory per device (detectedApps) — high volume, lower urgency

## Commands

- `npx pnpm test`
- `npx pnpm --filter @agentsmith/web test`
- `npx pnpm --filter @agentsmith/web test:e2e`
- `npx pnpm --filter @agentsmith/api test`

## Guardrails

- Credentials never held in browser — server-side storage only.
- Entra ID auth preserved and still works if configured.
- Keep connector-specific logic isolated from internal domain models.
- Treat write actions as high-trust operations requiring explicit review and auditability.
- Do not revert unrelated work in the tree.
