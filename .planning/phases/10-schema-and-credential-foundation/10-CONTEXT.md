# Phase 10: Schema and Credential Foundation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure infrastructure phase — no user-facing features. Lays the database schema and server-side encryption plumbing that every v1.2 feature depends on. Deliverables:

1. `User.passwordHash` and `User.role` fields added via Prisma migration
2. `IntegrationCredential` table with AES-256-GCM encrypted value storage
3. `SystemKey` table for wrapped encryption key management
4. pgvector extension + `DocumentEmbedding` table with HNSW index
5. Entra ID env vars made optional in the Zod schema

Nothing in this phase is visible to the operator. Phases 11–15 all unblock once this is complete.

</domain>

<decisions>
## Implementation Decisions

### Encryption key management
- **D-01:** The AES-256-GCM credential encryption key is wrapped by `SESSION_SECRET` and stored in a new `SystemKey` table — never in `.env` or on disk in plaintext.
- **D-02:** `SystemKey` table has columns: `id`, `purpose` (string, e.g. `"credential_encryption"`), `wrappedKey` (bytes/string), `createdAt`. One row per purpose.
- **D-03:** On first API startup, if no `SystemKey` row exists for `"credential_encryption"`, generate a random 32-byte key, wrap it using `SESSION_SECRET` (AES-GCM or HKDF-then-wrap), and insert the row automatically.
- **D-04:** At runtime, the API loads and unwraps the key from the DB using `SESSION_SECRET` before handling any credential reads or writes.
- **D-05:** Rotating `SESSION_SECRET` requires a re-wrap step (unwrap with old secret, re-wrap with new) — but does NOT invalidate stored credentials. This is the explicit reason for choosing wrapped storage over HKDF derivation.
- **D-06:** Node.js built-in `crypto` module only — no third-party encryption library. Consistent with existing usage in `apps/api/src/plugins/auth.ts`.

### User.role field
- **D-07:** Add `role String?` (nullable string, default `null`) to the `User` model.
- **D-08:** The only valid role value in v1.2 is `"admin"`. No Prisma enum — plain string is sufficient and easy to extend.
- **D-09:** Migration applies `null` as the default for all existing rows. Existing Entra-authenticated users are not retroactively assigned a role — Entra auth is already trusted at the provider level.
- **D-10:** Phase 11 will set `role: "admin"` when creating the local admin account. There is exactly one admin user for this application in v1.2.

### User.passwordHash field
- **D-11:** Add `passwordHash String?` (nullable string) to the `User` model. Null for all Entra users.
- **D-12:** Password hashing algorithm choice is deferred to Phase 11 (where it is used). Phase 10 only adds the column.

### IntegrationCredential table
- **D-13:** One row per integration group — not one row per individual secret field.
- **D-14:** Schema: `id`, `key` (unique string, e.g. `"intune"`, `"openai"`), `encryptedValue` (AES-256-GCM ciphertext of a JSON blob), `iv` (initialization vector), `authTag`, `createdAt`, `updatedAt`.
- **D-15:** The JSON blob for `"intune"` contains `{ tenantId, clientId, clientSecret }`. For `"openai"` it contains `{ apiKey }`.
- **D-16:** `GET /api/integrations/:key` returns `{ configured: boolean }` only — the decrypted value is never sent to the browser under any circumstance. This is a hard security invariant.
- **D-17:** Encryption uses the unwrapped key from `SystemKey` (D-01 through D-04). IV is generated fresh per write.

### DocumentEmbedding table (pgvector)
- **D-18:** Enable the `pgvector` extension in a Prisma migration.
- **D-19:** Target model: `text-embedding-3-small` → vector dimension = **1536**.
- **D-20:** `DocumentEmbedding` schema: `id`, `documentId` (FK → `Document`), `chunkIndex` (Int), `chunkText` (Text), `embedding` (vector(1536)), `createdAt`.
- **D-21:** Create an HNSW index on the `embedding` column for approximate nearest-neighbor search.
- **D-22:** The `embedding` column uses the `@db.Vector(1536)` Prisma unsupported type annotation with raw SQL in the migration for the HNSW index.

### Entra env vars — optional
- **D-23:** In `packages/shared/src/env.ts`, change all four Entra fields to optional:
  - `ENTRA_TENANT_ID: z.string().optional()`
  - `ENTRA_CLIENT_ID: z.string().optional()`
  - `ENTRA_CLIENT_SECRET: z.string().optional()`
  - `ENTRA_REDIRECT_URI: z.string().url().optional()`
