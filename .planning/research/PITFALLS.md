# Domain Pitfalls: v1.2 Intune Integration

**Domain:** Adding Intune sync, dual auth, credential storage, document ingest pipeline, and RAG search to an existing Node.js/Express/React/PostgreSQL solo IT ops console that already has Entra ID OAuth.
**Researched:** 2026-03-30
**Scope note:** These pitfalls are specific to ADDING these features to an existing system. Greenfield mistakes are excluded where they don't apply to integration work.

---

## Critical Pitfalls

Mistakes in this category cause security incidents, data loss, or forced rewrites.

---

### Pitfall 1: OpenAI API Key or Client Secret Exposed in React Bundle

**What goes wrong:** The OpenAI API key or Intune client secret gets passed from the server to the React app (e.g., through an API response, a `window.__CONFIG__` object, or a Vite/CRA environment variable prefixed `VITE_` or `REACT_APP_`). Anyone who opens DevTools or downloads the JS bundle can extract it.

**Why it happens in an existing system:** The app already has a working API layer, so a developer adds a settings page that returns current credentials to pre-fill the form. The populated fields render from state seeded with the actual key values. Even if the form shows masked asterisks, the underlying React state or Redux store holds the plaintext value reachable via DevTools.

**Consequences:** Stolen OpenAI key runs up unbounded cost. Stolen Intune client secret grants full read (potentially write) access to the tenant's device inventory, compliance policies, and user data. OpenAI has no per-key spending cap enforcement by default—compromise means surprise invoices in the thousands.

**Prevention:**
- Never return stored credential values to the browser in any API response. Return only a presence indicator (`configured: true`) and a masked display (`sk-...xxxx`).
- Store `OPENAI_API_KEY`, `INTUNE_CLIENT_SECRET`, and `INTUNE_TENANT_ID` as server-only environment variables (never prefixed `VITE_` or `REACT_APP_`).
- All OpenAI and Graph API calls happen server-side only. The React app calls your Express routes; those routes proxy to external APIs.
- Settings page form submit sends new values to a write endpoint; it never reads them back.

**Detection:** Run `grep -r "OPENAI\|clientSecret\|tenantId" apps/web/src` — any hit that isn't an import of a server-only module is a leak risk.

**Phase:** v1.2 Phase 10 (Integrations Settings) — enforce this constraint at the settings API design stage before any form is built.

---

### Pitfall 2: Dual Auth Creates a Privilege Bypass Path

**What goes wrong:** The first-run bootstrap creates a local admin account with a separate code path. If the middleware that guards protected routes checks `req.user` without verifying which auth strategy produced it, an attacker who creates a local account after bootstrap (e.g., through an exposed registration endpoint left open) gets the same admin session as the Entra ID admin. Alternatively, the bootstrap endpoint itself remains callable after initial setup, allowing a second admin to be created at any time.

**Why it happens in an existing system:** The existing Entra ID path works; the new local path is added as a parallel case. Session middleware checks `req.user` (truthy) rather than `req.user.role === 'admin'` AND `req.user.source === 'entra'`. The bootstrap route is protected by an `if (!bootstrapComplete)` guard that reads from a config field rather than a locked database record.

**Consequences:** Any user who knows the local login endpoint can attempt brute force or credential stuffing. If the bootstrap route is left open, an attacker creates a second admin account silently.

**Prevention:**
- Use a single `bootstrapCompleted` boolean stored in the database (not in env/config file). Once set to `true` on first successful admin creation, the bootstrap route returns 403 permanently.
- Regenerate the Express session identifier on every successful login regardless of auth strategy — prevents session fixation across the two code paths.
- The local auth path and Entra ID path must both produce a session with identical claims structure and role checks. Do not special-case by auth source in route guards.
- Rate-limit the local login endpoint: max 5 attempts per IP per 15 minutes with bcrypt or argon2 hashing (not SHA-1/MD5).
- Log every local login attempt to the existing audit log.

