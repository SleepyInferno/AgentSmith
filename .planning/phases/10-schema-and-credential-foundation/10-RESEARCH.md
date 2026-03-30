# Phase 10: Schema and Credential Foundation - Research

**Researched:** 2026-03-30
**Domain:** Prisma migrations, AES-256-GCM key wrapping, pgvector/HNSW, Zod schema optionals
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Encryption key management**
- D-01: The AES-256-GCM credential encryption key is wrapped by `SESSION_SECRET` and stored in a new `SystemKey` table — never in `.env` or on disk in plaintext.
- D-02: `SystemKey` table has columns: `id`, `purpose` (string, e.g. `"credential_encryption"`), `wrappedKey` (bytes/string), `createdAt`. One row per purpose.
- D-03: On first API startup, if no `SystemKey` row exists for `"credential_encryption"`, generate a random 32-byte key, wrap it using `SESSION_SECRET` (AES-GCM or HKDF-then-wrap), and insert the row automatically.
- D-04: At runtime, the API loads and unwraps the key from the DB using `SESSION_SECRET` before handling any credential reads or writes.
- D-05: Rotating `SESSION_SECRET` requires a re-wrap step (unwrap with old secret, re-wrap with new) — but does NOT invalidate stored credentials. This is the explicit reason for choosing wrapped storage over HKDF derivation.
- D-06: Node.js built-in `crypto` module only — no third-party encryption library. Consistent with existing usage in `apps/api/src/plugins/auth.ts`.

**User.role field**
- D-07: Add `role String?` (nullable string, default `null`) to the `User` model.
- D-08: The only valid role value in v1.2 is `"admin"`. No Prisma enum — plain string is sufficient and easy to extend.
- D-09: Migration applies `null` as the default for all existing rows. Existing Entra-authenticated users are not retroactively assigned a role.
- D-10: Phase 11 will set `role: "admin"` when creating the local admin account.

**User.passwordHash field**
- D-11: Add `passwordHash String?` (nullable string) to the `User` model. Null for all Entra users.
- D-12: Password hashing algorithm choice is deferred to Phase 11.

**IntegrationCredential table**
- D-13: One row per integration group — not one row per individual secret field.
- D-14: Schema: `id`, `key` (unique string), `encryptedValue` (AES-256-GCM ciphertext of a JSON blob), `iv` (initialization vector), `authTag`, `createdAt`, `updatedAt`.
- D-15: The JSON blob for `"intune"` contains `{ tenantId, clientId, clientSecret }`. For `"openai"` it contains `{ apiKey }`.
- D-16: `GET /api/integrations/:key` returns `{ configured: boolean }` only — never the decrypted value.
- D-17: Encryption uses the unwrapped key from `SystemKey`. IV is generated fresh per write.

**DocumentEmbedding table (pgvector)**
- D-18: Enable the `pgvector` extension in a Prisma migration.
- D-19: Target model: `text-embedding-3-small` → vector dimension = 1536.
- D-20: `DocumentEmbedding` schema: `id`, `documentId` (FK → `Document`), `chunkIndex` (Int), `chunkText` (Text), `embedding` (vector(1536)), `createdAt`.
- D-21: Create an HNSW index on the `embedding` column for approximate nearest-neighbor search.
- D-22: The `embedding` column uses the `Unsupported("vector(1536)")` Prisma type annotation with raw SQL in the migration for the HNSW index.

