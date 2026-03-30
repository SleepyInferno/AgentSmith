# Technology Stack: v1.2 Intune Integration Additions

**Project:** AgentSmith — Solo IT Ops Suite
**Milestone:** v1.2 Intune Integration
**Researched:** 2026-03-30
**Scope:** New dependencies only. Existing stack (Fastify, Prisma, React, Vite, Playwright, Vitest, openid-client) is already validated and not repeated here.

---

## Critical Correction: Existing State

Before reviewing additions, one correction to the milestone context: the Microsoft Graph API is **not already in use**. `apps/api/src/modules/connectors/providers/intune.provider.ts` and `entra.provider.ts` are both stub implementations returning seeded/mocked data. No real Graph API calls exist. The `openid-client` package handles Entra ID OAuth token acquisition only. `@microsoft/microsoft-graph-client` is not installed and must be added.

This matters because Graph API integration is a first-class addition, not an extension of existing patterns.

---

## Confirmed Existing Stack (Do Not Re-Add)

| Package | Role |
|---------|------|
| `fastify ^5.3.3` | API server — confirmed in `apps/api/package.json` |
| `openid-client ^6.8.2` | Entra ID OIDC auth — confirmed |
| `@prisma/client ^6.6.0` | Database ORM — confirmed |
| `@tanstack/react-query ^5.95.2` | Frontend data fetching — confirmed |
| Node.js v25 (runtime) | ESM-native, no CommonJS compatibility concerns |

---

## Recommended Additions

### 1. Password Hashing — Local Admin Bootstrap

**Package:** `bcryptjs@^3.0.3`
**Install in:** `apps/api`

**Why bcryptjs, not bcrypt:** The native `bcrypt` package requires native C++ bindings compiled at install time. The API package runs on a Node.js ESM module system (`"type": "module"` in `apps/api/package.json`) and is deployed on a developer-controlled machine. `bcryptjs` is a pure-JavaScript implementation with full ESM support, no compilation step, TypeScript types bundled, and zero dependencies. It is 3-5x slower at hashing but hashing happens only at bootstrap (once) and at login (infrequently), so the performance gap is irrelevant.

Use cost factor 12. The Node.js built-in `crypto.subtle` could theoretically implement PBKDF2, but bcryptjs is the industry-standard choice for password storage, and scrypt via `crypto` would require more custom implementation risk for no practical gain at this scale.

```bash
pnpm --filter @agentsmith/api add bcryptjs
```

No separate `@types/bcryptjs` needed — types are bundled.

---

### 2. Secure Server-Side Credential Storage (Intune + OpenAI keys)

**Package:** None required — use Node.js built-in `crypto` module.

**Why no package:** Node.js v25 ships `crypto.createCipheriv` with AES-256-GCM support. This is the correct algorithm: authenticated encryption that detects tampering. A third-party package would add supply chain risk with no capability gain.

**Pattern:** Store an `APP_SECRET` (32 random bytes, hex-encoded) in the environment. Encrypt credentials at rest in the database using `crypto.createCipheriv('aes-256-gcm', key, iv)`. Store `iv + authTag + ciphertext` as a hex string in a `ConnectorCredential` model. Decrypt on demand when making Graph API or OpenAI calls.

**Schema addition needed:** A new `ConnectorCredential` Prisma model with fields: `connectorKey` (unique), `encryptedValue` (Text), `updatedAt`. No migration to existing tables required.

No npm package needed for this feature.

---

### 3. Microsoft Graph API Client

**Package:** `@microsoft/microsoft-graph-client@^3.0.7`
**Install in:** `apps/api`

**Why:** The official Microsoft Graph SDK handles request construction, pagination, and response typing for Graph API calls. Raw `fetch` is viable but the SDK reduces boilerplate for paginated Intune endpoints (`/deviceManagement/managedDevices`, `/deviceManagement/detectedApps`, `/deviceManagement/deviceCompliancePolicies`).