**Detection:** After bootstrap completes, POST to the bootstrap endpoint should return 403. Verify via test. Check that session IDs rotate on login by comparing `req.sessionID` before and after `req.login()`.

**Phase:** v1.2 Phase 9 (First-Run Bootstrap) — session rotation and bootstrap lockout must be in the initial implementation, not added later.

---

### Pitfall 3: Credentials Stored in Plaintext in the Database

**What goes wrong:** Intune client secret and OpenAI API key are stored as plaintext VARCHAR columns. A SQL injection elsewhere, a database backup exposure, or a developer with read access to production DB sees live credentials.

**Why it happens in an existing system:** The existing app stores connection metadata (tenant IDs, URLs) as plaintext config records. Adding credential storage follows the same pattern without additional thought.

**Consequences:** All credentials in the table are compromised in a single breach. Microsoft tenant credentials in particular give access to device and user data for the entire organization.

**Prevention:**
- Encrypt credential values at rest using AES-256 with a key derived from `CREDENTIAL_ENCRYPTION_KEY` (an env variable, never stored in the DB). Use Node.js `crypto.createCipheriv` / `createDecipheriv` with a random IV stored alongside the ciphertext.
- Store as `{ iv: string, ciphertext: string }` — never the raw secret.
- Do not log the encryption key or decrypted values anywhere in the request/response cycle.
- Express error handler must be in `production` mode (`NODE_ENV=production`) so stack traces never reach the client.

**Detection:** `SELECT * FROM integrations_config` — if you can read a client secret as a human-readable string, it is stored incorrectly.

**Phase:** v1.2 Phase 10 (Integrations Settings) — schema design must include encrypted columns before the first credential is persisted.

---

### Pitfall 4: Graph API Pagination Truncates the Device Inventory

**What goes wrong:** The Intune sync fetches `/deviceManagement/managedDevices` and uses only the first page (default 100 records). The operator sees 100 devices when the tenant has 300. Compliance and asset health data silently misses two-thirds of the fleet.

**Why it happens in an existing system:** The existing network visibility module may already call Graph endpoints but for smaller result sets (sites, WAN links). Copying that pattern to device inventory without adding pagination causes silent truncation.

**Consequences:** Asset health dashboard shows a false "clean" picture. Compliance gaps for unsynced devices are invisible. The operator makes decisions based on incomplete data with no warning.

**Prevention:**
- All Graph list calls must follow `@odata.nextLink` until it is absent. Implement a `graphPageAll(url)` helper that accumulates pages into a single array before returning.
- Log the final device count per sync. Surface a "last sync: N devices" indicator in the UI so the operator can detect anomalies.
- Use `$top=999` (Graph maximum for Intune device list) to minimize round trips, but still handle pagination.
- For incremental updates after the initial full sync, implement delta query (`/deviceManagement/managedDevices/delta`) and persist the `@odata.deltaLink` token. If the delta token expires (Graph returns a base resource URL instead of delta feed), fall back to a full sync and log a warning.

**Detection:** Seed a test tenant with >100 devices. Run sync. Compare DB count to tenant count.

**Phase:** v1.2 Phase 11 (Intune Sync) — pagination helper must be the first thing built, before any domain mapping.

---

### Pitfall 5: Graph API Throttling Causes Silent Sync Failures

**What goes wrong:** The Intune sync fires multiple parallel requests (devices + compliance policies + app inventory) without respecting rate limits. Graph returns HTTP 429. The sync code treats 429 as a fetch error, catches it generically, and marks the sync as failed — or worse, silently discards it and records partial data as complete.

**Why it happens in an existing system:** The existing Graph calls are low-frequency (a few requests per page load). A bulk sync is the first time the app issues 10+ rapid sequential or parallel calls, hitting Intune service limits: 2,000 requests per 20 seconds tenant-wide, 1,000 per app per 20 seconds for reads.

**Consequences:** Sync silently returns incomplete data. Intune sync limits are per-app and per-tenant, so a misfiring sync can also block other Microsoft tooling in the tenant for the throttle window.

