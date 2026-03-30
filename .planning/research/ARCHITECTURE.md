# Architecture Patterns: v1.2 Intune Integration

**Domain:** Solo IT ops console — adding live Microsoft Graph sync, AI document pipeline, and local auth bootstrap
**Researched:** 2026-03-30
**Confidence:** HIGH (based on direct codebase inspection plus verified external sources)

---

## Existing Architecture Baseline (from codebase)

The app is a pnpm monorepo with two primary workspaces:

- `apps/api` — Fastify 5, Prisma 6, PostgreSQL, openid-client for Entra OIDC
- `apps/web` — React + Vite, React Router

**Auth model:** OIDC flow via `MicrosoftEntraAuthProvider`, signed HMAC cookies (no express-session — purely Fastify cookies). Dev bypass mode via `DEV_AUTH_BYPASS=true`. Sessions stored in signed cookies; user identity resolved against the `User` table on each request.

**Connector pattern:** `ConnectorRegistryEntry` array keyed by id (currently `entra` and `intune`). Both providers are currently seeded stubs returning fake data. `runConnectorSync` in `jobs/runConnectorSync.ts` wraps any registry entry with audit logging and `ConnectorSource`/`SyncRun` DB upserts.

**Docs module:** `Document` table with `contentText`, `searchText`, `summary`, `kind`, `reviewState`. Keyword search implemented via `searchText` column (full-text via `@db.Text`, filtered with `ILIKE` or similar). Metadata assignments normalized into a separate `DocumentMetadataAssignment` table. Revision history in `DocumentRevision`.

**Credentials:** All secrets currently live in `.env` / `process.env` via the `parseServerEnv()` Zod schema. No runtime-writable credential storage exists yet.

**No Microsoft Graph SDK installed.** The Intune provider is a stub. The Entra provider is also a stub returning seeded data. No real Graph API calls exist yet.

---

## Feature Integration Map

### Feature 1: First-Run Bootstrap

**What it is:** On first launch, if no `User` records with `sourceSystem = 'local'` exist and Entra is not configured, show an unauthenticated setup route to create a local admin account, then redirect to login.

**Integration points:**

| Layer | Change | Type |
|-------|--------|------|
| `prisma/schema.prisma` | Add `passwordHash String?` and `role String @default("admin")` to `User`, or create a separate `LocalCredential` model | New schema |
| `packages/shared/src/env.ts` | Make `ENTRA_*` vars optional (`.optional()`) so the server starts without them | Modify existing |
| `apps/api/src/plugins/auth.ts` | Add `LocalAuthProvider` implementing `AuthProvider` interface; password hash comparison via `node:crypto` (`scrypt` or `bcrypt`) | New code in existing module |
| `apps/api/src/routes/auth.ts` | Add `GET /api/setup/status` (unauthenticated) returning `{ needsSetup: boolean }` and `POST /api/setup/create-admin` (unauthenticated, one-time) | New routes |
| `apps/api/src/server.ts` | Register setup routes before auth guard; `createAuthService` selects provider by env: Entra if configured, local otherwise | Modify existing |
| `apps/web/src/router.tsx` | Add `/setup` route that checks `needsSetup` before rendering login; redirect guard | New route |

**Key constraint:** The setup endpoint must be disabled permanently once any local admin exists. The check `prisma.user.count({ where: { sourceSystem: 'local' } }) === 0` gates the POST endpoint. This prevents re-running setup after initial configuration.

**`User` model change recommendation:**

Add to `User`:
```prisma
passwordHash  String?
role          String  @default("admin")
```

Rather than a separate table. Local users have `sourceSystem = 'local'`, `sourceId = email`, `passwordHash` set. Entra users have `sourceSystem = 'entra'`, `passwordHash = null`. The auth service branch-selects by whether Entra env vars are present and non-empty.

**Confidence:** HIGH — pattern is standard for self-hosted apps, directly fits existing `User` model.

---

### Feature 2: Integrations Settings Page

**What it is:** Authenticated route where the operator reads and writes Intune (Graph tenant credentials) and OpenAI API key. Shows connection health. All credential values stay server-side — the browser never receives them.

