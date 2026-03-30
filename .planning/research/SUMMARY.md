# Project Research Summary

**Project:** AgentSmith — v1.2 Intune Integration
**Domain:** Solo IT ops console — Microsoft-centric, Entra/Intune/OpenAI integration
**Researched:** 2026-03-30
**Confidence:** HIGH (stack, pitfalls, architecture from direct codebase inspection + official docs; features from Microsoft Learn + verified community sources)

---

## Executive Summary

AgentSmith v1.2 transforms the app from a UI-polished mock-data tool into a live Microsoft Intune-connected, AI-assisted IT ops console. The existing stack (Fastify 5, Prisma 6, PostgreSQL, React, openid-client) is the right foundation — no structural changes are needed. What is needed is a set of seven new API-only packages, one infrastructure prerequisite (pgvector PostgreSQL extension), and six new backend modules built in strict dependency order. The critical correction from research: neither the Intune provider nor the Entra provider make real Graph API calls today — both are stubs returning seeded data. Microsoft Graph integration is a first-class addition, not an extension of an existing pattern.

The recommended approach follows a six-phase dependency chain derived from feature wiring. Schema and credential storage must exist before any feature that reads credentials at runtime. First-run bootstrap unlocks the app for operators who do not have Entra ID pre-configured. The integrations settings page gates every external API call. Intune sync replaces mock data with live device state. The document ingest pipeline adds async AI classification and vector storage. RAG search makes the documentation assistant genuinely intelligent. Each phase builds on the prior one — no phase can be safely reordered. Phases 4 (Intune sync) and 5 (document ingest) are the only pair that can be developed in parallel once Phase 3 delivers a working credential store.

The dominant risks are security and data-integrity in nature. Credentials must never reach the browser — server-only AES-256-GCM encryption with an env-held key is mandatory from the first line of the integrations settings API. Graph API pagination must be implemented from day one: silent truncation at 100 devices is the single most common Intune integration mistake and produces a false-clean dashboard with no visible error. The chokidar file watcher requires explicit lifecycle management or it leaks OS handles on Windows and causes duplicate ingest events on restart. The RAG pipeline requires a committed chunking strategy and embedding model before the corpus is built — changing either after the fact requires a full re-embed pass of every document.

---

## Key Findings

### Recommended Stack

The existing stack requires no additions to the frontend workspace. All seven new packages install into `apps/api` only. The infrastructure prerequisite is the PostgreSQL `pgvector` extension, which must be installed on the server before RAG embeddings can be stored or queried. This is the only change outside the Node.js package graph.

**New packages — `apps/api` only:**

| Package | Version | Purpose | Rationale |
|---------|---------|---------|-----------|
| `bcryptjs` | `^3.0.3` | Local admin password hashing | Pure-JS, ESM-native, no native build step; types bundled |
| `@microsoft/microsoft-graph-client` | `^3.0.7` | Intune device sync | Official SDK; handles pagination, response typing; avoids raw fetch boilerplate |
| `mammoth` | `^1.12.0` | DOCX text extraction | `extractRawText()` returns clean plain text; actively maintained |
| `pdf-parse` | `^2.4.5` | PDF text extraction | Simple promise API; ESM-native at v2.4.5 |
| `openai` | `^6.33.0` | Classification, summarization, embeddings, RAG synthesis | Official SDK; ESM-native; v6.33.0 confirmed 2026-03-25 |
| `pgvector` | `^0.2.1` | Serialize float arrays to Postgres wire format for vector column | Required alongside `Unsupported("vector(1536)")` in Prisma schema |
| `chokidar` | `^5.0.0` | Watch-folder ingest trigger | v5 ESM-only, Node 20+; one dependency; debounces FS events correctly on Windows |

**No packages needed for:** credential encryption (Node.js `crypto` AES-256-GCM), file copy/organize (`fs/promises`), markdown/text parsing (native `fs.readFile`).

**What to avoid:** `@azure/msal-node` (redundant with `openid-client`), `langchain`/`llamaindex` (over-engineered for this use case), any external vector database (pgvector on existing PostgreSQL is sufficient at this corpus size), `@fastify/multipart` (ingest reads from server-side folder, not browser uploads).