**Prevention:**
- Detect 429 responses explicitly. Read `Retry-After` header; if absent, use exponential backoff starting at 1 second, doubling to a max of 60 seconds with jitter.
- Do not fire device list, compliance policy list, and app inventory calls in parallel during initial sync. Sequence them or use Graph's `$batch` endpoint (max 20 requests per batch call).
- Record sync status as `{ state: 'running' | 'succeeded' | 'failed' | 'partial', lastError, deviceCount, syncedAt }` — never silently swallow errors as success.
- Expose sync status and last error in the integrations settings UI so the operator can see throttling events.

**Detection:** Mock 429 responses in unit tests for the Graph client wrapper. Verify retry logic fires and that sync status is recorded as `failed` (not `succeeded`) when retries are exhausted.

**Phase:** v1.2 Phase 11 (Intune Sync).

---

### Pitfall 6: MSAL Token Refresh Fails Silently Under Conditional Access

**What goes wrong:** The server-side MSAL confidential client acquires a token for Graph API calls on behalf of the app registration. In tenants with Conditional Access policies (IP restrictions, compliant device requirements, MFA), the initial token works but silent refresh fails at 3 AM when no interactive session is present. Graph calls start returning 401. Sync fails silently until someone notices stale data.

**Why it happens in an existing system:** The existing Entra ID auth for the web app is user-delegated (user logs in interactively). The Intune sync uses a client credentials flow (app identity). These are separate token acquisition paths. A Conditional Access policy that targets the app registration can block client credentials flow without affecting user sessions.

**Consequences:** Sync stops working in production after tenant CA policy changes. The operator sees stale device data with no clear error message.

**Prevention:**
- Use client credentials flow (`acquireTokenByClientCredential`) for the server-side Intune sync — not on-behalf-of user tokens. Verify the app registration has the correct application permissions (not delegated) granted with admin consent: `DeviceManagementManagedDevices.Read.All`, `DeviceManagementConfiguration.Read.All`.
- Store token acquisition errors in sync status records, not just in server logs.
- Test token acquisition in a fresh process (not relying on a warm in-memory MSAL cache) to catch cold-start failures.
- Document required Graph permissions and CA exclusion requirements in the setup guide so the operator's tenant is configured correctly before the first sync.

**Phase:** v1.2 Phase 11 (Intune Sync) and Phase 10 (Integrations Settings connection health check).

---

## Moderate Pitfalls

Mistakes in this category produce incorrect behavior, degraded UX, or maintenance burden without necessarily being security incidents.

---

### Pitfall 7: File Watcher Leaks on Windows or Reregisters on Every App Restart

**What goes wrong:** The watch-folder ingest uses chokidar without calling `.close()` on app shutdown. On Windows, the underlying `fs.watch` handle stays open. After a few restarts (common in development with nodemon, or in production after crashes), memory climbs and file events may fire multiple times for the same change.

**Why it happens:** Node.js process managers restart the app process but the watcher reference is not stored anywhere accessible to a shutdown signal handler. On Windows, chokidar's `usePolling: false` default uses `ReadDirectoryChangesW` which can behave inconsistently for network drives or deep folder trees.

**Consequences:** Duplicate ingest events cause the same document to be parsed, embedded, and inserted into the vector store multiple times. Memory bloat. On large folders, chokidar has documented issues consuming 400MB+ RAM on Windows.

**Prevention:**
- Store the chokidar watcher instance as a module-level singleton. Register `SIGTERM` and `SIGINT` handlers that call `watcher.close()` before process exit.
- For the ingest watch folder specifically, scope the watcher to a single flat directory (the designated source folder), not a recursive tree — this dramatically reduces handle count.
- On Windows specifically, test with `usePolling: true` and a 2-second interval as a fallback if `ReadDirectoryChangesW` misbehaves for the deployment path (e.g., a mapped network drive or WSL path).
- Implement a processing lock per file path (keyed on `path + mtime`) to deduplicate events that fire twice within a short window.

**Detection:** Start the app, let the watcher initialize, restart it 5 times rapidly, then check handle count via `process._getActiveHandles().length`.

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline).