**Credential storage decision: encrypted DB column (recommended over env-only)**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Env file only | Zero new code | Not writable at runtime; requires restart; no UI management | Not viable for UI-configurable credentials |
| Encrypted DB column | Runtime-writable, auditable, no external dependency | Requires encryption key management; slightly more code | **Recommended** |
| Secrets manager (Azure Key Vault, etc.) | Enterprise-grade | External dependency, complexity, not appropriate for solo self-hosted tool | Out of scope |

**Recommended approach:** Store credentials in a new `IntegrationCredential` table. Encrypt value at rest using AES-256-GCM with `SESSION_SECRET` (already in env) as the KEK, or introduce a dedicated `CREDENTIAL_ENCRYPTION_KEY` env var. The API endpoint returns `{ key, configured: boolean, lastVerifiedAt }` — never the raw credential value. Write endpoint accepts new credential value, encrypts, upserts.

**New Prisma model:**

```prisma
model IntegrationCredential {
  id          String   @id @default(cuid())
  key         String   @unique   // e.g. "intune_tenant_id", "openai_api_key"
  label       String
  encryptedValue String @db.Text
  configuredAt   DateTime @default(now())
  lastVerifiedAt DateTime?
  verifyResult   String?  // "ok" | "error" | null
  updatedAt   DateTime @updatedAt
}
```

**New API surface:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/integrations` | Required | List all integration slots with `configured` boolean and health status |
| `PUT /api/integrations/:key` | Required | Write or update a credential value |
| `POST /api/integrations/:key/verify` | Required | Trigger live connection test; update `lastVerifiedAt` and `verifyResult` |

**Integration points:**

| Layer | Change | Type |
|-------|--------|------|
| `prisma/schema.prisma` | Add `IntegrationCredential` model | New model |
| `apps/api/src/modules/integrations/` | New module: credential service, encryption helpers | New module |
| `apps/api/src/routes/integrations.ts` | New route file following existing `registerXxxRoutes` pattern | New file |
| `apps/api/src/server.ts` | Register integrations routes with `requireAuthenticatedSession` | Modify existing |
| `apps/web/src/routes/integrations/` | New settings page: list integration cards, edit modal | New pages |

**Confidence:** HIGH — AES-256-GCM available natively in `node:crypto`; pattern consistent with existing auth module's HMAC use.

---

### Feature 3: Intune Sync (Live Microsoft Graph)

**What it is:** Replace the stubbed `intune.provider.ts` with real Microsoft Graph API calls to pull managed devices, compliance state, and app inventory. Store normalized data in existing `Device`, `User`, `Group` tables plus new compliance tables.

**Microsoft Graph requirements:**

| Data | Graph endpoint | Permission |
|------|---------------|------------|
| Managed devices | `GET /deviceManagement/managedDevices` | `DeviceManagementManagedDevices.Read.All` |
| Compliance policies | `GET /deviceManagement/deviceCompliancePolicies` | `DeviceManagementConfiguration.Read.All` |
| Device compliance state | `GET /deviceManagement/deviceComplianceSettingStates` | `DeviceManagementManagedDevices.Read.All` |
| App inventory | `GET /deviceAppManagement/mobileApps` | `DeviceManagementApps.Read.All` |

**Graph auth:** The existing `ENTRA_*` env vars are for the user-facing OIDC flow. For Graph API calls from the sync job, a separate app registration with client credentials (client ID + secret + tenant ID) is needed, OR the same app registration extended with application permissions. The credentials for this service-to-service call should live in `IntegrationCredential` (Feature 2), specifically keys `graph_tenant_id`, `graph_client_id`, `graph_client_secret`. The Graph SDK call uses `@azure/identity` `ClientSecretCredential` + `@microsoft/microsoft-graph-client`.

**New Prisma models:**

```prisma
model DeviceCompliancePolicy {
  id           String   @id @default(cuid())
  sourceSystem String
  sourceId     String   // Graph policyId
  name         String
  platform     String?  // "windows10", "iOS", etc.
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  assignments  DeviceComplianceAssignment[]

  @@unique([sourceSystem, sourceId])
}