**Infrastructure prerequisite:** Run `CREATE EXTENSION IF NOT EXISTS vector` via a manual Prisma migration before the ingest pipeline goes live. This requires the PostgreSQL binary to have the extension available.

**Embedding model commitment:** Use `text-embedding-3-small` (1,536 dimensions) throughout. Do not mix models in the same vector column — changing models after corpus is built requires a full re-embed pass. Store `embedding_model` and `dimensions` on each chunk row to make future migrations detectable.

**Chat models:** `gpt-4o-mini` for ingest classification and tagging (low cost, high volume); `gpt-4o` for RAG synthesis queries only (operator-facing, low volume, quality-critical).

---

### Expected Features

Five feature areas are in scope. Research confirmed a clear build order based on runtime dependencies.

**Must have (table stakes):**

- **First-run bootstrap** — single-screen local admin account creation; bootstrap route permanently locked after first use (DB flag, not env flag); automatic redirect to login on completion
- **Integrations settings page** — credential input for Intune (tenant ID, client ID, client secret) and OpenAI API key; masked display after save; connection test button per integration; connection health badge with last-verified timestamp
- **Intune device sync** — paginated Graph API pull of all managed devices (must follow `@odata.nextLink` — no 100-device truncation); compliance state per device; manual sync trigger; sync freshness indicator; last-sync error surfaced in UI
- **Document ingest pipeline** — parse md/txt/docx/pdf; OpenAI classify + summarize + embed; organize to output folder; per-file status (pending/processing/done/failed) visible in UI; manual trigger and file watcher (chokidar)
- **RAG search** — natural-language query; vector similarity retrieval; GPT synthesis with mandatory source citations; fallback to existing keyword search when embeddings are absent or similarity is below threshold

**Should have (differentiators):**

- Compliance summary counts (compliant/noncompliant/in-grace-period) at top of device inventory, with non-compliant sorted first by default
- AI-generated summary and tags visible per document (validates what the AI extracted without opening the source file)
- Re-ingest button per file and skip-already-processed guard (hash-based deduplication)
- Search mode toggle: AI synthesis vs keyword only
- Help text on integrations page listing required Graph permission scopes as copy-paste text

**Defer to v1.3:**

- App inventory per device (via `detectedApps` endpoint) — high data volume, high complexity, limited immediate value vs device inventory being stable
- Scheduled/configurable sync interval — manual sync is sufficient for v1.2
- Scope filter on RAG search (restrict to a specific document category)
- Query history persistence (session-only is fine for v1.2)
- Delta query support for incremental Intune sync (full sync on each run is acceptable for v1.2 fleet sizes)

---

### Architecture Approach

The architecture is additive — six new backend modules plugged into the existing Fastify/Prisma/PostgreSQL structure without modifying domain boundaries. The connector pattern already exists (`ConnectorRegistryEntry`, `runConnectorSync` with audit logging and `SyncRun` DB upserts); the Intune provider replaces only the stub inside `intune.provider.ts`. The `IntegrationCredential` module is the shared runtime-readable credential store that every other phase depends on.

**Major components and their responsibilities:**

1. **`modules/integrations/`** — AES-256-GCM encrypt/decrypt; `IntegrationCredential` CRUD; connection verify endpoints. Shared dependency for all external API calls.
2. **`modules/auth/` (extended)** — `LocalAuthProvider` alongside existing Entra OIDC path; setup status check; one-time admin creation endpoint.
3. **`connectors/providers/intune.provider.ts` (replaced)** — Real Graph API calls; paginated device sync; compliance policy sync; reads Graph credentials from `IntegrationCredential` at sync time via injected credential service.
4. **`jobs/runDocumentIngest.ts` + `jobs/watchIngestFolder.ts`** — Async ingest pipeline; chokidar singleton with `ignoreInitial: true` and `awaitWriteFinish`; per-file status tracking; multi-parser error isolation.
5. **`modules/docs/docs.rag.ts`** — Embed query; `$queryRaw` cosine similarity search; GPT-4o synthesis with constrained system prompt; citation mapping back to source documents.
6. **Web: `routes/setup/` + `routes/integrations/`** — Two new page areas outside and inside ProtectedLayout respectively; no new frontend packages required.