---

### Pitfall 8: PDF and DOCX Parsing Fails on Real-World Files Without Graceful Fallback

**What goes wrong:** The ingest pipeline parses cleanly in development with test documents. In production, the operator drops in a scanned PDF (image-only, no text layer), a DOCX with tracked changes or embedded objects, or a file with a non-UTF-8 encoding. The parser throws an unhandled exception, the entire ingest job crashes, and the file is either retried in an infinite loop or silently dropped.

**Why it happens:** Libraries like `pdf-parse` fail on encrypted PDFs, PDFs with no text layer (scanned images), and some PDFs with custom fonts or ligatures. `mammoth` for DOCX handles most standard documents but throws on files with complex embedded content or corrupted zip streams (DOCX is a ZIP internally).

**Consequences:** One bad file blocks or crashes the entire watch-folder pipeline. The operator has no visibility into which files failed or why.

**Prevention:**
- Wrap every parse call in a try/catch that catches both synchronous throws and rejected promises. On failure, record a parse error in the database with the file path, error message, and timestamp — never drop silently.
- Implement a `status` field on ingest records: `pending | parsing | parsed | embedding | embedded | failed`. Failed files are visible in the UI and do not block processing of subsequent files.
- For PDFs: detect zero-length extracted text (indicating a scanned image) and record as `needs_ocr` rather than `failed`. Do not attempt OCR in v1.2 — flag it and move on.
- For DOCX: catch ZIP-level errors separately from content-level errors. A corrupt DOCX should fail that file cleanly, not crash the parser process.
- Test with: a password-protected PDF, a scanned-image-only PDF, a DOCX with tracked changes, a DOCX with an embedded Excel object, and a file with a `.docx` extension that is actually an RTF or HTML file.

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline).

---

### Pitfall 9: Re-Embedding the Entire Document Corpus on Every Schema or Model Change

**What goes wrong:** The embedding model or chunk size is changed after the initial corpus is built. Existing embeddings in `pgvector` were generated with `text-embedding-3-small` at 1,536 dimensions. New embeddings use a different model or size. The vectors are now mismatched — old and new embeddings in the same column cannot be meaningfully compared because they live in different geometric spaces.

**Why it happens:** The embedding model is chosen quickly early on. After seeing poor search results, the team upgrades to `text-embedding-3-large` (3,072 dimensions) or switches to a different model. The migration path is not obvious.

**Consequences:** Vector similarity search returns nonsensical rankings. No error is thrown — the math runs but produces garbage results. The operator loses confidence in search without knowing why.

**Prevention:**
- Store `embedding_model` and `embedding_dimensions` as columns on the document chunk record, not as app-level constants. This makes future migrations detectable.
- Design the schema from the start with a `chunk_embeddings` table that is separate from `document_chunks`. When the model changes, the old embedding table can be rebuilt in the background without disrupting reads.
- For v1.2: commit to `text-embedding-3-small` (1,536 dimensions, $0.02/1M tokens) and do not mix models in the same vector column.
- If a model change is needed later: rebuild all embeddings before switching the query path, do not run mixed-model searches.

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline) — schema design.

---

### Pitfall 10: Chunking Strategy Produces Fragments Too Small for Useful RAG Context

**What goes wrong:** Documents are split into very small chunks (sentence-level or semantic micro-segments averaging 40–80 tokens) because "finer granularity = better retrieval." Retrieved chunks lack enough context for the LLM to give a complete answer. The LLM hallucinates the missing context because the retrieved fragment is technically relevant but incomplete.

**Why it happens:** Semantic chunking tools generate small fragments. There is appeal to "retrieve exactly the right sentence." In practice, a 43-token average chunk retrieved well in isolation but gave the LLM insufficient context — a 2026 benchmark placed semantic chunking at 54% end-to-end accuracy vs 69% for recursive 512-token splitting.

**Consequences:** RAG search answers are plausible-sounding but incomplete or incorrect. The operator uses a wrong recovery procedure or misses a key constraint in a SOP document.