model DeviceComplianceAssignment {
  id          String   @id @default(cuid())
  deviceId    String
  device      Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  policyId    String
  policy      DeviceCompliancePolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  state       String   // "compliant" | "noncompliant" | "unknown" | "error" | "conflict"
  lastUpdated DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([deviceId, policyId])
  @@index([deviceId, state])
}
```

**App inventory:** Stored in a new `ManagedApp` table or surfaced as a JSON blob in `Device.metadata` (simpler, sufficient for v1.2). Recommended: a simple `DeviceApp` join table with `appId`, `displayName`, `version` linked to `Device` is preferable to a JSON blob for queryability, but a `Json` field on `Device` is acceptable for MVP if app-level queries are not needed yet.

**Integration points:**

| Layer | Change | Type |
|-------|--------|------|
| `apps/api/src/modules/connectors/providers/intune.provider.ts` | Replace stub with real Graph calls; reads credentials from `IntegrationCredential` via injected credential service | Replace stub |
| `prisma/schema.prisma` | Add `DeviceCompliancePolicy`, `DeviceComplianceAssignment`; add `DeviceApp` if app inventory needed | New models |
| `apps/api/src/modules/assets/asset-health.repository.ts` | Extend to join compliance assignment data when `isSeededMode()` is false | Modify existing |
| `packages/shared/src/env.ts` | No change needed — Graph credentials come from DB, not env | No change |

**Dependency on Feature 2:** The Intune sync provider must be able to load Graph credentials at sync time. The `runConnectorSync` job should inject a credential reader. Do not hard-code credentials in the provider.

**Confidence:** MEDIUM — Graph endpoints and permissions verified from official Microsoft Learn docs (above). The specific Node.js SDK wiring is a well-established pattern but will need implementation detail research at phase time.

---

### Feature 4: Document Ingest Pipeline

**What it is:** Server-side pipeline that reads files from a source folder, parses them, calls OpenAI to classify/summarize/generate embeddings, writes organized copies to an output folder, and stores embeddings + metadata in DB. Two triggers: watch-folder (auto) and API endpoint (on-demand).

**File parsing library decisions:**

| File type | Library | Rationale |
|-----------|---------|-----------|
| `.md`, `.txt` | `node:fs` native read | No dependency needed |
| `.docx` | `mammoth` | Mature, 2M+ weekly downloads, `extractRawText()` for clean text extraction |
| `.pdf` | `unpdf` or `pdf-parse` | `unpdf` is more modern (unjs, ESM-native); `pdf-parse` is simpler but less maintained. For ESM monorepo, `unpdf` preferred. |

**Watch folder implementation:**

Use `chokidar` v5 (ESM-only, Node 20+ compatible with existing `@types/node ^22`). Configure with `awaitWriteFinish: { stabilityThreshold: 2000 }` to avoid processing partially-written files. The watcher runs as a background job inside the API process, started after the Fastify server starts (in the `start()` function or via a plugin). Keep watcher lifecycle tied to server lifecycle using `app.addHook('onClose', ...)` to cleanly stop watching on shutdown.

**Source/output folder paths:** Configurable via env vars `INGEST_SOURCE_DIR` and `INGEST_OUTPUT_DIR`. Add to `packages/shared/src/env.ts` as `.optional()` — ingest is not required if not configured. The watcher only starts if `INGEST_SOURCE_DIR` is set.

**Watch folder integration points:**

| Layer | Change | Type |
|-------|--------|------|
| `packages/shared/src/env.ts` | Add `INGEST_SOURCE_DIR`, `INGEST_OUTPUT_DIR`, `OPENAI_API_KEY` as optional | Modify existing |
| `apps/api/src/jobs/runDocumentIngest.ts` | New ingest job: parse file, call OpenAI classify/summarize/embed, write output, upsert DB | New file |
| `apps/api/src/jobs/watchIngestFolder.ts` | New: start chokidar watcher, call `runDocumentIngest` on new/changed files | New file |
| `apps/api/src/routes/ingest.ts` | `POST /api/ingest/trigger` — authenticated, run ingest on a specific file or full folder rescan | New file |
| `apps/api/src/server.ts` | Start watcher after `app.listen()` if env configured; register ingest route | Modify existing |

**OpenAI integration for ingest:**

The ingest pipeline calls:
1. `openai.chat.completions.create` for classification (kind) and summary generation
2. `openai.embeddings.create` with model `text-embedding-3-small` for vector generation (1536 dimensions)

The `openai` npm package provides the official Node.js SDK. OpenAI API key loaded from `IntegrationCredential` table (preferred for runtime configurability) or from `OPENAI_API_KEY` env var as fallback.

**Confidence:** HIGH — chokidar, mammoth, unpdf all well-established; OpenAI embeddings API is stable and well-documented.

---

### Feature 5: RAG Search

**What it is:** Query endpoint that embeds the user's query, performs vector similarity search against stored document embeddings, retrieves top-K matching documents, passes them to GPT for synthesis, and returns answer + source citations. Existing keyword search (`searchText`) remains as fallback when OpenAI is not configured.

**Vector storage decision: pgvector extension on existing PostgreSQL (recommended)**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| pgvector on existing PostgreSQL | Single DB, no new infrastructure, Prisma can manage adjacent tables | Prisma does not natively support `vector` type; requires raw SQL for vector ops | **Recommended** |
| Separate vector DB (Pinecone, Qdrant, Weaviate) | Native vector search, managed | New infrastructure, new dependency, ops overhead for solo tool | Out of scope |
| Store embeddings as `Float32Array` in JSON column | Zero new extension | No index, full table scan, poor performance above hundreds of rows | Not recommended |

**pgvector + Prisma pattern:**

Prisma 6 (currently installed) supports `Unsupported("vector(1536)")` in schema. Vector column must use raw SQL (`$executeRaw`, `$queryRaw`) for insert and similarity search. Custom migrations are created with `--create-only` to add the `CREATE EXTENSION IF NOT EXISTS vector;` statement and vector column DDL. This is a known, documented pattern confirmed stable in Prisma 6.

**New Prisma model for embeddings:**

```prisma
// In schema.prisma — vector column requires Unsupported type
// The actual migration must be created manually (--create-only)