**Authentication pattern:** The existing `openid-client` handles token acquisition. Pass the token to the Graph client using `AuthCodeMSALBrowserAuthenticationProvider` (for delegated) or a custom token provider using client credentials (for daemon/service). Since this app will use client credentials (stored tenant ID, client ID, client secret), implement a custom `AuthenticationProvider` that calls the token endpoint directly using the stored credentials — this avoids pulling in `@azure/msal-node` as an additional dependency.

```bash
pnpm --filter @agentsmith/api add @microsoft/microsoft-graph-client
```

**Required Graph API Scopes (application permissions, not delegated):**

| Scope | What it covers |
|-------|----------------|
| `DeviceManagementManagedDevices.Read.All` | Device inventory, compliance state, per-device detected apps |
| `DeviceManagementApps.Read.All` | Mobile app catalog, app categories, app protection policies |
| `DeviceManagementConfiguration.Read.All` | Compliance policies, device configuration profiles |

These three scopes cover all v1.2 Intune sync features. Do not request write scopes — this milestone is read-only sync. `DeviceManagementManagedDevices.PrivilegedOperations.All` is explicitly out of scope and should not be added to the app registration.

**Key v1.0 Graph API endpoints to use (not beta):**

- `GET /deviceManagement/managedDevices` — device inventory + compliance state
- `GET /deviceManagement/detectedApps/{id}/managedDevices` — per-app device associations
- `GET /deviceManagement/deviceCompliancePolicies` — compliance policy definitions

Use `/v1.0/` not `/beta/` for all three. Beta endpoints are unstable and the v1.0 surface covers all required fields.

---

### 4. DOCX Parsing — Document Ingest Pipeline

**Package:** `mammoth@^1.12.0`
**Install in:** `apps/api`

**Why mammoth:** The only task is extracting clean plain text from `.docx` files for OpenAI classification and embedding. Mammoth's `extractRawText()` returns a promise resolving to plain text with zero styling concerns. It supports both ESM and CommonJS. It is actively maintained (v1.12.0 published March 2026). The alternative `docx` package is oriented toward document creation, not extraction.

Do not use `mammoth.convertToHtml()` — HTML output adds unnecessary processing before passing text to OpenAI. Use `mammoth.extractRawText({ path })` directly.

```bash
pnpm --filter @agentsmith/api add mammoth
```

---

### 5. PDF Parsing — Document Ingest Pipeline

**Package:** `pdf-parse@^2.4.5`
**Install in:** `apps/api`

**Why pdf-parse:** The task is extracting raw text for AI classification and embedding. `pdf-parse` wraps `pdfjs-dist` with a clean promise API that returns `{ text, numpages, info }`. Version 2.4.5 supports ESM natively and has TypeScript types. `pdfjs-dist` directly is 2-3x slower and is designed for rendering — overkill for this use case. `unpdf` is the modern alternative for edge runtimes (Cloudflare Workers, etc.) but adds unnecessary abstraction for a Node.js server.

Markdown and plain text files (`*.md`, `*.txt`) need no parser — use `fs.readFile()` with `utf-8` encoding directly.

```bash
pnpm --filter @agentsmith/api add pdf-parse
```

---

### 6. OpenAI SDK — Classification, Summarization, and RAG

**Package:** `openai@^6.33.0`
**Install in:** `apps/api`

**Why the official SDK:** v6.33.0 (released 2026-03-25) is the current stable release. It provides typed methods for `client.chat.completions.create()` (classification and synthesis) and `client.embeddings.create()` (vector generation). It is ESM-native and works in Node.js without any CommonJS shims. No alternative SDK is needed — do not add `@ai-sdk/openai` or `langchain` for this milestone.

**Embedding model:** Use `text-embedding-3-small` — 1536 dimensions, significantly cheaper than `text-embedding-3-large` (3072 dimensions), and more than sufficient for document-level semantic similarity at this corpus size. The smaller model costs ~5x less per token with only a modest quality difference on general semantic search.