**Prevention:**
- Use recursive character splitting with a target chunk size of 400–600 tokens and a 10–15% overlap (50–80 tokens). This is the established baseline that beats semantic chunking in production benchmarks as of early 2026.
- Store `chunk_index` and `source_document_id` on every chunk so retrieved chunks can be expanded to adjacent context before being sent to the LLM.
- Do not use sentence-level chunking for technical documents (SOPs, recovery procedures). These documents are dense with conditional logic that requires multi-sentence context to interpret correctly.

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline).

---

### Pitfall 11: RAG Search Hallucinates and Citations Are Unfalsifiable

**What goes wrong:** The RAG query returns retrieved chunks to GPT-4 and asks it to synthesize an answer. The LLM uses the retrieved context but supplements it with training knowledge, producing an answer that blends real document content with invented detail. No citation mechanism tells the operator which parts came from documents versus model knowledge. A recovery procedure answer sounds authoritative but contains a step that is not in any document.

**Why it happens:** RAG reduces but does not eliminate hallucination. The LLM can still synthesize around source material, especially when retrieved chunks are incomplete or the query has no matching document content. This is well-established: RAG reduces hallucination rates by 60–80% in production, meaning 20–40% of responses may still contain hallucinated elements.

**Consequences:** In an IT ops context, a hallucinated recovery procedure step could cause data loss or an extended outage. The operator has no way to verify which claims came from documents.

**Prevention:**
- Always return source citations alongside every RAG answer: document name, chunk text, and similarity score. Display them in the UI so the operator can click through to the source document.
- Constrain the system prompt: instruct the LLM to answer only from the provided context and to explicitly state "I could not find this in the available documents" when context is insufficient. Do not allow the model to use training knowledge as a supplement.
- Implement a keyword search fallback: when vector similarity scores are all below a threshold (e.g., cosine similarity < 0.75), fall back to the existing keyword search rather than sending low-confidence chunks to the LLM.
- For v1.2, do not present RAG answers as authoritative without the citation panel. Surface the retrieved chunks to the operator alongside the synthesized answer.

**Phase:** v1.2 Phase 13 (RAG Search).

---

### Pitfall 12: OpenAI Embedding Costs Blow Out During Bulk Re-Ingest

**What goes wrong:** A change to the chunking strategy, a chunk size correction, or a discovered bug in the parser triggers a full re-ingest of all documents. Every chunk is re-embedded via the OpenAI API. For a corpus of 500 documents averaging 20,000 tokens each, a full re-embed costs roughly $0.20 (at $0.02/1M tokens for `text-embedding-3-small`) — negligible. But if the corpus grows, if `text-embedding-3-large` is used (6.5x more expensive), or if re-ingest is triggered accidentally on every app startup, costs accumulate.

**Why it happens:** Re-ingest is triggered accidentally when the ingest pipeline lacks idempotency checks. If the file watcher fires on startup for all existing files (e.g., chokidar's `add` event fires for pre-existing files when `ignoreInitial: false`), every document is re-embedded on every restart.

**Consequences:** Unexpected OpenAI invoice. Vector store accumulates duplicate chunks that degrade search quality.

**Prevention:**
- Set `ignoreInitial: true` on the chokidar watcher. Only `add` events for genuinely new files since the last watcher start should trigger ingest.
- Track ingest state per file using a hash of the file path + mtime (or content hash). Skip embedding if the hash matches an already-embedded record.
- Only re-embed a document chunk if the chunk content has changed or the embedding model version has changed. Store `model_version` on each chunk row.
- Never call the embedding API from the watch event handler directly. Queue the job and process it with deduplication (reject duplicate job IDs).

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline).

---

### Pitfall 13: pgvector Index Not Created Before Production Load

**What goes wrong:** The `vector` column is added to the `document_chunks` table and queries work correctly in development with 50 documents. At 5,000+ chunks, queries without an HNSW or IVFFlat index perform a sequential scan — every query does a full table scan comparing all vectors. Query time goes from milliseconds to seconds.