**Key schema additions:**

| Model / Change | Purpose | Phase |
|---|---|---|
| `User.passwordHash?`, `User.role` | Local admin auth | Phase 1 |
| `IntegrationCredential` | Encrypted runtime credentials | Phase 1 |
| `DeviceCompliancePolicy` | Intune policy definitions | Phase 4 |
| `DeviceComplianceAssignment` | Per-device compliance state | Phase 4 |
| `DocumentEmbedding` (+ raw vector column + HNSW index) | Embedding storage for RAG | Phase 5 |

**Data flows of note:**

Ingest: `chokidar add/change` → `runDocumentIngest` → parse text → OpenAI classify/embed → output folder copy → `Document` + `DocumentEmbedding` upsert (raw SQL for vector column).

RAG query: `POST /api/docs/rag-search` → embed query → `$queryRaw` cosine similarity top-5 → GPT-4o synthesis → `{ answer, sources: [{ documentId, title, excerpt }] }`.

---

### Critical Pitfalls

**Top 5 — prevention is mandatory, not optional:**

1. **Credentials exposed to the browser** — Never return the OpenAI key or Graph client secret from any GET endpoint. Return `{ configured: boolean }` only. Enforce at API design time for the integrations settings page — a violation requires rewriting the auth model. Detection: `grep -r "OPENAI\|clientSecret\|tenantId" apps/web/src` should produce zero hits outside of server-only imports.

2. **Graph API pagination truncation** — `/deviceManagement/managedDevices` returns 100 records by default. Build a `graphPageAll(url)` helper that follows `@odata.nextLink` before any domain mapping. A fleet of 300 devices showing 100 in the dashboard is a silent data integrity failure. Surface "last sync: N devices" in the UI so the operator can detect anomalies.

3. **Bootstrap endpoint stays open after first use** — Use a DB-backed guard (`prisma.user.count({ where: { sourceSystem: 'local' } }) === 0`), not a config file or env variable. The endpoint returns 403 permanently after the first admin is created. Session IDs must rotate on every login regardless of auth strategy to prevent session fixation across the local and Entra paths.

4. **Credentials stored as plaintext in the database** — Encrypt all credential values with AES-256-GCM using `node:crypto`. Store `{ iv, ciphertext }` — never the raw secret. The encryption key lives in env only. Schema design must include encrypted columns before the first credential is persisted.

5. **pgvector HNSW index absent at first load** — Create the HNSW index in the same migration that adds the vector column (`CREATE INDEX USING hnsw (embedding vector_cosine_ops)`). Without the index, every RAG query is a full table scan. The operator class must match the query operator (`<=>` requires `vector_cosine_ops`); a mismatch silently falls back to sequential scan with no error.

**Additional pitfalls with phase-specific timing:**

- Graph API 429 throttling: detect explicitly, respect `Retry-After` header, never treat as generic error — Phase 4
- Chokidar handle leak on Windows: module-level singleton, `watcher.close()` on `SIGTERM`/`SIGINT`, `ignoreInitial: true` — Phase 5
- Re-embedding on every restart: hash-based deduplication (`filePath + mtime`); never embed without idempotency check — Phase 5
- RAG hallucination with unfalsifiable citations: mandatory citation panel in UI; constrained system prompt; cosine similarity threshold below which keyword fallback fires — Phase 6
- Chunking strategy mismatch: commit to 400–600 token recursive character splitting with 10–15% overlap before any corpus is built; sentence-level chunking is wrong for SOPs and recovery procedures — Phase 5

---

## Implications for Roadmap

Research confirms a six-phase dependency chain. No phase can be safely reordered except that Phases 4 and 5 can proceed in parallel once Phase 3 is complete.

### Phase 1: Schema and Credential Foundation