model DocumentEmbedding {
  id           String   @id @default(cuid())
  documentId   String   @unique
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  modelName    String   // "text-embedding-3-small"
  dimensions   Int      // 1536
  // embedding vector(1536) — added via raw migration, not schema field
  chunkIndex   Int      @default(0)
  chunkText    String   @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([documentId])
}
```

The `embedding` column itself (`vector(1536)`) is added by raw SQL migration. Prisma manages all other columns. An HNSW index on the embedding column is also added via raw migration SQL:

```sql
CREATE INDEX ON "DocumentEmbedding" USING hnsw (embedding vector_cosine_ops);
```

**New API surface:**

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/docs/rag-search` | Required | Body: `{ query: string }` — embed, vector search, synthesize, return `{ answer, sources }` |

The existing `GET /api/docs/search` remains unchanged and continues to serve keyword search. RAG search is an additive endpoint; the frontend can call both or fall back gracefully.

**Integration points:**

| Layer | Change | Type |
|-------|--------|------|
| `prisma/schema.prisma` | Add `DocumentEmbedding` model (without vector column) | New model |
| `prisma/migrations/` | Manual migration file adding `CREATE EXTENSION vector` + vector column + HNSW index | New migration (manual) |
| `apps/api/src/modules/docs/docs.repository.ts` | Add `searchBySimilarity(embedding: number[]): Promise<Document[]>` using `$queryRaw` | Modify existing |
| `apps/api/src/routes/docs.ts` | Add `POST /api/docs/rag-search` handler | Modify existing |
| `apps/api/src/modules/docs/` | New `docs.rag.ts` — embed query, call similarity search, call OpenAI synthesis | New file |

**Confidence:** MEDIUM — pgvector + Prisma raw SQL pattern is confirmed working in Prisma 6 from GitHub issues and official docs, but vector migration requires manual care. HNSW index recommended over IVFFlat for this scale (hundreds to low thousands of documents).

---

## Complete New Schema Summary

New models required in `prisma/schema.prisma`:

| Model | Purpose | Feature |
|-------|---------|---------|
| `User.passwordHash`, `User.role` fields | Local admin auth | Bootstrap |
| `IntegrationCredential` | Encrypted runtime credentials | Integrations settings |
| `DeviceCompliancePolicy` | Intune compliance policy definitions | Intune sync |
| `DeviceComplianceAssignment` | Per-device compliance state | Intune sync |
| `DocumentEmbedding` | Embedding metadata (vector col via raw migration) | RAG search |