**Why it happens:** pgvector works without an index (it falls back to exact search). Development data sets are too small to expose the performance cliff.

**Consequences:** RAG search becomes unusably slow as the corpus grows. Adding the index after-the-fact on a populated table requires an exclusive lock and can block the API for seconds to minutes depending on corpus size.

**Prevention:**
- Create the HNSW index in the migration that adds the vector column: `CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)`.
- Use `vector_cosine_ops` (cosine distance) to match the `<=>` operator used in queries — mismatched operator class silently falls back to sequential scan.
- Note: NULL vectors and zero vectors are not indexed. Validate that no chunk produces a null embedding before insert.
- Default `hnsw.ef_search = 40` is appropriate for v1.2 scale. Tune to 100 if recall degrades with a larger corpus.

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline) — migration.

---

## Minor Pitfalls

---

### Pitfall 14: Session Store Not Persistent Across App Restarts

**What goes wrong:** The existing app uses an in-memory session store (the default for `express-session`). After adding first-run bootstrap, local login sessions are lost on every app restart. The operator has to log in again after every deployment. With the Entra ID flow this is less noticeable (the browser retains the OAuth cookie), but for the local admin path it is a worse experience.

**Prevention:** Use `connect-pg-simple` or equivalent to persist sessions in PostgreSQL. This is likely already needed given the existing Entra ID auth — verify the current session store implementation before the bootstrap work begins.

**Phase:** v1.2 Phase 9 (First-Run Bootstrap).

---

### Pitfall 15: Integration Settings "Test Connection" Button Leaks Timing Information

**What goes wrong:** The "Test Connection" button for Intune credentials calls the Graph API and returns `{ success: true/false, error: "..." }` to the browser. Detailed error messages (e.g., "AADSTS700016: Application with identifier 'xxx' was not found in the tenant") expose tenant metadata to the browser. While the operator is the only user, this information should not be in browser-accessible API responses in case of XSS or log scraping.

**Prevention:** Return only `{ success: boolean, hint: 'check_tenant_id' | 'check_client_secret' | 'insufficient_permissions' | 'network_error' }` from the test-connection endpoint. Log the full error server-side.

**Phase:** v1.2 Phase 10 (Integrations Settings).

---

### Pitfall 16: Watch Folder and Output Folder Are the Same Directory

**What goes wrong:** The operator configures the ingest source folder and output folder as the same path. Processed files are written back into the source folder. The file watcher picks them up again and re-ingests them in a loop.

**Prevention:** Validate at save time that source and output paths are not identical and not parent/child of each other. Block save with a clear error message.

**Phase:** v1.2 Phase 12 (Document Ingest Pipeline).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| First-Run Bootstrap (Phase 9) | Bootstrap endpoint stays open after initial admin created | Database-backed `bootstrapCompleted` flag; 403 after first use |
| First-Run Bootstrap (Phase 9) | Session fixation across local and Entra ID paths | Regenerate session ID on every login in both strategies |
| Integrations Settings (Phase 10) | Credentials returned to browser in settings GET response | Return `configured: true` only; never the secret value |
| Integrations Settings (Phase 10) | Secrets stored as plaintext in DB | Encrypt at rest with AES-256 + env-stored key |
| Intune Sync (Phase 11) | Only first page of 100 devices fetched | Implement `graphPageAll()` helper before any domain mapping |
| Intune Sync (Phase 11) | 429 throttle treated as generic error | Explicit 429 detection, Retry-After respect, exponential backoff |
| Intune Sync (Phase 11) | Delta token expiry causes silent partial sync | Detect base-resource fallback; trigger full sync + log warning |
| Document Ingest (Phase 12) | File watcher not closed on shutdown; duplicates on restart | Module-level singleton; `SIGTERM` handler calls `watcher.close()` |
| Document Ingest (Phase 12) | Bad PDF/DOCX crashes entire pipeline | Per-file try/catch; `status: 'failed'` record; never block queue |
| Document Ingest (Phase 12) | Re-embed on every restart due to `ignoreInitial: false` | Set `ignoreInitial: true`; hash-based deduplication |
| Document Ingest (Phase 12) | pgvector column without HNSW index | Create index in the migration; `vector_cosine_ops` operator class |
| Document Ingest (Phase 12) | Mixed embedding models in same vector column | Store `embedding_model` per chunk; rebuild before switching |
| RAG Search (Phase 13) | LLM supplements retrieved context with training knowledge | System prompt constraint; citation panel mandatory in UI |
| RAG Search (Phase 13) | Low-quality retrieval sent to LLM anyway | Cosine similarity threshold; fallback to keyword search below threshold |