**Chat model:** Use `gpt-4o-mini` for document classification and tagging. Use `gpt-4o` for RAG synthesis queries only (operator-facing, low volume). This keeps ingest costs low while keeping query quality high.

```bash
pnpm --filter @agentsmith/api add openai
```

---

### 7. Vector Storage for Embeddings — RAG Search

**Package:** `pgvector@^0.2.1` (Node.js helper) plus PostgreSQL `pgvector` extension.
**Install in:** `apps/api`

**Why pgvector over a dedicated vector database:** The existing stack uses PostgreSQL with Prisma. Adding Pinecone, Weaviate, Qdrant, or any other external vector database would introduce a second persistence layer, additional infrastructure, additional operational cost, and a new failure domain. At the document corpus size of a solo IT operator (tens to low hundreds of documents), PostgreSQL with the `pgvector` extension delivers fully adequate nearest-neighbor search performance.

**Integration approach:** Prisma does not yet natively model `vector` columns — they must be declared as `Unsupported("vector(1536)")` in the schema and queried using `prisma.$queryRaw`. The `pgvector` npm package provides `pgvector.toSql()` for serializing float arrays to the Postgres wire format.

**Schema addition needed:** Add an `embedding` column to the `Document` model (or a separate `DocumentEmbedding` table if the Prisma `Unsupported` type causes migration friction). Enable the extension via migration: `CREATE EXTENSION IF NOT EXISTS vector`.

**Prisma schema change required:**

```prisma
// In schema.prisma generator block:
previewFeatures = ["postgresqlExtensions"]

// In datasource block:
extensions = [vector]

// On Document model:
embedding Unsupported("vector(1536)")?
```

```bash
pnpm --filter @agentsmith/api add pgvector
```

---

### 8. File Watching — Watch Folder Ingest Trigger

**Package:** `chokidar@^5.0.0`
**Install in:** `apps/api`

**Why chokidar:** v5 (released November 2025) is ESM-only, has exactly one dependency (readdirp), and requires Node.js v20+. The project runs on Node.js v25, so there are no compatibility concerns. Chokidar's `watch` API debounces rapid filesystem events and handles the edge cases of `fs.watch` reliably across platforms (Windows `FSEvents`, Linux `inotify`).

Do not use `fs.watch` directly — it delivers duplicate events on some platforms and does not handle directory recursion cleanly. Do not use chokidar v4 — v5 removes glob support but glob support is not needed here (watch one directory).

The watch folder instance should be managed as a long-lived singleton in the API server, started after DB connection is established, and cleanly closed on server shutdown.

```bash
pnpm --filter @agentsmith/api add chokidar
```

---

### 9. File Copy and Folder Organization — Document Ingest Output

**Package:** None required — use Node.js built-in `fs/promises`.

**Why no package:** The ingest pipeline reads from a source folder and writes organized copies to an output folder. `fs.promises.copyFile()`, `fs.promises.mkdir({ recursive: true })`, and `path.join()` are the only operations needed. There is no case where a library like `fs-extra` adds meaningful value over the native `fs/promises` API at Node.js v25. Adding a package for this would be over-engineering.

---

## What NOT to Add

| Package | Why to avoid |
|---------|-------------|
| `@azure/msal-node` | Redundant — `openid-client` already handles token acquisition; a custom token provider passed to the Graph client is sufficient |
| `langchain` / `llamaindex` | Over-engineered for this use case; the OpenAI SDK alone covers classification, embedding, and RAG synthesis without an orchestration framework |
| `@ai-sdk/openai` (Vercel AI SDK) | Designed for streaming UI patterns; adds abstraction with no benefit for background ingest pipelines |
| `pinecone` / `weaviate` / `qdrant` | External vector databases are unnecessary — pgvector on the existing PostgreSQL instance is sufficient at this corpus size |
| `multer` / `@fastify/multipart` | Not needed for v1.2 — the document ingest pipeline reads from a server-side folder path, not user file uploads through the browser |
| `sharp` / `pdf2pic` | Image extraction is out of scope; text-only ingest is sufficient for AI classification and embedding |
| `dotenv` | Not needed — the project uses native Node.js environment variable loading (confirmed by `tsx` usage pattern and existing env references in schema.prisma) |
| `@types/mammoth` | Not needed — mammoth bundles its own TypeScript types |
| `@types/bcryptjs` | Not needed — bcryptjs bundles its own TypeScript types |