Optional (depending on MVP scope decision):
| Model | Purpose | Feature |
|-------|---------|---------|
| `DeviceApp` | App inventory per device | Intune sync |

Existing models extended:
- `Device` — `sourceSystem = 'intune'` records gain real data from Graph sync; `complianceState` field already present
- `Document` — gains `DocumentEmbedding` relation
- `User` — gains `passwordHash?` and `role` fields; Entra users continue to work unchanged

---

## Component Boundaries

```
apps/api/src/
  modules/
    auth/           (new) local credential verification, setup status check
    integrations/   (new) IntegrationCredential CRUD, encryption helpers, connection verify
    connectors/
      providers/
        intune.provider.ts    (replace stub with real Graph calls)
        entra.provider.ts     (replace stub with real Graph calls)
    docs/
      docs.rag.ts   (new) RAG pipeline: embed → similarity search → synthesize
    assets/
      asset-health.repository.ts (extend for compliance data join)
  jobs/
    runConnectorSync.ts       (existing — no structural change)
    runDocumentIngest.ts      (new) parse + classify + embed + write output
    watchIngestFolder.ts      (new) chokidar watcher lifecycle
  routes/
    auth.ts                   (extend: setup status + create-admin endpoints)
    integrations.ts           (new)
    ingest.ts                 (new)
    docs.ts                   (extend: rag-search endpoint)

apps/web/src/routes/
  setup/                      (new) SetupPage.tsx — first-run wizard
  integrations/               (new) IntegrationsPage.tsx — settings surface
```

---

## Data Flow: Ingest Pipeline

```
Source folder file added
  → chokidar emits 'add'/'change'
    → runDocumentIngest(filePath)
      → parse text (mammoth / unpdf / native read)
        → call OpenAI: classify kind, generate summary
          → call OpenAI: generate embedding (1536 floats)
            → write organized copy to INGEST_OUTPUT_DIR
              → upsert Document in DB (sourceSystem='local', sourceId=filePath hash)
                → upsert DocumentEmbedding (raw SQL INSERT embedding vector)
                  → AuditEvent written
```

---

## Data Flow: RAG Search

```
POST /api/docs/rag-search { query }
  → requireAuthenticatedSession
    → call OpenAI embeddings API (query → 1536-dim vector)
      → prisma.$queryRaw: SELECT ... ORDER BY embedding <=> $1 LIMIT 5
        → retrieve top-5 DocumentEmbedding + joined Document records
          → build GPT prompt: system context + top-5 excerpts + user query
            → call openai.chat.completions: GPT-4o-mini synthesis
              → return { answer, sources: [{ documentId, title, excerpt }] }
```

---

## Scalability Considerations

| Concern | At current scale (100s of docs) | At 10K docs |
|---------|----------------------------------|------------|
| Vector search | HNSW index handles this trivially | Still fine; HNSW scales well |
| Ingest pipeline | Serial processing per file is fine | May need queue (BullMQ) — defer |
| Graph sync | Single paginated request per entity type | Add delta query support (Graph changeToken) |
| Credential encryption | AES-256-GCM with env key is sufficient | Same; no rotation mechanism needed for solo tool |

---

## Build Order Recommendation

This order respects feature dependencies:

**Phase 1 — Schema and credential foundation**
Build first because all other features depend on DB migrations and the ability to read runtime credentials.
- Prisma migrations: add `User.passwordHash`, `User.role`, `IntegrationCredential`
- `modules/integrations/` credential service with AES-256-GCM encrypt/decrypt
- `GET /api/integrations` + `PUT /api/integrations/:key` routes (no verify yet)
- Make Entra env vars optional in `packages/shared/src/env.ts`

**Phase 2 — First-run bootstrap**
Depends on: User schema change (Phase 1). Unblocks: can now run the app without Entra pre-configuration.
- `LocalAuthProvider` in `auth.ts`
- `GET /api/setup/status`, `POST /api/setup/create-admin`
- `/setup` route in web