---

## Sources

- [A Beginners Guide to Microsoft Graph API Rate Limiting in Intune - MSEndpointMgr](https://msendpointmgr.com/2025/11/08/graph-api-rate-limiting-in-intune/) — HIGH confidence (official community, 2025)
- [Microsoft Graph Throttling Limits - Microsoft Learn](https://learn.microsoft.com/en-us/graph/throttling-limits) — HIGH confidence (official)
- [Paging Microsoft Graph Data - Microsoft Learn](https://learn.microsoft.com/en-us/graph/paging) — HIGH confidence (official)
- [Use Delta Query to Track Changes - Microsoft Learn](https://learn.microsoft.com/en-us/graph/delta-query-overview) — HIGH confidence (official)
- [Acquire and Cache Tokens with MSAL - Microsoft Learn](https://learn.microsoft.com/en-us/entra/identity-platform/msal-acquire-cache-tokens) — HIGH confidence (official)
- [Stop Leaking API Keys: The BFF Pattern Explained - GitGuardian](https://blog.gitguardian.com/stop-leaking-api-keys-the-backend-for-frontend-bff-pattern-explained/) — HIGH confidence (verified against multiple sources)
- [RAG in Production 2026: Chunking Strategies, Embedding Costs - abhs.in](https://www.abhs.in/blog/rag-in-production-chunking-retrieval-cost-developers-2026) — MEDIUM confidence (blog, aligns with benchmark data)
- [Best Chunking Strategies for RAG 2026 - Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag) — MEDIUM confidence (cross-referenced with benchmark studies)
- [How Poor Chunking Increases AI Costs and Weakens Accuracy - LogRocket](https://blog.logrocket.com/product-management/ai-chunking-cost-accuracy) — MEDIUM confidence
- [Hallucination Mitigation for RAG LLMs: A Review - MDPI Mathematics 2025](https://www.mdpi.com/2227-7390/13/5/856) — HIGH confidence (peer-reviewed)
- [OAuth Common Vulnerabilities - Doyensec Blog 2025](https://blog.doyensec.com/2025/01/30/oauth-common-vulnerabilities.html) — MEDIUM confidence (security research)
- [SSO Security Risks: Session Fixation and Reauthentication Bypass - sec.co](https://sec.co/blog/sso-security-risks-session-fixation-reauthentication-bypass) — MEDIUM confidence
- [Do Not Use Secrets in Environment Variables - nodejs-security.com](https://www.nodejs-security.com/blog/do-not-use-secrets-in-environment-variables-and-here-is-how-to-do-it-better) — MEDIUM confidence
- [Are Environment Variables Still Safe for Secrets in 2026 - Security Boulevard](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/) — MEDIUM confidence
- [Chokidar GitHub Issues: Memory and Windows Performance](https://github.com/paulmillr/chokidar/issues/1162) — HIGH confidence (primary source, reproducible issues)
- [pgvector GitHub - Open Source Vector Similarity Search](https://github.com/pgvector/pgvector) — HIGH confidence (official)
- [pgvector Complete Guide 2026 - Calmops](https://calmops.com/database/postgresql/postgresql-vector-search-pgvector-complete-guide-2026/) — MEDIUM confidence
- [OpenAI Embeddings Pricing Calculator - CostGoat](https://costgoat.com/pricing/openai-embeddings) — MEDIUM confidence (pricing, verify against OpenAI dashboard)