---

## Full Installation Summary

```bash
# API additions only — all go into apps/api
pnpm --filter @agentsmith/api add \
  bcryptjs \
  @microsoft/microsoft-graph-client \
  mammoth \
  pdf-parse \
  openai \
  pgvector \
  chokidar
```

No frontend (web) package additions are needed for v1.2. The integrations settings page and ingest status UI use the existing React + TanStack Query + react-router-dom stack.

---

## Required Infrastructure Change

The PostgreSQL server must have the `pgvector` extension available. This is not a Node.js package installation — it requires either:
- Running `CREATE EXTENSION IF NOT EXISTS vector` in a Prisma migration (if the Postgres instance supports it), OR
- Installing the `pgvector` extension into the PostgreSQL server binary (if self-hosted and not yet installed)

This is a prerequisite for RAG search. The ingest pipeline can be built and tested without it, but embedding storage requires it.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| bcryptjs version 3.0.3 | MEDIUM | npm search result; npm registry unavailable for direct fetch |
| mammoth version 1.12.0 | MEDIUM | WebSearch citing npm data; confirms active maintenance |
| pdf-parse version 2.4.5 | MEDIUM | WebSearch citing npm data |
| openai version 6.33.0 | HIGH | Official GitHub CHANGELOG fetched directly, 2026-03-25 release confirmed |
| chokidar v5 ESM-only, Node.js 20+ | HIGH | Multiple sources agree; official GitHub README cited |
| pgvector 0.2.1 | MEDIUM | WebSearch; stable package with low update frequency |
| @microsoft/microsoft-graph-client | MEDIUM | GitHub README fetched directly; version not pinned in source |
| Graph API scopes | HIGH | Official Microsoft Learn documentation fetched directly (2025-10-11 update) |
| Node.js built-in crypto for AES-256-GCM | HIGH | Official Node.js docs; no package required |
| fs/promises for file operations | HIGH | Node.js built-in; no package required |

---

## Sources

- [Microsoft Graph Intune API scopes — official Learn docs (updated 2025-10-11)](https://learn.microsoft.com/en-us/intune/intune-service/developer/intune-graph-apis)
- [Microsoft Graph managed devices v1.0 endpoints](https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0)
- [openai npm CHANGELOG — v6.33.0 confirmed 2026-03-25](https://github.com/openai/openai-node/blob/master/CHANGELOG.md)
- [@microsoft/microsoft-graph-client GitHub README](https://github.com/microsoftgraph/msgraph-sdk-javascript)
- [chokidar npm package page](https://www.npmjs.com/package/chokidar)
- [chokidar GitHub — v5 ESM-only announcement](https://github.com/paulmillr/chokidar)
- [mammoth npm package](https://www.npmjs.com/package/mammoth)
- [pdf-parse npm package](https://www.npmjs.com/package/pdf-parse)
- [pgvector-node GitHub — Prisma integration](https://github.com/pgvector/pgvector-node)
- [pgvector npm package](https://www.npmjs.com/package/pgvector)
- [bcryptjs npm package](https://www.npmjs.com/package/bcryptjs)
- [Node.js crypto documentation](https://nodejs.org/api/crypto.html)
- [unpdf vs pdf-parse vs pdfjs-dist comparison 2026](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026)
- [OpenAI embeddings — text-embedding-3 models](https://platform.openai.com/docs/guides/embeddings)
- [Prisma pgvector extension support](https://www.prisma.io/blog/orm-6-13-0-ci-cd-workflows-and-pgvector-for-prisma-postgres)