**Phase 3 — Integrations settings UI + verify**
Depends on: credential service (Phase 1). Gives the operator a surface to enter Graph and OpenAI credentials before sync runs.
- `IntegrationsPage.tsx`
- `POST /api/integrations/:key/verify` (test live connection to Graph / OpenAI)
- Connector health cards updated to reflect `intune` freshness from real sync

**Phase 4 — Intune sync (live Graph)**
Depends on: credential service (Phase 1) returning Graph credentials at sync time.
- Replace `intune.provider.ts` stub with real Graph calls
- Add `DeviceCompliancePolicy`, `DeviceComplianceAssignment` models
- Extend `asset-health.repository.ts` to surface compliance state

**Phase 5 — Document ingest pipeline**
Depends on: credential service returning OpenAI key (Phase 1). Ingest and RAG are independent of Intune sync.
- `runDocumentIngest.ts`, `watchIngestFolder.ts`
- `POST /api/ingest/trigger`
- Add `INGEST_SOURCE_DIR`, `INGEST_OUTPUT_DIR` to env
- Add `DocumentEmbedding` model + manual pgvector migration

**Phase 6 — RAG search**
Depends on: Document embeddings in DB (Phase 5). Can be partially built in parallel with Phase 5 once the DB model exists.
- `docs.rag.ts` module
- `POST /api/docs/rag-search` endpoint
- Web search UI extended with RAG query mode + answer display

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Exposing raw credentials to the browser
**What:** Returning the actual OpenAI key or Graph client secret from any GET endpoint.
**Why bad:** Credentials visible to any authenticated user, potentially logged.
**Instead:** Return `{ key, configured: boolean, lastVerifiedAt }` — never the value.

### Anti-Pattern 2: Hard-coding Graph credentials in env for sync
**What:** Adding `GRAPH_CLIENT_ID` / `GRAPH_CLIENT_SECRET` to the Zod env schema as required fields.
**Why bad:** Requires a restart to reconfigure; defeats the purpose of the integrations settings UI.
**Instead:** Load from `IntegrationCredential` at sync time. Env vars remain an optional override for deployment scenarios where a settings UI is not desired.

### Anti-Pattern 3: Storing embeddings as JSON arrays in a generic column
**What:** `Json` field on `Document` holding a serialized `number[]`.
**Why bad:** No index, no operator support, O(n) scan for every query.
**Instead:** pgvector `vector(1536)` column with HNSW index via raw migration.

### Anti-Pattern 4: Running the file watcher in a separate process
**What:** Spawning a child process or separate service for `watchIngestFolder`.
**Why bad:** Adds deployment complexity, inter-process communication, and lifecycle management burden for a solo tool.
**Instead:** Start the watcher inside the existing API process after `app.listen()`. Use `app.addHook('onClose')` to stop it cleanly on shutdown.

### Anti-Pattern 5: Bypassing the existing `runConnectorSync` job infrastructure for Intune
**What:** Adding a separate job runner or cron just for Intune.
**Why bad:** Duplicates audit logging, `SyncRun` recording, and freshness state management that already exists.
**Instead:** The real Intune provider replaces only the stub inside `intune.provider.ts`. The `runConnectorSync` wrapper continues to handle all bookkeeping.

---

## Sources

- Prisma pgvector documentation: [Prisma Postgres extensions](https://www.prisma.io/docs/postgres/database/postgres-extensions)
- pgvector GitHub: [pgvector/pgvector](https://github.com/pgvector/pgvector)
- Microsoft Graph Intune API: [Microsoft Learn — Intune devices and apps API overview](https://learn.microsoft.com/en-us/graph/intune-concept-overview)
- Microsoft Graph auth for Intune: [How to Use Microsoft Entra ID to Access Intune APIs](https://learn.microsoft.com/en-us/intune/intune-service/developer/intune-graph-apis)
- OpenAI embeddings: [OpenAI — Vector embeddings](https://developers.openai.com/api/docs/guides/embeddings)
- chokidar: [chokidar on npm](https://www.npmjs.com/package/chokidar)
- mammoth: [mammoth on npm](https://www.npmjs.com/package/mammoth)
- unpdf: [unjs/unpdf on GitHub](https://github.com/unjs/unpdf)
- Prisma pgvector issue tracking: [First class Vector support #26546](https://github.com/prisma/prisma/issues/26546)