**Entra env vars — optional**
- D-23: In `packages/shared/src/env.ts`, change all four Entra fields to optional: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI`.
- D-24: The `ServerEnv` type update will propagate to `MicrosoftEntraAuthProvider` in `auth.ts`. Phase 10 only makes the Zod change — Phase 11 handles conditional provider initialization.
- D-25: `ENTRA_REDIRECT_URI` is used in `completeCallback` to reconstruct the URL. Phase 11 must guard against constructing `MicrosoftEntraAuthProvider` when vars are absent.

### Claude's Discretion
- Exact wrapping mechanism within AES-GCM (key derivation details, HKDF salt/info values)
- Prisma migration file naming and ordering
- Index tuning parameters for the HNSW index (m, ef_construction) — use Prisma/pgvector defaults

### Deferred Ideas (OUT OF SCOPE)
- Conditional `MicrosoftEntraAuthProvider` initialization when Entra vars are absent — Phase 11
- Password hashing algorithm selection (bcrypt vs. argon2 vs. scrypt) — Phase 11
- Role-based route guards and middleware — Phase 12
- Re-wrap utility for `SystemKey` when `SESSION_SECRET` is rotated — post-v1.2
- Additional integration credential types beyond `"intune"` and `"openai"` — future milestones
</user_constraints>

---

## Summary

Phase 10 is a pure infrastructure phase with five concrete work items: two Prisma `User` field additions, two new Prisma model additions (`IntegrationCredential`, `SystemKey`), one migration-heavy pgvector + `DocumentEmbedding` addition, and one Zod schema change. None of these produce any user-facing UI. All five are independently testable and can be shipped in a single migration wave.

The most technically complex item is the pgvector + HNSW setup. Prisma does not support the `vector` type natively — the field must be declared as `Unsupported("vector(1536)")` in `schema.prisma`, and the HNSW index must be written as raw SQL in the migration file using the `--create-only` workflow. The pgvector extension itself is installed via `CREATE EXTENSION IF NOT EXISTS vector` in the same migration.

The encryption infrastructure (SystemKey wrapping) uses only `node:crypto`, which is confirmed available (Node 25.8.1 on this machine). Both `hkdfSync` and `createCipheriv`/`createDecipheriv` with `aes-256-gcm` are verified working. The wrapping pattern — derive a wrapping key from `SESSION_SECRET` via HKDF, then use AES-256-GCM to wrap/unwrap the 32-byte data key stored in the DB — is straightforward with the existing codebase patterns.

The Zod change is mechanical: four `.optional()` calls in `packages/shared/src/env.ts`. This will propagate a TypeScript change to `ServerEnv`, causing type errors in `auth.ts` at the four `env.ENTRA_*` access sites. These must be noted as follow-up for Phase 11 (which is explicitly scoped to handle them) — Phase 10 should suppress or guard them minimally so the build does not break.

**Primary recommendation:** Execute as three sequential migration files plus one Zod edit. Migration 1: User field additions. Migration 2: IntegrationCredential + SystemKey tables. Migration 3: pgvector extension + DocumentEmbedding table + HNSW index (requires `--create-only` to add raw SQL).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `prisma` | 6.6.0 (project pin) | Migration runner, schema DSL | Already in use; all existing migrations use this |
| `@prisma/client` | 6.6.0 (project pin) | DB client for new models | Already in use |
| `node:crypto` | built-in (Node 25.x) | AES-256-GCM, HKDF, randomBytes | D-06 decision; already used in `auth.ts` |
| `zod` | existing (shared pkg) | Env schema validation | Already in `packages/shared/src/env.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pgvector` | 0.2.1 (latest) | `toSql()` / vector type helpers for Prisma raw queries | Required for Phase 14/15 runtime vector ops; Phase 10 only needs the DB extension and schema — install now so it is available |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:crypto` for key wrapping | `libsodium-wrappers` | D-06 locks this — node:crypto only |
| Prisma `postgresqlExtensions` preview | Manual migration SQL | Preview feature is not stable in Prisma 6; manual migration is the verified approach |
| `Unsupported("vector(1536)")` type | Custom scalar via Prisma extension | Extension approach adds complexity; `Unsupported` + raw SQL is the pgvector-node documented pattern |

**Installation:**

```bash
# Install pgvector helper (needed for Phase 14/15 query-time use; harmless to install now)
npx pnpm --filter @agentsmith/api add pgvector
```

No other new packages required for Phase 10.

**Version verification:**

```bash
npm view pgvector version   # 0.2.1 confirmed 2026-03-30
npm view prisma version     # 7.6.0 latest; project pins 6.6.0 — do not upgrade
```