**Rationale:** All other phases read from `IntegrationCredential` at runtime. No Intune sync, no ingest pipeline, and no RAG search can be built until credential storage exists. Making Entra env vars optional also unblocks local development and the bootstrap phase simultaneously.

**Delivers:** Prisma migrations (`User.passwordHash`, `User.role`, `IntegrationCredential`); `modules/integrations/` with AES-256-GCM encrypt/decrypt; `GET /api/integrations` + `PUT /api/integrations/:key` routes (no verify yet); Entra env vars marked `.optional()` in `packages/shared/src/env.ts`.

**Avoids:** Credentials stored as plaintext (Pitfall 3); hard-coded Graph credentials in env that defeat the purpose of the settings UI (architecture anti-pattern).

**Research flag:** Standard patterns — AES-256-GCM with `node:crypto` is well-documented; Prisma migration is routine. No additional research needed.

---

### Phase 2: First-Run Bootstrap

**Rationale:** Depends only on the `User` schema change from Phase 1. Unlocks the app for operators who do not have Entra ID pre-configured. Must be built before the integrations settings UI so the operator can actually log in.

**Delivers:** `LocalAuthProvider` in `apps/api/src/plugins/auth.ts`; `GET /api/setup/status` + `POST /api/setup/create-admin` (unauthenticated, one-time, DB-flag-locked after first use); `/setup` route in web (outside ProtectedLayout); session ID rotation on all login paths.

**Avoids:** Bootstrap endpoint staying open after first use (Pitfall 2); session fixation across auth strategies (Pitfall 2); in-memory session store losing local sessions on restart (Pitfall 14 — verify session persistence before this phase begins).

**Research flag:** Standard patterns for self-hosted apps. No additional research needed.

---

### Phase 3: Integrations Settings UI and Connection Verify

**Rationale:** Depends on credential storage (Phase 1). Gates every feature that calls an external API. The operator must be able to enter and verify Graph and OpenAI credentials before Intune sync or ingest pipeline can be enabled.

**Delivers:** `IntegrationsPage.tsx` with masked display, per-section save, and test-connection button per integration; `POST /api/integrations/:key/verify` triggering a live lightweight Graph/OpenAI call; connection health badge updated in shell connector health surface.

**Avoids:** Credentials returned to browser in settings GET response (Pitfall 1); detailed Graph error strings surfaced to the browser — return structured hint codes, not raw API errors (Pitfall 15).

**Research flag:** Standard CRUD plus encryption patterns. No additional research needed.

---

### Phase 4: Intune Device Sync (Live Graph)

**Rationale:** Depends on credential service (Phase 3) for Graph credentials at sync time. Replaces mock data in the existing asset health dashboard — this is the core v1.2 value proposition. Can begin in parallel with Phase 5 once Phase 3 is complete.

**Delivers:** Real `intune.provider.ts` replacing the stub; `DeviceCompliancePolicy` + `DeviceComplianceAssignment` Prisma models; paginated full device sync following `@odata.nextLink`; sync freshness indicator and manual trigger in UI; sync status record with last-error field surfaced to operator.

**Avoids:** Pagination truncation at 100 devices (Pitfall 4 — `graphPageAll()` helper built first, before domain mapping); 429 throttling treated as generic error (Pitfall 5 — explicit detection, Retry-After respect, exponential backoff); CA-policy-blocked token refresh failing silently (Pitfall 6 — client credentials flow with application permissions, token errors stored in sync status record).

**Graph permissions required (application, not delegated):** `DeviceManagementManagedDevices.Read.All`, `DeviceManagementApps.Read.All`, `DeviceManagementConfiguration.Read.All`.

**Research flag:** RECOMMEND research-phase at planning time. Graph API pagination, throttling handling, client credentials auth wiring, and delta query setup have enough implementation surface to warrant a focused spike before coding begins.

---

### Phase 5: Document Ingest Pipeline

**Rationale:** Depends on credential service (Phase 1) for the OpenAI API key. Independent of Intune sync — can be developed in parallel with Phase 4 once Phase 3 is complete. The `DocumentEmbedding` schema and pgvector migration must be committed before Phase 6 (RAG search) can be built.