- **D-24:** The `ServerEnv` type update will propagate to `MicrosoftEntraAuthProvider` in `auth.ts`. Phase 10 only makes the Zod change — Phase 11 handles the conditional provider initialization so the auth plugin doesn't crash when Entra vars are absent.
- **D-25:** `ENTRA_REDIRECT_URI` is currently used in `completeCallback` to reconstruct the current URL. With it optional, Phase 11 must guard against constructing the `MicrosoftEntraAuthProvider` when vars are absent.

### Claude's Discretion
- Exact wrapping mechanism within AES-GCM (key derivation details, HKDF salt/info values)
- Prisma migration file naming and ordering
- Index tuning parameters for the HNSW index (m, ef_construction) — use Prisma/pgvector defaults

</decisions>

<specifics>
## Specific Ideas

- Security is explicitly a priority for this phase and all subsequent v1.2 phases. Every credential-handling decision should err on the side of more protection, not less.
- The operator manages their own `.env` — keep the number of required secrets low. After this phase, only `SESSION_SECRET` and `DATABASE_URL` are strictly required to start the app.
- "I want the key to be encrypted" — the wrapped-key-in-DB approach (D-01 to D-05) was chosen explicitly to satisfy this preference while keeping the operator experience simple.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and success criteria
- `.planning/ROADMAP.md` §"Phase 10: Schema and Credential Foundation" — Goal, success criteria (4 items), dependency on Phase 7

### Requirements unlocked by this phase
- `.planning/REQUIREMENTS.md` §Bootstrap — BOOT-01, BOOT-02, BOOT-03 (unlocked by User schema changes)
- `.planning/REQUIREMENTS.md` §"Integrations Settings" — CRED-01 through CRED-04 (unlocked by IntegrationCredential + SystemKey)
- `.planning/REQUIREMENTS.md` §"Document Ingest" — INGEST-01 through INGEST-05 (unlocked by DocumentEmbedding)
- `.planning/REQUIREMENTS.md` §"RAG Search" — RAG-01, RAG-02 (unlocked by DocumentEmbedding + pgvector)

### Existing code that this phase modifies
- `prisma/schema.prisma` — Current User model (no role/passwordHash); all existing tables that must not break
- `packages/shared/src/env.ts` — Current Zod schema with required Entra vars (D-23 changes these)
- `apps/api/src/plugins/auth.ts` — Uses `ServerEnv`; `MicrosoftEntraAuthProvider` consumes Entra vars directly (D-24/D-25 note the Phase 11 follow-up needed)

### Security invariants
- `CLAUDE.md` §"Key Security Invariants" — Credentials never reach browser; bootstrap DB-backed guard; session ID regeneration on login

No external specs — all requirements are captured in ROADMAP.md, REQUIREMENTS.md, and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `node:crypto` (`createHmac`, `randomUUID`, `timingSafeEqual`, `createCipheriv`, `createDecipheriv`, `randomBytes`, `hkdfSync`) — already imported/used in `auth.ts`; all AES-GCM and key-wrapping operations should use this module exclusively
- `packages/shared/src/env.ts` `parseServerEnv()` — the single env parse point; D-23 change goes here

### Established Patterns
- Prisma migrations: standard `prisma migrate dev` workflow; migration files live in `prisma/migrations/`
- All models use `cuid()` as primary key `@id @default(cuid())`
- `createdAt DateTime @default(now())` + `updatedAt DateTime @updatedAt` on every mutable model
- Unique constraints use `@@unique([...])` block syntax
- Indexes use `@@index([...])` block syntax

### Integration Points
- `User` model: add `passwordHash String?` and `role String?` fields; existing `@@unique([sourceSystem, sourceId])` constraint and `AuditEvent` relation must be preserved
- `apps/api/src/server.ts` — likely where `SystemKey` startup initialization runs (unwrap or generate key on boot)
- `packages/shared/src/env.ts` — `ServerEnv` type is consumed by `auth.ts`, `server.ts`, and any route that reads env; making fields optional will require downstream null-checks (scoped to Phase 11)

</code_context>

<deferred>
## Deferred Ideas

- Conditional `MicrosoftEntraAuthProvider` initialization when Entra vars are absent — Phase 11 (LocalAuthProvider work)
- Password hashing algorithm selection (bcrypt vs. argon2 vs. scrypt) — Phase 11
- Role-based route guards and middleware — Phase 12
- Re-wrap utility for `SystemKey` when `SESSION_SECRET` is rotated — post-v1.2 operational tooling
- Additional integration credential types beyond `"intune"` and `"openai"` — future milestones

</deferred>

---

*Phase: 10-schema-and-credential-foundation*
*Context gathered: 2026-03-30*