---

## Architecture Patterns

### Recommended File Layout for Phase 10 Changes

```
prisma/
├── schema.prisma                    # Add 5 model changes (see below)
└── migrations/
    ├── [existing migrations]
    ├── YYYYMMDD_HHMMSS_user_auth_fields/
    │   └── migration.sql            # ALTER TABLE for passwordHash + role
    ├── YYYYMMDD_HHMMSS_integration_credential_system_key/
    │   └── migration.sql            # CREATE TABLE for IntegrationCredential + SystemKey
    └── YYYYMMDD_HHMMSS_pgvector_document_embedding/
        └── migration.sql            # CREATE EXTENSION + CREATE TABLE + HNSW index

apps/api/src/
└── lib/
    └── credential-crypto.ts         # New: AES-GCM encrypt/decrypt + key wrap/unwrap

packages/shared/src/
└── env.ts                           # Change: 4 Entra fields → .optional()
```

### Pattern 1: Prisma Migration for Nullable Fields

**What:** Add `passwordHash String?` and `role String?` to the `User` model. Prisma generates an `ALTER TABLE` that adds nullable columns with no default — existing rows get `NULL`.
**When to use:** Any time adding optional fields to an existing table with rows.

```prisma
// In schema.prisma — append to User model
model User {
  // ... existing fields unchanged ...
  passwordHash String?
  role         String?
}
```

Generated migration SQL (Prisma produces this automatically):

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT,
                   ADD COLUMN "role" TEXT;