**Delivers:** `runDocumentIngest.ts` (parse → classify → embed → output folder → DB upsert); `watchIngestFolder.ts` (chokidar singleton, `ignoreInitial: true`, `awaitWriteFinish: { stabilityThreshold: 2000 }`); `POST /api/ingest/trigger`; `DocumentEmbedding` Prisma model + manual pgvector migration with HNSW index in same migration; per-file status UI; ingest settings (source/output folder path configuration with path collision guard).

**Avoids:** Handle leak on Windows (Pitfall 7 — singleton plus `SIGTERM` handler); bad PDF/DOCX crashing entire pipeline (Pitfall 8 — per-file try/catch, `status: 'failed'` record, queue not blocked); re-embedding on every restart (Pitfall 12 — `ignoreInitial: true` plus hash deduplication); pgvector index absent (Pitfall 13 — HNSW index created in same migration as vector column); chunking too small for useful RAG context (Pitfall 10 — 400–600 token recursive split, 50–80 token overlap); source and output folder being the same path (Pitfall 16 — validate at settings save).

**Research flag:** RECOMMEND research-phase at planning time. The combination of chokidar lifecycle inside Fastify, pgvector raw SQL migration, OpenAI rate-limit retry logic, and multi-parser error isolation is the highest-complexity phase. Each component is individually documented but their interaction within a single server lifecycle needs deliberate design before implementation begins.

---

### Phase 6: RAG Search

**Rationale:** Depends on embeddings in the DB (Phase 5). The `DocumentEmbedding` table and HNSW index must exist before this phase begins. The scaffolding can be built in parallel with Phase 5 once the schema is committed.

**Delivers:** `docs.rag.ts` module (embed query → `$queryRaw` cosine similarity → top-5 chunks → GPT-4o synthesis with constrained system prompt); `POST /api/docs/rag-search` endpoint; web search UI extended with RAG mode, synthesized answer display, and mandatory citation panel; cosine similarity threshold below which fallback to existing keyword search fires automatically.

**Avoids:** LLM supplementing retrieved context with training knowledge (Pitfall 11 — constrained system prompt; citation panel mandatory); low-confidence retrieval sent to LLM anyway (Pitfall 11 — similarity threshold gate, fallback to keyword search); keyword search removed or broken (anti-feature per FEATURES.md — RAG is additive, not a replacement).

**Research flag:** Standard patterns once Phase 5 exists. GPT prompt engineering and citation rendering are the novel elements; both are well-documented. No additional research-phase needed if Phase 5 is solid.

---

### Phase Ordering Rationale

- Phase 1 before everything: `IntegrationCredential` is read at runtime by Phases 3, 4, and 5 — no credential store means no external API calls.
- Phase 2 after Phase 1: `User.passwordHash` schema change must exist before `LocalAuthProvider` can be built.
- Phase 3 after Phase 1: integrations UI writes to `IntegrationCredential`; the verify endpoint needs real Graph/OpenAI credentials stored to test against.
- Phase 4 after Phase 3: Intune sync reads Graph credentials from `IntegrationCredential`; the operator must be able to enter and verify them first.
- Phase 5 after Phase 1: ingest reads OpenAI key from `IntegrationCredential`; independent of Phase 4, can run in parallel.
- Phase 6 after Phase 5: RAG requires embeddings in the DB; the `DocumentEmbedding` table and pgvector extension must exist.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | openai SDK version HIGH (official CHANGELOG verified); bcryptjs, mammoth, pdf-parse, pgvector versions MEDIUM (npm search results, not direct registry fetch at research time); chokidar v5 behavior HIGH (multiple sources agree, official GitHub) |
| Features | HIGH | Microsoft Graph field list from official Microsoft Learn docs (updated 2025-10-11); feature UX patterns MEDIUM (verified against enterprise tool conventions) |
| Architecture | HIGH | Based on direct codebase inspection plus official Prisma/pgvector docs; Node.js crypto pattern from official Node.js docs; connector pattern from existing codebase |
| Pitfalls | HIGH | Graph throttling and pagination from official Microsoft Learn docs; RAG hallucination rate from peer-reviewed source (MDPI Mathematics 2025); chokidar Windows behavior from primary source (GitHub issues); credential exposure patterns from security research |