```

Confidence: HIGH (standard Prisma behavior, verified against existing schema.prisma).

### Pattern 2: New Table with Unique Constraint

**What:** `IntegrationCredential` and `SystemKey` tables follow the same cuid + timestamps convention used by every other model in the schema.
**When to use:** Any new model in this project.

```prisma
// Source: existing schema.prisma conventions
model IntegrationCredential {
  id             String   @id @default(cuid())
  key            String   @unique
  encryptedValue String   @db.Text
  iv             String
  authTag        String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model SystemKey {
  id         String   @id @default(cuid())
  purpose    String   @unique
  wrappedKey String   @db.Text
  createdAt  DateTime @default(now())
}
```

Note: `SystemKey` has no `updatedAt` because the re-wrap operation (D-05) is post-v1.2 and the table is append/replace-by-purpose, not mutated in place.

### Pattern 3: pgvector Migration — Create-Only Workflow

**What:** pgvector extension activation and HNSW index cannot be expressed in Prisma schema DSL. Use `--create-only`, then hand-edit the migration SQL.
**When to use:** Whenever a migration requires raw SQL that Prisma cannot generate.

Step 1 — Add model to schema.prisma:

```prisma
model DocumentEmbedding {
  id         String                      @id @default(cuid())
  documentId String
  document   Document                    @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex Int
  chunkText  String                      @db.Text
  embedding  Unsupported("vector(1536)")?
  createdAt  DateTime                    @default(now())

  @@index([documentId])
}
```

Also add relation field to `Document` model:

```prisma
model Document {
  // ... existing fields ...
  embeddings DocumentEmbedding[]
}
```

Step 2 — Generate migration without applying:

```bash
npx prisma migrate dev --create-only --name pgvector_document_embedding
```

Step 3 — Edit the generated `migration.sql` to prepend extension creation and append index creation:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable (Prisma-generated content stays here unchanged)
CREATE TABLE "DocumentEmbedding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (standard FK index — Prisma-generated)
CREATE INDEX "DocumentEmbedding_documentId_idx" ON "DocumentEmbedding"("documentId");

-- AddForeignKey (Prisma-generated)
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HNSW index for approximate nearest-neighbor search (raw SQL — not Prisma-managed)
CREATE INDEX ON "DocumentEmbedding" USING hnsw (embedding vector_cosine_ops);
```

Step 4 — Apply:

```bash
npx prisma migrate dev
```

Confidence: HIGH (verified against pgvector-node README and Prisma unsupported features docs).

### Pattern 4: AES-256-GCM Key Wrapping with node:crypto

**What:** Derive a wrapping key from `SESSION_SECRET` via HKDF, then use AES-256-GCM to wrap (encrypt) and unwrap (decrypt) the 32-byte data key stored in `SystemKey.wrappedKey`.
**When to use:** Boot-time key initialization and every credential read/write.

```typescript
// Source: node:crypto built-in — verified working Node 25.x
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const WRAP_ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;     // 256-bit data key
const IV_LENGTH = 12;      // 96-bit IV for GCM

/** Derive a stable 32-byte wrapping key from SESSION_SECRET using HKDF. */
function deriveWrappingKey(sessionSecret: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", sessionSecret, Buffer.alloc(32), "agentsmith-system-key-wrap", KEY_LENGTH)
  );
}

/** Wrap (encrypt) a 32-byte data key. Returns hex-encoded "iv:authTag:ciphertext". */
export function wrapKey(sessionSecret: string, dataKey: Buffer): string {
  const wrappingKey = deriveWrappingKey(sessionSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(WRAP_ALGORITHM, wrappingKey, iv);
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Unwrap (decrypt) a wrapped key produced by wrapKey(). */
export function unwrapKey(sessionSecret: string, wrapped: string): Buffer {
  const [ivHex, authTagHex, encryptedHex] = wrapped.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) throw new Error("Malformed wrapped key");
  const wrappingKey = deriveWrappingKey(sessionSecret);
  const decipher = createDecipheriv(WRAP_ALGORITHM, wrappingKey, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
}
```

Separate encrypt/decrypt functions for `IntegrationCredential.encryptedValue` follow the same pattern but accept the unwrapped data key as input and always generate a fresh IV.

Confidence: HIGH (node:crypto APIs verified working in current Node environment).

### Pattern 5: Zod Optional Fields

**What:** Make all four Entra env vars optional in `packages/shared/src/env.ts`.
**When to use:** Making previously required environment variables conditional.

```typescript
// Before (current state)
ENTRA_TENANT_ID: z.string(),
ENTRA_CLIENT_ID: z.string(),
ENTRA_CLIENT_SECRET: z.string(),
ENTRA_REDIRECT_URI: z.string().url(),

// After (Phase 10 change)
ENTRA_TENANT_ID: z.string().optional(),
ENTRA_CLIENT_ID: z.string().optional(),
ENTRA_CLIENT_SECRET: z.string().optional(),
ENTRA_REDIRECT_URI: z.string().url().optional(),
```

This changes the `ServerEnv` type from `string` to `string | undefined` for these four fields. The immediate consequence is TypeScript errors in `auth.ts` at:
- `MicrosoftEntraAuthProvider` constructor: `this.env.ENTRA_TENANT_ID` — now `string | undefined`
- `buildAuthorizationUrl`: `this.env.ENTRA_REDIRECT_URI` — now `string | undefined`
- `getConfiguration`: `this.env.ENTRA_CLIENT_ID`, `this.env.ENTRA_CLIENT_SECRET` — now `string | undefined`
- `createDevBypassAuthService` parameter type if it uses `Pick<ServerEnv, ...>` — unaffected

These TypeScript errors are Phase 11 scope (D-24/D-25). Phase 10 must ensure the build does not fail. The minimal fix is to add non-null assertions (`!`) on the four call sites in `auth.ts` with a comment noting Phase 11 will replace with proper guards.

Confidence: HIGH (verified against current `env.ts` and `auth.ts` source).

### Anti-Patterns to Avoid

- **Deriving the data key from SESSION_SECRET directly via HKDF on every request:** The user explicitly chose wrapped-key-in-DB so that `SESSION_SECRET` rotation does not invalidate stored credentials (D-05). If you HKDF-derive, rotation breaks all stored credentials.
- **Storing IV or authTag as separate binary columns of fixed length:** Store as hex or base64 strings in `Text` columns. Binary storage works but adds complexity with Prisma's raw query interface.
- **Running `prisma migrate dev` without `--create-only` for the pgvector migration:** Prisma will generate the migration SQL without the `CREATE EXTENSION` or HNSW index, and applying it without those will leave the extension uninstalled and the index missing.
- **Generating all schema changes in a single migration:** Splitting into logical units (User fields / credential tables / pgvector) makes rollback cleaner and each migration independently reviewable.
- **Using `@@index` block syntax for the HNSW index in schema.prisma:** Prisma does not know about HNSW. The index must live only in raw migration SQL — do not try to represent it in the Prisma schema.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vector similarity queries | Custom distance function | `pgvector` extension + `$queryRaw` with `<->` / `<=>` operators | pgvector is the standard PostgreSQL extension; hand-rolled cosine similarity in app code is orders of magnitude slower |
| HKDF key derivation | Manual HMAC-based KDF | `crypto.hkdfSync` (built-in) | Node has a standards-compliant implementation; hand-rolled KDFs have subtle security bugs |
| AES-GCM authentication tag handling | Manual MAC verification | `cipher.getAuthTag()` / `decipher.setAuthTag()` (built-in) | GCM auth tag is non-negotiable for ciphertext integrity; manual MAC add-on is error-prone |
| Prisma migration for unsupported types | Custom migration runner | `prisma migrate dev --create-only` + hand-edit SQL | Prisma tracks migration state in `_prisma_migrations`; bypassing this breaks `migrate deploy` |

**Key insight:** The Node.js `crypto` module covers everything needed for this phase. Adding any third-party encryption library would be a project-rule violation (D-06) and introduces supply-chain risk.

---

## Runtime State Inventory

This is a schema and configuration change phase. There are no renames or string replacements.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No existing IntegrationCredential or SystemKey rows; no DocumentEmbedding rows | None — new tables |
| Live service config | No external services reference the new tables | None |
| OS-registered state | None | None |
| Secrets/env vars | `SESSION_SECRET` is already required and present; Entra vars become optional but still work if present | Zod schema change only — no key rename |
| Build artifacts | `@prisma/client` dist must be regenerated after schema changes | Run `prisma generate` after each migration |

---

## Common Pitfalls

### Pitfall 1: pgvector Extension Not Installed on Server

**What goes wrong:** `CREATE EXTENSION IF NOT EXISTS vector` silently fails or errors if the `pgvector` shared library is not installed at the OS level in the PostgreSQL installation.
**Why it happens:** pgvector is a PostgreSQL extension that requires a compiled `.so` file on the server. It is not bundled with PostgreSQL itself.
**How to avoid:** Verify pgvector is available before running the migration: `PGPASSWORD=... psql -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"`. If not present, install it (e.g., `sudo apt install postgresql-16-pgvector` on Ubuntu, or ensure the Docker image includes it).
**Warning signs:** Migration error: `ERROR: could not open extension control file ".../vector.control": No such file or directory`.

### Pitfall 2: Prisma Client Out of Sync After Schema Change

**What goes wrong:** TypeScript compiles, migrations run, but runtime calls to new fields (e.g., `prisma.user.findUnique` returning `passwordHash`) return `undefined` because the generated client has not been regenerated.
**Why it happens:** `prisma generate` must be run after every schema change to update `@prisma/client` types.
**How to avoid:** Run `npx prisma generate --schema ../../prisma/schema.prisma` (the project's existing `prisma:generate` script) after each migration step.
**Warning signs:** TypeScript shows correct types but runtime values are `undefined`; `PrismaClientKnownRequestError` on new fields.

### Pitfall 3: Entra Optional Change Breaks Build Without Guard

**What goes wrong:** Making the four Entra fields optional in `env.ts` immediately introduces TypeScript errors in `auth.ts` because `MicrosoftEntraAuthProvider` accesses those fields as `string`.
**Why it happens:** TypeScript propagates the narrowed type through the `ServerEnv` interface.
**How to avoid:** After the Zod change, add non-null assertions to the four access sites in `auth.ts` with `// TODO Phase 11: replace with proper guard` comments. This keeps the build green without implementing the full conditional provider logic.
**Warning signs:** TypeScript compile errors at `auth.ts` lines 303, 312, 317, 347 (constructor, buildAuthorizationUrl, getConfiguration).

### Pitfall 4: GCM IV Reuse

**What goes wrong:** Reusing the same IV with the same key for two different plaintext values completely breaks AES-GCM security.
**Why it happens:** Developers copy-paste encrypt calls and forget to generate a fresh IV per call.
**How to avoid:** Always call `randomBytes(12)` immediately before each encrypt call. Never cache or reuse an IV. The IV is safe to store alongside the ciphertext.
**Warning signs:** Two `IntegrationCredential` rows with the same `iv` value.

### Pitfall 5: HNSW Index on Empty Table Performance Concern

**What goes wrong:** Creating an HNSW index on an empty table is fine — but the index will not exist until the extension is installed. Attempting to `CREATE INDEX USING hnsw` before `CREATE EXTENSION vector` within the same migration results in an error.
**Why it happens:** SQL ordering within a migration file matters.
**How to avoid:** `CREATE EXTENSION IF NOT EXISTS vector` must be the first statement in the pgvector migration, before any `CREATE TABLE` or `CREATE INDEX` statements.
**Warning signs:** Migration error: `operator class "vector_cosine_ops" does not exist for access method "hnsw"`.

### Pitfall 6: `Unsupported` Type Blocks Standard Prisma Queries

**What goes wrong:** Columns declared as `Unsupported(...)` cannot be read or written through standard Prisma CRUD methods. Any code that tries to `select: { embedding: true }` will fail at the TypeScript level (field is excluded from generated types) or runtime.
**Why it happens:** Prisma deliberately excludes `Unsupported` fields from the generated client.
**How to avoid:** All reads and writes of the `embedding` column must use `$queryRaw` / `$executeRaw`. Phase 10 only creates the table — document this constraint clearly for Phase 14 (ingest) and Phase 15 (RAG search).
**Warning signs:** TypeScript error: `Object literal may only specify known properties, and 'embedding' does not exist in type`.

---

## Code Examples

Verified patterns from official sources and current codebase:

### Prisma User Model Addition

```prisma
// Source: prisma/schema.prisma conventions (existing project)
model User {
  id               String      @id @default(cuid())
  sourceSystem     String
  sourceId         String
  displayName      String
  email            String?
  jobTitle         String?
  department       String?
  passwordHash     String?     // Phase 10 addition
  role             String?     // Phase 10 addition
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  auditEvents      AuditEvent[] @relation("AuditActor")

  @@unique([sourceSystem, sourceId])
}
```

### SystemKey Boot Initialization (location: apps/api/src/server.ts or dedicated module)

```typescript
// Source: node:crypto built-in, D-03/D-04 decisions
import { randomBytes } from "node:crypto";
import { wrapKey, unwrapKey } from "./lib/credential-crypto.js";

export async function ensureSystemKey(
  prisma: PrismaClient,
  sessionSecret: string
): Promise<Buffer> {
  const PURPOSE = "credential_encryption";
  let row = await prisma.systemKey.findUnique({ where: { purpose: PURPOSE } });

  if (!row) {
    const dataKey = randomBytes(32);
    const wrappedKey = wrapKey(sessionSecret, dataKey);
    row = await prisma.systemKey.create({
      data: { purpose: PURPOSE, wrappedKey },
    });
    return dataKey;
  }

  return unwrapKey(sessionSecret, row.wrappedKey);
}
```

### IntegrationCredential Encrypt/Decrypt

```typescript
// Source: node:crypto built-in, D-14/D-17 decisions
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encryptCredential(dataKey: Buffer, plainJson: string): {
  encryptedValue: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainJson, "utf8"),
    cipher.final(),
  ]);
  return {
    encryptedValue: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptCredential(
  dataKey: Buffer,
  encryptedValue: string,
  iv: string,
  authTag: string
): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    dataKey,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
```

### pgvector Raw Insert (Phase 14 reference only — not Phase 10)

```typescript
// Source: pgvector-node README, Prisma section
import pgvector from "pgvector";

// Writing an embedding
await prisma.$executeRaw`
  INSERT INTO "DocumentEmbedding" (id, "documentId", "chunkIndex", "chunkText", embedding, "createdAt")
  VALUES (${cuid()}, ${documentId}, ${chunkIndex}, ${chunkText}, ${pgvector.toSql(embeddingArray)}::vector, NOW())
`;

// Querying nearest neighbors (Phase 15)
const rows = await prisma.$queryRaw`
  SELECT id, "documentId", "chunkText", embedding::text
  FROM "DocumentEmbedding"
  ORDER BY embedding <=> ${pgvector.toSql(queryEmbedding)}::vector
  LIMIT 10
`;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `postgresqlExtensions` preview feature | Manual migration SQL for extensions | Prisma 5+ (still in preview as of Prisma 6/7) | Use `--create-only` + hand-edit SQL; do not rely on preview feature |
| IVFFlat index for pgvector | HNSW index (default recommendation) | pgvector 0.5.0 (2023) | HNSW has better query-time performance; no training needed; use `USING hnsw (embedding vector_cosine_ops)` |
| Storing full session secrets in env files | Wrapped key in DB, session secret only in env | Security practice | Chosen by D-01/D-05; reduces blast radius of env file leak |

**Deprecated/outdated:**
- IVFFlat index: Superseded by HNSW for most workloads. IVFFlat requires training (inserting rows before creating the index). HNSW works on empty tables and is the recommended default.
- `prisma.$queryRawUnsafe` for vector operations: Use `$queryRaw` with tagged template literals to get parameterized queries and prevent SQL injection.

---

## Open Questions

1. **pgvector availability on the production database**
   - What we know: PostgreSQL is available at `localhost:5432` with DATABASE_URL configured; pgvector is NOT currently installed on this machine (`pg_available_extensions` check was inconclusive because the DB service was not running during research).
   - What's unclear: Whether pgvector is installed in the PostgreSQL server's extension directory.
   - Recommendation: Wave 0 of the plan should include a preflight check: `SELECT * FROM pg_available_extensions WHERE name = 'vector';`. If absent, the plan must include an installation step before the migration runs.

2. **TypeScript errors in auth.ts after Entra optional change**
   - What we know: There are exactly four access sites that will error. The minimal fix is non-null assertion.
   - What's unclear: Whether the project's CI setup treats TypeScript errors as build failures for the `test` script path (it runs tests with `tsx`, not `tsc`).
   - Recommendation: Check if `tsconfig.json` `strict` mode is enabled and if `pnpm build` is part of the test gate. If only `npx pnpm test` (which uses `tsx` loader) is the gate, TypeScript errors may not block tests. Non-null assertions are still the right choice for cleanliness.

3. **Migration ordering with existing migrations**
   - What we know: Two existing migrations exist (`20260328_0602_documentation_search`, `20260328_0605_documentation_search_hardening`). The three Phase 10 migrations will be timestamped after these.
   - What's unclear: Nothing — Prisma timestamps migrations automatically. No action needed.
   - Recommendation: Run migrations in order: User fields first, then IntegrationCredential + SystemKey, then pgvector + DocumentEmbedding.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All API code | Yes | 25.8.1 | — |
| PostgreSQL | Prisma migrations | Unknown (not running at research time) | — | Must be started before migration |
| pgvector extension | DocumentEmbedding migration | Unknown | — | Installation step required if absent |
| `prisma` CLI | Migration generation | Yes (project dep) | 6.6.0 | — |
| `node:crypto` | AES-GCM wrapping | Yes | Built-in | — |

**Missing dependencies with no fallback:**
- PostgreSQL must be running to execute `prisma migrate dev`. The plan must include a preflight check.

**Missing dependencies with fallback:**
- pgvector extension: If not pre-installed, the migration will fail with a clear error. Install with OS package manager (e.g., `sudo apt install postgresql-16-pgvector`) or Docker image swap. This is a one-time setup step.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) with `tsx` loader |
| Config file | None — test script is `node --import tsx --test src/**/*.test.ts` in `apps/api/package.json` |
| Quick run command | `npx pnpm --filter @agentsmith/api test` |
| Full suite command | `npx pnpm test` |

### Phase Requirements → Test Map

This phase has no named user requirements. Testable behaviors map to the deliverables:

| Deliverable | Behavior | Test Type | Automated Command |
|-------------|----------|-----------|-------------------|
| User schema | `passwordHash` and `role` fields exist on User model type | Unit (type-level) | `npx pnpm --filter @agentsmith/api test` — existing auth.test.ts stub check |
| credential-crypto.ts | `wrapKey` → `unwrapKey` round-trip returns original key | Unit | New: `src/lib/credential-crypto.test.ts` |
| credential-crypto.ts | `encryptCredential` → `decryptCredential` round-trip returns original JSON | Unit | New: `src/lib/credential-crypto.test.ts` |
| credential-crypto.ts | Different calls produce different IVs (no IV reuse) | Unit | New: `src/lib/credential-crypto.test.ts` |
| Zod env schema | `parseServerEnv({})` succeeds without Entra vars present | Unit | New: `src/lib/env-optional.test.ts` or add to existing env test |
| Zod env schema | `parseServerEnv({ ENTRA_TENANT_ID: 'x', ... })` still succeeds when Entra vars provided | Unit | Same test file |
| SystemKey init | `ensureSystemKey` creates a row when none exists | Unit (mock prisma) | New: `src/lib/system-key.test.ts` |
| SystemKey init | `ensureSystemKey` returns unwrapped key from existing row | Unit (mock prisma) | Same |

### Sampling Rate

- **Per task commit:** `npx pnpm --filter @agentsmith/api test`
- **Per wave merge:** `npx pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/lib/credential-crypto.test.ts` — covers wrapKey/unwrapKey, encryptCredential/decryptCredential round-trips and IV uniqueness
- [ ] `apps/api/src/lib/system-key.test.ts` — covers boot initialization with mock prisma
- [ ] `packages/shared/src/env.test.ts` (or add to existing) — covers Entra-optional parse behavior

---

## Sources

### Primary (HIGH confidence)

- Current codebase: `prisma/schema.prisma` — actual model conventions, existing migration names
- Current codebase: `apps/api/src/plugins/auth.ts` — confirmed `node:crypto` imports, `ServerEnv` usage pattern
- Current codebase: `packages/shared/src/env.ts` — exact current Zod schema to be changed
- Node.js 25.x built-in `crypto` module — `hkdfSync`, `createCipheriv`, `createDecipheriv`, `randomBytes` verified working in local environment

### Secondary (MEDIUM confidence)

- pgvector-node README (fetched 2026-03-30) — Prisma `Unsupported` type usage and `$executeRaw`/`$queryRaw` pattern for vector operations
- Prisma documentation on unsupported database features (fetched 2026-03-30) — `--create-only` workflow for custom SQL migrations

### Tertiary (LOW confidence)

- HNSW vs IVFFlat recommendation: Based on pgvector changelog and community consensus as of 2026; pgvector 0.5.0 introduced HNSW as the preferred index type. The `vector_cosine_ops` operator class is appropriate for OpenAI embedding similarity (cosine distance).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All packages are existing project dependencies; `pgvector` is the only new addition, version confirmed from npm registry
- Architecture patterns: HIGH — All patterns verified against current codebase conventions and official docs
- Pitfalls: HIGH — Most derived from direct code inspection and verified API behavior; pgvector availability pitfall is environment-specific

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable APIs; pgvector and Prisma releases could shift HNSW defaults but this is unlikely in 30 days)