**Overall confidence:** HIGH

### Gaps to Address

- **`@microsoft/microsoft-graph-client` version pinning:** Version not confirmed from primary npm registry source. Verify the latest stable release before installation.
- **Graph client credentials flow implementation:** Research recommends a custom `AuthenticationProvider` calling the token endpoint directly, avoiding `@azure/msal-node`. This is sound in principle but will need implementation validation during Phase 4. Fallback: add `@azure/identity` (`ClientSecretCredential`) which is the documented MSAL pattern if the custom approach proves fragile.
- **Prisma 6 + pgvector `Unsupported` type migration:** The pattern is confirmed working from GitHub issues and official Prisma blog posts, but raw SQL migrations require careful sequencing (extension → column → HNSW index). Validate the migration sequence against the actual installed Prisma version before Phase 5.
- **Session persistence for local auth:** Research flags that the existing app may use an in-memory session store. Verify `apps/api/src/plugins/auth.ts` for current session store implementation before beginning Phase 2.
- **pdf-parse v2.4.5 ESM compatibility:** Cited as ESM-native; validate against the actual installed package. `unpdf` is the documented alternative if ESM issues surface.

---

## Sources

### Primary (HIGH confidence)

- Microsoft Graph API — managedDevice resource (Microsoft Learn, updated 2025-10-11): https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0
- Microsoft Graph throttling limits (official): https://learn.microsoft.com/en-us/graph/throttling-limits
- Microsoft Graph paging (official): https://learn.microsoft.com/en-us/graph/paging
- Microsoft Graph delta query (official): https://learn.microsoft.com/en-us/graph/delta-query-overview
- Microsoft Entra — Intune Graph API permissions (Microsoft Learn, updated 2025-10-11): https://learn.microsoft.com/en-us/intune/intune-service/developer/intune-graph-apis
- openai npm CHANGELOG — v6.33.0 confirmed 2026-03-25: https://github.com/openai/openai-node/blob/master/CHANGELOG.md
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- OpenAI embeddings — text-embedding-3 models: https://platform.openai.com/docs/guides/embeddings
- pgvector GitHub (official): https://github.com/pgvector/pgvector
- chokidar GitHub — v5 ESM-only: https://github.com/paulmillr/chokidar
- RAG hallucination mitigation — MDPI Mathematics 2025 (peer-reviewed): https://www.mdpi.com/2227-7390/13/5/856
- Chokidar Windows handle issues (primary source, GitHub issues): https://github.com/paulmillr/chokidar/issues/1162

### Secondary (MEDIUM confidence)

- Prisma pgvector extension support: https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres
- @microsoft/microsoft-graph-client GitHub README: https://github.com/microsoftgraph/msgraph-sdk-javascript
- bcryptjs, mammoth, pdf-parse, pgvector npm pages (versions from WebSearch against npm data)
- RAG chunking strategies 2026 (Firecrawl, cross-referenced with benchmark data): https://www.firecrawl.dev/blog/best-chunking-strategies-rag
- OAuth session fixation and SSO security risks (Doyensec blog 2025, sec.co): verified across multiple security research sources
- Credential storage anti-patterns (GitGuardian BFF pattern, nodejs-security.com)
- Graph rate limiting in Intune — MSEndpointMgr community (2025): https://msendpointmgr.com/2025/11/08/graph-api-rate-limiting-in-intune/

### Tertiary (LOW confidence)

- bcryptjs version 3.0.3 — npm search result; direct npm registry unavailable at research time; validate before installation
- pdf-parse version 2.4.5 ESM support — WebSearch citing npm data; verify against installed package
- RAG accuracy benchmarks (semantic vs recursive chunking: 54% vs 69%) — blog sources, 2026; directionally credible but not peer-reviewed

---

*Research completed: 2026-03-30*
*Ready for roadmap: yes*
