# Phase 14: Document Ingest Pipeline - Research

**Researched:** 2026-04-01
**Domain:** File watching, document parsing, OpenAI classification/embedding, async queuing, Prisma migrations
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New `AppSetting` table in Prisma — generic key/value (`key String @unique`, `value String`). Keys: `"ingest.sourceFolder"` and `"ingest.outputFolder"`.
- **D-02:** New API routes: `GET /api/settings` and `PUT /api/settings`. Both require authenticated session. `PUT /api/settings` triggers watcher restart if `"ingest.sourceFolder"` is being updated.
- **D-03:** Source and output folders must not be the same path — validated server-side on save, returns 400 with a descriptive error if equal.
- **D-04:** Watcher uses hot-reload on path save — starts (or restarts with new path) the moment the operator saves folder paths via `PUT /api/settings`. No server restart required.
- **D-05:** Module-level singleton pattern: one `chokidar` watcher instance at a time. On `PUT /api/settings` with new source folder: close existing watcher (if any), open new one. SIGTERM handler closes the watcher cleanly on server shutdown.
- **D-06:** On watcher start (including restart), perform an initial scan of the source folder — process any existing files not already recorded (by hash). This ensures pre-existing files and folder path changes are handled without a manual trigger.
- **D-07:** Watcher watches for `add` and `change` events only. `unlink` does not remove Document rows.
- **D-08:** New `IngestFile` table: `id`, `filePath String`, `fileHash String`, `status` (`pending`|`processing`|`done`|`failed`), `errorMessage String?`, `documentId String?` (FK → `Document` after success), `runId String`, `createdAt`, `updatedAt`. Indexed on `fileHash`.
- **D-09:** New `IngestRun` table: `id`, `triggeredBy` (`"watch"`|`"manual"`), `status` (`running`|`done`|`failed`), `startedAt`, `completedAt`, `fileCount Int`, `doneCount Int`, `failedCount Int`. Latest run drives the status table in UI.
- **D-10:** Hash dedup: on each file event (add/change), compute SHA-256 hash of file contents. If an `IngestFile` row with same `filePath` and `fileHash` and status `"done"` exists, skip. If hash differs, re-ingest.
- **D-11:** Files that fail (parse error, OpenAI error, etc.) are recorded with `status: "failed"` and `errorMessage`. They do not block other files in the same run.
- **D-12:** If ingest runs and the OpenAI API key is not configured, each file immediately gets `status: "failed"` with `errorMessage: "OpenAI not configured"`. No silent stalling.
- **D-13:** Successful ingest creates or updates a `Document` row: `sourceSystem = "ingest"`, `sourceId = absolute file path`. Upsert on `@@unique([sourceSystem, sourceId])`. Fields populated: `title`, `kind`, `summary`, `contentText`.
- **D-14:** Once any real `Document` row with `sourceSystem = "ingest"` exists, `isSeededMode()` in `DocsRepository` returns `false` automatically. No code change needed.
- **D-15:** `DocumentEmbedding` rows created at ingest time: content chunked at 512 tokens with overlap, each chunk embedded via OpenAI `text-embedding-ada-002` (or the model configured in the OpenAI integration), stored in `DocumentEmbedding`. Phase 10 pgvector infrastructure activated.
- **D-16:** AI classification maps to existing `DocumentKind` values: `sop`, `vendor_note`, `contact`, `infrastructure_note`, `recovery_procedure`. If classification is ambiguous or OpenAI returns an unknown value, default to `infrastructure_note`.
- **D-17:** Metadata tags (category, site, owner) are NOT populated by ingest — left empty. Operator fills these via existing metadata review workflow after ingest.
- **D-18:** Output folder hierarchy organized by AI-classified kind: `sop/`, `vendor_note/`, `contact/`, `infrastructure_note/`, `recovery_procedure/`. Files are copied (not moved) from source. Original filenames preserved.
- **D-19:** If a file already exists at the output destination, overwrite it. No versioning.
- **D-20:** Add a third section to the existing `/settings` Integrations page: "Ingest" — below Intune and OpenAI sections, following the same `IntegrationSection` component pattern.
- **D-21:** Ingest section contains: (1) Source folder text input, (2) Output folder text input, (3) Save button → `PUT /api/settings`, (4) Trigger ingest button → `POST /api/ingest/run` (disabled if folders not configured), (5) Status table showing files from most recent `IngestRun`.
- **D-22:** Status table polls `GET /api/ingest/status` while run status is `running` (every 2 seconds). Stops polling when run status becomes `done` or `failed`.
- **D-23:** Status table shows last run only — no run history selector.
- **D-24:** `GET /api/settings` — returns `{ [key: string]: string }`. Authenticated.
- **D-25:** `PUT /api/settings` — body `{ key: string, value: string }[]` or `{ [key: string]: string }`. Upserts. Returns `{ ok: true }`. Triggers watcher restart if `ingest.sourceFolder` changes. Authenticated.
- **D-26:** `POST /api/ingest/run` — triggers a manual ingest run. Returns `{ runId: string }`. Authenticated.
- **D-27:** `GET /api/ingest/status` — returns latest `IngestRun` with its `IngestFile[]` array. Returns `{ run: null }` if no runs yet. Authenticated.
- **D-28:** Ingest reads the OpenAI API key and model from `IntegrationCredential` key `"openai"` at runtime (same pattern as Phase 13 reads Intune credentials).
- **D-29:** OpenAI calls are never in the HTTP path — they run in the async ingest queue after the API responds with `{ runId }`.

### Claude's Discretion

- Exact async queue implementation (in-memory promise chain is fine; no BullMQ/Redis needed)
- 512-token chunking algorithm details and overlap size
- Exact OpenAI prompt for classify/summarize/tag (structured JSON response preferred)
- Migration file naming and ordering
- Loading/pending state wording on trigger button
- Whether `IngestRun` is cleaned up after N days or kept indefinitely

### Deferred Ideas (OUT OF SCOPE)

- Multi-run history selector in the status UI — post-v1.2
- `IngestRun` cleanup/retention policy — post-v1.2
- Metadata tag population at ingest time (category, site, owner)
- Automatic retry for failed files
- Real-time push (WebSocket/SSE) for ingest status — polling every 2s is sufficient for v1.2
- RAG search / query-time GPT synthesis — Phase 15
- OpenAI model selector on the Integrations page (already implemented)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INGEST-01 | Operator can configure a source folder and output folder for document ingest from the settings page. | `AppSetting` table + `GET/PUT /api/settings` routes + IngestSection UI component. |
| INGEST-02 | Ingest pipeline parses md, txt, docx, and pdf files from the source folder. | `mammoth` (docx), `unpdf` (pdf), native `fs.readFile` + encoding detection (md/txt). |
| INGEST-03 | Ingest uses OpenAI to classify, summarize, and tag each document and copies organized files to the output folder in a structured hierarchy. | OpenAI chat completion with structured JSON output; `fs.copyFile` to kind-subfolder. |
| INGEST-04 | Ingest runs automatically when new files are added to the source folder (watch folder). | `chokidar` v5 watch singleton; `add`/`change` events trigger ingest queue. |
| INGEST-05 | Operator can trigger ingest manually from the UI. | `POST /api/ingest/run` route; trigger button in IngestSection; polling via `GET /api/ingest/status`. |
</phase_requirements>

---

## Summary

Phase 14 builds an automated document ingest pipeline on top of infrastructure laid in Phases 10 and 12. The core flow is: chokidar watches a source folder → file events fire → per-file hash dedup check → parse text from the file (mammoth/unpdf/fs) → OpenAI classifies/summarizes/embeds asynchronously → Document + DocumentEmbedding rows written to DB → file copied to output/kind/ subfolder → IngestFile status updated to done or failed.

The three new Prisma models (`AppSetting`, `IngestRun`, `IngestFile`) are straightforward key/value and status-tracking tables with no complex relations beyond `IngestFile` → `Document` (optional FK). All existing patterns from the codebase apply directly: injectable-dependency route functions, `decryptCredential` for OpenAI key retrieval, `@@unique([sourceSystem, sourceId])` upsert for Document, and the module-level singleton pattern already used by `connector.registry.ts`.

The most technically novel aspects of this phase are: (1) chokidar v5 is ESM-only and requires Node.js v20+ — the project already appears to target modern Node so this should not be a blocker, but must be confirmed; (2) 512-token chunking requires a tokenizer — `js-tiktoken` (pure JS, no WASM) is the cleanest option for ESM/Node.js; (3) OpenAI structured outputs via `response_format` with `json_schema` are the correct way to get reliable classification JSON from the model.

**Primary recommendation:** Follow the connector.registry.ts module-level singleton pattern for the watcher manager. Keep the async queue as a simple sequential in-memory promise chain (no BullMQ). Use `js-tiktoken` for token-accurate chunking.

---

## Standard Stack

### Core (new packages to install)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `chokidar` | 5.x (ESM-only, Node v20+ required) | File system watcher for source folder | CONTEXT.md locked decision D-04/D-05; industry standard; v5 reduces deps to 1 |
| `mammoth` | 1.12.0 (verified via npm search) | Extract text from .docx files | CONTEXT.md locked decision; straightforward `extractRawText({arrayBuffer})` API |
| `unpdf` | 1.4.0 (verified via npm search) | Extract text from .pdf files | CONTEXT.md locked decision; ESM-native, works across all JS runtimes |
| `js-tiktoken` | 1.0.x | Token-accurate chunking for embeddings | Pure JS port of tiktoken, no WASM, ESM compatible — safer than `tiktoken` WASM in Node ESM context |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `openai` | ^6.33.0 (already in apps/api) | Chat completion (classify/summarize) + embeddings | D-28/D-29; reads credentials from IntegrationCredential via decryptCredential |
| `@prisma/client` | ^6.6.0 (already installed) | AppSetting, IngestRun, IngestFile CRUD | All DB operations |
| Node.js `crypto` | built-in | SHA-256 hash for file dedup | `createHash('sha256').update(buffer).digest('hex')` |
| Node.js `fs/promises` | built-in | Read md/txt files, copy files to output | `readFile`, `copyFile`, `mkdir` |
| Node.js `path` | built-in | Construct output subfolder paths | `path.join(outputFolder, kind, filename)` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `js-tiktoken` | `tiktoken` (WASM) | WASM version has better perf but WASM init in ESM Node.js context can be fragile; pure JS is simpler for server-side use |
| `js-tiktoken` | Character-based approximation (~4 chars/token) | Faster but inaccurate; 512-token chunks would be misaligned causing RAG quality issues |
| `unpdf` | `pdf-parse` | pdf-parse has known issues with PDF.js version conflicts; unpdf is ESM-native and maintained by UnJS |
| `mammoth` | `docx` (npm) | mammoth is purpose-built for text extraction with better paragraph handling; docx is more for creation |
| chokidar singleton | `fs.watch` (Node built-in) | Built-in lacks cross-platform reliability, no debounce, no ready event; chokidar is the ecosystem standard |

**Installation:**
```bash
pnpm --filter @agentsmith/api add chokidar mammoth unpdf js-tiktoken
pnpm --filter @agentsmith/api add -D @types/mammoth
```

**Version verification:** Run `pnpm view chokidar version && pnpm view mammoth version && pnpm view unpdf version && pnpm view js-tiktoken version` before installing to confirm latest.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── modules/ingest/
│   ├── ingest.service.ts       # runIngestFile() — parse → classify → embed → upsert → copy
│   ├── ingest.watcher.ts       # module-level singleton: initWatcher(), restartWatcher(), closeWatcher()
│   ├── ingest.queue.ts         # in-memory sequential promise queue
│   ├── ingest.parsers.ts       # parseDocx(), parsePdf(), parsePlainText()
│   ├── ingest.chunker.ts       # chunkText() using js-tiktoken, 512-token chunks with overlap
│   └── ingest.types.ts         # IngestFilePath, ParseResult, ClassifyResult types
├── routes/
│   ├── settings.ts             # GET/PUT /api/settings — AppSetting CRUD
│   └── ingest.ts               # POST /api/ingest/run, GET /api/ingest/status
prisma/
└── migrations/
    └── 20260401_0001_app_setting_ingest_run_ingest_file/
        └── migration.sql
```

### Pattern 1: Module-Level Watcher Singleton (mirrors connector.registry.ts)

**What:** Single `FSWatcher | null` at module scope. `initWatcher()` called at server startup if folders configured. `restartWatcher()` called by `PUT /api/settings` handler when `ingest.sourceFolder` changes.

**When to use:** Any server-lifecycle resource that must survive across HTTP requests.

```typescript
// Source: connector.registry.ts pattern (existing codebase)
import chokidar, { type FSWatcher } from 'chokidar';

let _watcher: FSWatcher | null = null;

export async function initWatcher(deps: WatcherDeps): Promise<void> {
  const sourceFolder = await deps.prisma.appSetting.findUnique({
    where: { key: 'ingest.sourceFolder' },
  });
  if (!sourceFolder?.value) return;
  await startWatcher(sourceFolder.value, deps);
}

export async function restartWatcher(newPath: string, deps: WatcherDeps): Promise<void> {
  if (_watcher) {
    await _watcher.close();
    _watcher = null;
  }
  await startWatcher(newPath, deps);
}

async function startWatcher(sourcePath: string, deps: WatcherDeps): Promise<void> {
  _watcher = chokidar.watch(sourcePath, {
    persistent: true,
    ignoreInitial: false,  // fire 'add' for existing files on start (satisfies D-06)
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  _watcher
    .on('add', (filePath) => void enqueueFile(filePath, 'watch', deps))
    .on('change', (filePath) => void enqueueFile(filePath, 'watch', deps));
}

// SIGTERM handler — register in server.ts addHook('onClose', ...)
export async function closeWatcher(): Promise<void> {
  if (_watcher) {
    await _watcher.close();
    _watcher = null;
  }
}
```

**Critical chokidar v5 notes:**
- ESM-only: `import chokidar from 'chokidar'` — no `require()` possible
- `ignoreInitial: false` fires `add` for pre-existing files on watcher start (satisfies D-06 initial scan without a separate glob pass)
- `awaitWriteFinish` prevents partial-file reads when large files are still copying into the watch folder
- v5 requires Node.js v20+; confirm runtime version

### Pattern 2: In-Memory Sequential Queue

**What:** A module-level promise chain ensures files are processed one at a time (avoids overwhelming OpenAI API and prevents concurrent DB writes to the same IngestRun row).

**When to use:** Simple async work queue with no persistence requirement (restart loses queue, which is acceptable — file watcher will re-detect files on restart).

```typescript
// Source: Claude's discretion — simple promise chain
let _queue: Promise<void> = Promise.resolve();

export function enqueueFile(filePath: string, triggeredBy: 'watch' | 'manual', deps: IngestDeps): void {
  _queue = _queue.then(() => processFile(filePath, triggeredBy, deps)).catch(() => {
    // individual file errors are caught inside processFile and written to DB;
    // this catch prevents queue from dying on unexpected throws
  });
}
```

### Pattern 3: OpenAI Structured Classification

**What:** Use `openai.chat.completions.create()` with `response_format: { type: 'json_schema', json_schema: {...} }` to get reliable JSON back for classification, summary, and title extraction in a single call.

**When to use:** Any time you need reliable structured output from a chat model.

```typescript
// Source: OpenAI Structured Outputs documentation
const response = await openai.chat.completions.create({
  model: selectedModel,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'document_classification',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['sop', 'vendor_note', 'contact', 'infrastructure_note', 'recovery_procedure'] },
          title: { type: 'string' },
          summary: { type: 'string' },
        },
        required: ['kind', 'title', 'summary'],
        additionalProperties: false,
      },
    },
  },
  messages: [
    { role: 'system', content: 'You are a document classifier for an IT operations system. Classify the document into one of the five kinds. Respond only with valid JSON.' },
    { role: 'user', content: `File: ${filename}\n\nContent (truncated to 4000 tokens):\n${contentPreview}` },
  ],
});
const result = JSON.parse(response.choices[0].message.content ?? '{}');
// Validate kind against documentKinds; fall back to 'infrastructure_note' per D-16
```

**Note:** Structured outputs with `strict: true` are only available on `gpt-4o-mini`, `gpt-4o-2024-08-06`, and later. If the operator has selected an older model, fall back to `response_format: { type: 'json_object' }` with prompt-based enforcement.

### Pattern 4: Token-Accurate Chunking with js-tiktoken

**What:** Split document text into 512-token chunks with ~100-token overlap for DocumentEmbedding rows.

```typescript
// Source: js-tiktoken npm docs
import { getEncoding } from 'js-tiktoken';

export function chunkText(text: string, chunkSize = 512, overlap = 100): string[] {
  const enc = getEncoding('cl100k_base');
  const tokens = enc.encode(text);
  const chunks: string[] = [];

  for (let start = 0; start < tokens.length; start += chunkSize - overlap) {
    const end = Math.min(start + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(start, end);
    chunks.push(new TextDecoder().decode(enc.decode(chunkTokens)));
    if (end === tokens.length) break;
  }

  enc.free(); // Release WASM memory (js-tiktoken also has a free() for cleanup)
  return chunks;
}
```

**Note:** `cl100k_base` is the encoding for `gpt-3.5-turbo`, `gpt-4`, and `text-embedding-ada-002`. The DocumentEmbedding schema uses `vector(1536)` which matches `text-embedding-ada-002` output dimensions exactly.

### Pattern 5: Settings Route (new, follows integrations.ts pattern)

**What:** New `registerSettingsRoutes` function following the same injectable-dependency pattern as `registerIntegrationRoutes`.

```typescript
// Source: integrations.ts pattern (existing codebase)
export type SettingsRoutesDependencies = {
  prisma: Pick<PrismaClient, 'appSetting'>;
  authService: Pick<AgentSmithAuthService, 'getSession'>;
  onSourceFolderChanged?: (newPath: string) => Promise<void>;
};

export async function registerSettingsRoutes(app: FastifyInstance, options: SettingsRoutesDependencies) {
  // GET /api/settings, PUT /api/settings
  // PUT validates source !== output and calls onSourceFolderChanged if key changes
}
```

### Pattern 6: Ingest Route (new)

**What:** New `registerIngestRoutes` function for `POST /api/ingest/run` and `GET /api/ingest/status`.

```typescript
export type IngestRoutesDependencies = {
  prisma: Pick<PrismaClient, 'ingestRun' | 'ingestFile' | 'appSetting' | 'integrationCredential'>;
  authService: Pick<AgentSmithAuthService, 'getSession'>;
  systemKey: Buffer;
  runManualIngest?: (deps: IngestDeps) => Promise<string>; // returns runId; injectable for tests
};
```

### Anti-Patterns to Avoid

- **Calling OpenAI inside the HTTP handler:** D-29 is explicit — `POST /api/ingest/run` returns `{ runId }` immediately and processing happens asynchronously. Violating this blocks the HTTP response for 10-60 seconds.
- **Using chokidar v3/v4 CommonJS import syntax:** `const chokidar = require('chokidar')` will fail with v5 ESM-only. Use `import chokidar from 'chokidar'`.
- **Using `ignoreInitial: true` (chokidar default):** This would skip the initial scan (D-06 requires initial scan). Must explicitly set `ignoreInitial: false`.
- **Forgetting `awaitWriteFinish`:** Without it, chokidar fires `add` as soon as file creation begins. For large PDFs copied into the folder, the file may be incomplete when parsing starts. Set `awaitWriteFinish: { stabilityThreshold: 500 }`.
- **Hardcoding `text-embedding-ada-002`:** D-15 says use the model configured in the OpenAI integration. Read `selectedModel` from `IntegrationCredential` key `"openai"` and use it for embeddings too (or fall back to `text-embedding-ada-002` if the selected chat model doesn't have an embedding equivalent — embedding always uses `text-embedding-ada-002` since chat models != embedding models; see note below).
- **Writing embeddings for all text at once:** Pass content through the chunker first, then embed each chunk separately. The embedding model has an 8191-token limit; a full document may exceed it.
- **Not handling watcher close in `onClose` hook:** Fastify's `onClose` hook is the correct place for cleanup. The `closeWatcher()` call must be registered there, not in a raw `process.on('SIGTERM')`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File system watching with cross-platform reliability | Custom `fs.watch` wrapper with debounce | `chokidar` v5 | `fs.watch` has known bugs on macOS/Windows (missed events, double-fires); chokidar handles all edge cases |
| docx text extraction | Custom zip+XML parser | `mammoth` | Office Open XML is complex; mammoth handles embedded images, tables, footnotes, list styles gracefully |
| PDF text extraction | pdfmake/manual PDF parsing | `unpdf` | PDF text layer extraction is non-trivial (encoding, ligatures, multi-column layouts); unpdf wraps PDF.js correctly |
| Token counting | Character-count approximation | `js-tiktoken` | GPT tokenization is BPE, not character-based; a 512-char chunk may be 80 or 200 tokens depending on content |
| Structured AI output parsing | Regex/string parsing of LLM response | OpenAI `response_format: json_schema` with `strict: true` | LLMs without structured output constraints regularly produce malformed JSON or hallucinate field names |
| Async job queue | BullMQ, pg-boss, or Redis | In-memory promise chain | No persistence requirement (watcher re-queues on restart); adding Redis/BullMQ would be significant dependency overhead for a single-server use case |

**Key insight:** The parsing and tokenization domains have subtle correctness issues (encoding edge cases, token boundary alignment) that simple hand-rolled solutions get wrong in ways that silently degrade RAG quality downstream.

---

## Common Pitfalls

### Pitfall 1: chokidar v5 ESM-Only with Node.js Version Gate

**What goes wrong:** `import chokidar from 'chokidar'` throws `ERR_REQUIRE_ESM` (if somehow CJS context) or version mismatch errors.
**Why it happens:** chokidar v5 dropped CommonJS support and requires Node.js v20+. The project uses `"type": "module"` in api/package.json so ESM import is correct, but the Node version must be v20+.
**How to avoid:** Confirm Node.js version is v20+ in the runtime environment. Install chokidar v5, not v4.
**Warning signs:** `ERR_UNKNOWN_FILE_EXTENSION` or `Cannot use import statement outside a module` during watcher init.

### Pitfall 2: chokidar `ignoreInitial` Default is `true`

**What goes wrong:** Watcher starts, existing files in source folder are never processed. Operator adds folder path and triggers ingest, but pre-existing files show no status.
**Why it happens:** Chokidar's default `ignoreInitial: true` suppresses `add` events for files that exist when the watcher starts.
**How to avoid:** Always set `ignoreInitial: false` explicitly in the watch options. This is required by D-06.
**Warning signs:** Status table empty after first save even though source folder contains files.

### Pitfall 3: Race Condition Between Watcher Restart and In-Flight Processing

**What goes wrong:** Operator saves new source folder path while an ingest run is still processing files from the old path. Old watcher is closed mid-run; `IngestRun` row gets stuck in `running` status.
**Why it happens:** `restartWatcher()` immediately closes the existing watcher without waiting for the current queue to drain.
**How to avoid:** When `PUT /api/settings` triggers a watcher restart, mark any in-flight `IngestRun` rows with status `"failed"` and `errorMessage: "Watcher restarted"` before closing. The new watcher's initial scan will re-queue changed files.
**Warning signs:** `IngestRun.status` stays `"running"` after a settings save.

### Pitfall 4: mammoth ArrayBuffer vs Buffer Mismatch

**What goes wrong:** `mammoth.extractRawText({ buffer: nodeBuffer })` fails or produces empty output.
**Why it happens:** mammoth's Node.js API uses `{ path }` or `{ arrayBuffer }` — not `{ buffer }`. Node `Buffer` is not the same as `ArrayBuffer`.
**How to avoid:** Convert with `nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength)` or use `.buffer` on a `Uint8Array` read with `readFile`.
**Warning signs:** `mammoth.extractRawText is not a function` or `result.value` is `""` with no error.

Correct pattern:
```typescript
const data = await fs.readFile(filePath); // returns Buffer
const { value: text } = await mammoth.extractRawText({ buffer: data }); // mammoth accepts Buffer too
// Note: newer mammoth versions do accept Buffer directly — verify with installed version
```

### Pitfall 5: Embedding Model vs Chat Model Confusion

**What goes wrong:** Code reads `selectedModel` from `IntegrationCredential "openai"` and passes it to `openai.embeddings.create({ model: selectedModel })` — the chat model (e.g., `gpt-4o`) is not an embedding model and the API returns a 404/400.
**Why it happens:** The OpenAI integration stores a chat completion model in `selectedModel`. Embedding models are a separate model family.
**How to avoid:** Always use `text-embedding-ada-002` (or `text-embedding-3-small` if upgrading) hardcoded for embeddings. The `selectedModel` from the credential applies only to classify/summarize chat calls.
**Warning signs:** `openai.BadRequestError: model not found` on embedding creation.

### Pitfall 6: Forgetting to Delete Stale DocumentEmbedding Rows on Re-ingest

**What goes wrong:** A file changes, is re-ingested, and a new Document row is upserted. But old `DocumentEmbedding` rows from the previous ingest remain. RAG search returns duplicate chunks.
**Why it happens:** The Document upsert updates the `Document` row but leaves orphaned `DocumentEmbedding` rows from prior chunk counts.
**How to avoid:** Before creating new `DocumentEmbedding` rows, delete all existing ones for the document: `prisma.documentEmbedding.deleteMany({ where: { documentId } })`. The `@@index([documentId])` index makes this fast.
**Warning signs:** RAG results return the same excerpt multiple times with different `chunkIndex` values.

### Pitfall 7: Missing Prisma Types for New Enums

**What goes wrong:** `IngestRun.status` and `IngestFile.status` are string fields in Prisma schema (not enums) — TypeScript type is `string`, not a union type.
**Why it happens:** The CONTEXT.md decision uses string literal types, not Prisma enums. Prisma doesn't generate union types for plain string fields.
**How to avoid:** Either: (a) define TypeScript union types explicitly in `ingest.types.ts` and cast/validate at boundaries, or (b) add Prisma enums to the schema (preferred for type safety). Either way, document the choice clearly.
**Warning signs:** `status: "PENDING"` (wrong case) slips through without type error.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### SHA-256 Hash (Node.js built-in)
```typescript
// Source: Node.js crypto docs
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

async function hashFile(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}
```

### mammoth Text Extraction
```typescript
// Source: mammoth npm docs + snyk.io/advisor pattern
import mammoth from 'mammoth';
import { readFile } from 'node:fs/promises';

async function parseDocx(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer: data });
  return result.value; // plain text, paragraphs separated by \n\n
}
```

### unpdf Text Extraction
```typescript
// Source: unjs/unpdf README
import { extractText, getDocumentProxy } from 'unpdf';
import { readFile } from 'node:fs/promises';

async function parsePdf(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
```

### chokidar v5 Watch with Initial Scan
```typescript
// Source: chokidar README (paulmillr/chokidar)
import chokidar from 'chokidar';

const watcher = chokidar.watch('/path/to/folder', {
  persistent: true,
  ignoreInitial: false,       // fire 'add' for pre-existing files
  awaitWriteFinish: {
    stabilityThreshold: 500,  // wait 500ms after last write before firing
    pollInterval: 100,
  },
});

watcher
  .on('add', (path) => { /* handle new/existing file */ })
  .on('change', (path) => { /* handle modified file */ })
  .on('error', (err) => { /* log error */ });

// Graceful shutdown
await watcher.close();
```

### OpenAI Embeddings
```typescript
// Source: openai npm SDK (already installed)
const embeddingResponse = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: chunkText,
});
const vector = embeddingResponse.data[0].embedding; // number[] of length 1536
```

### Prisma DocumentEmbedding Insert (raw SQL for vector column)
```typescript
// Source: Phase 10 migration + Prisma docs for unsupported types
// The 'embedding' column is Unsupported("vector(1536)") in Prisma schema
// Must use $executeRaw for inserts with vector data
await prisma.$executeRaw`
  INSERT INTO "DocumentEmbedding" ("id", "documentId", "chunkIndex", "chunkText", "embedding", "createdAt")
  VALUES (
    ${id},
    ${documentId},
    ${chunkIndex},
    ${chunkText},
    ${`[${vector.join(',')}]`}::vector,
    NOW()
  )
`;
```

**Critical note:** The `DocumentEmbedding.embedding` field is `Unsupported("vector(1536)")` in the Prisma schema. Prisma cannot generate typed methods for unsupported types — any insert or query involving the `embedding` column must use `prisma.$executeRaw` or `prisma.$queryRaw`. This is the established pattern from Phase 10 infrastructure; Phase 15 will also use raw SQL for similarity queries.

### Document Upsert (follows existing pattern)
```typescript
// Source: Device upsert pattern in intune.provider.ts
await prisma.document.upsert({
  where: {
    sourceSystem_sourceId: {
      sourceSystem: 'ingest',
      sourceId: absoluteFilePath,
    },
  },
  create: {
    sourceSystem: 'ingest',
    sourceId: absoluteFilePath,
    title,
    kind,
    summary,
    contentText,
    sourceUpdatedAt: new Date(),
    contentUpdatedAt: new Date(),
  },
  update: {
    title,
    kind,
    summary,
    contentText,
    sourceUpdatedAt: new Date(),
    contentUpdatedAt: new Date(),
  },
});
```

### Polling Pattern in React (UI)
```typescript
// Source: @tanstack/react-query docs (already installed)
const statusQuery = useQuery({
  queryKey: ['ingest', 'status'],
  queryFn: () => apiGet<IngestStatusResponse>('/api/ingest/status'),
  refetchInterval: (query) => {
    // Poll every 2s while running; stop when done or failed (D-22)
    return query.data?.run?.status === 'running' ? 2000 : false;
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pdf-parse` for PDF text | `unpdf` | ~2023 | unpdf uses PDF.js v5, better coverage, ESM-native |
| chokidar v3 CJS | chokidar v5 ESM-only | Nov 2025 | Must use ESM import; glob patterns removed (use Node.js `glob()` instead) |
| OpenAI `functions` API for structured output | `response_format: json_schema` with `strict: true` | Aug 2024 | More reliable JSON output, schema enforcement at API level |
| text-embedding-ada-002 only | text-embedding-3-small / text-embedding-3-large available | Jan 2024 | Phase 14 uses ada-002 (matches vector(1536) schema); Phase 15 could upgrade |
| Manual JSON parse + validation | `openai.beta.chat.completions.parse()` with Zod | 2024 | Cleaner TS types, but requires Zod dep; plain json_schema approach avoids Zod |

**Deprecated/outdated:**
- chokidar v3 `require('chokidar')`: Use `import chokidar from 'chokidar'` (v5)
- `pdf-parse`: Unmaintained; unpdf is the modern replacement
- OpenAI `functions` parameter: Superseded by `tools` + `response_format: json_schema`

---

## Open Questions

1. **Node.js runtime version**
   - What we know: chokidar v5 requires Node.js v20+
   - What's unclear: The runtime Node.js version is not verified in this environment (node command not in PATH during research)
   - Recommendation: Add a Wave 0 step to verify `node --version` output. If < v20, either install chokidar v4 (supports Node 14+) or upgrade Node. chokidar v4 API is identical for our use case (`add`/`change`/`close`) but supports both CJS and ESM.

2. **mammoth `buffer` vs `arrayBuffer` parameter**
   - What we know: Official docs show `{ arrayBuffer }` input; snyk advisor shows `{ buffer }` accepted
   - What's unclear: Whether current mammoth 1.12.0 accepts Node `Buffer` directly (separate from `ArrayBuffer`)
   - Recommendation: Use `{ buffer: await readFile(path) }` — mammoth historically accepted Node Buffer; if it fails at test time, switch to `{ arrayBuffer: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) }`.

3. **Structured outputs model compatibility**
   - What we know: `response_format: json_schema` with `strict: true` requires gpt-4o-mini, gpt-4o-2024-08-06, or newer
   - What's unclear: What model the operator has configured; older models (gpt-3.5-turbo) don't support strict structured outputs
   - Recommendation: Detect unsupported models at classify time — try `json_schema` first; fall back to `response_format: { type: 'json_object' }` with prompt-based JSON enforcement if the API returns a 400 for the schema parameter.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js v20+ | chokidar v5 | Unverified (node not in PATH during research) | Unknown | Use chokidar v4 if Node < v20 |
| PostgreSQL with pgvector | DocumentEmbedding writes | Assumed present (Phase 10 migration exists) | Unknown | — blocking if absent |
| OpenAI API key | Classification, embeddings | Configured via Phase 12 IntegrationCredential | Runtime | D-12: fail fast with "OpenAI not configured" |
| Source folder on disk | chokidar watch, file reads | Operator-configured at runtime | — | D-03: validated on save |
| Output folder on disk | File copy | Operator-configured at runtime | — | Create with `mkdir -p` if not exists |

**Missing dependencies with no fallback:**
- pgvector extension in PostgreSQL — if not enabled, `DocumentEmbedding` inserts via raw SQL will fail. Phase 10 migration `20260330_0003` already enables this extension; confirm it ran on the live DB.

**Missing dependencies with fallback:**
- OpenAI API key — fail fast per D-12, not a blocker for the parse/copy pipeline (could be extended to support a "no-AI mode" but that's out of scope for this phase)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (web), node:test (api) |
| Config file (web) | vitest.config.ts (inferred from web/package.json) |
| Quick run command | `pnpm --filter @agentsmith/api test` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INGEST-01 | `GET /api/settings` returns all settings as key/value map | unit | `pnpm --filter @agentsmith/api test` (settings.test.ts) | ❌ Wave 0 |
| INGEST-01 | `PUT /api/settings` upserts key/value pair, returns `{ ok: true }` | unit | same | ❌ Wave 0 |
| INGEST-01 | `PUT /api/settings` returns 400 if source === output | unit | same | ❌ Wave 0 |
| INGEST-01 | `GET /api/settings` requires auth (401 without session) | unit | same | ❌ Wave 0 |
| INGEST-02 | `parseDocx()` returns plain text from docx buffer | unit | `pnpm --filter @agentsmith/api test` (ingest.parsers.test.ts) | ❌ Wave 0 |
| INGEST-02 | `parsePdf()` returns plain text from pdf buffer | unit | same | ❌ Wave 0 |
| INGEST-03 | `classifyDocument()` returns kind within documentKinds union | unit | `pnpm --filter @agentsmith/api test` (ingest.service.test.ts) | ❌ Wave 0 |
| INGEST-03 | Unknown kind from OpenAI defaults to `infrastructure_note` | unit | same | ❌ Wave 0 |
| INGEST-04 | Hash dedup: file with same hash skips re-ingest | unit | same | ❌ Wave 0 |
| INGEST-04 | File with changed hash is re-ingested | unit | same | ❌ Wave 0 |
| INGEST-04 | Failed file does not block subsequent files | unit | same | ❌ Wave 0 |
| INGEST-05 | `POST /api/ingest/run` returns `{ runId }` immediately | unit | `pnpm --filter @agentsmith/api test` (ingest route test) | ❌ Wave 0 |
| INGEST-05 | `GET /api/ingest/status` returns `{ run: null }` with no runs | unit | same | ❌ Wave 0 |
| INGEST-05 | `GET /api/ingest/status` returns latest run with IngestFile array | unit | same | ❌ Wave 0 |
| INGEST-01 | IngestSection renders folder inputs and save button | unit (vitest) | `pnpm --filter @agentsmith/web test` (IntegrationsPage.test.tsx) | ❌ Wave 0 (extend existing) |
| INGEST-05 | Trigger button disabled when folders not configured | unit (vitest) | same | ❌ Wave 0 (extend existing) |

### Sampling Rate

- **Per task commit:** `pnpm --filter @agentsmith/api test` (fast, covers new unit tests)
- **Per wave merge:** `pnpm test` (full suite including web + e2e)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/routes/settings.test.ts` — covers INGEST-01 route behavior
- [ ] `apps/api/src/routes/ingest.test.ts` — covers INGEST-05 route behavior
- [ ] `apps/api/src/modules/ingest/ingest.parsers.test.ts` — covers INGEST-02 parser correctness
- [ ] `apps/api/src/modules/ingest/ingest.service.test.ts` — covers INGEST-03/04 dedup, classification, fail-isolation
- [ ] Extend `apps/web/src/routes/settings/IntegrationsPage.test.tsx` — add IngestSection assertions

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies To |
|-----------|------------|
| Credentials must never reach the browser — `GET /api/integrations/:key` returns `{ configured: boolean }` only | OpenAI key is read server-side via `decryptCredential`; never passed to any API response |
| Bootstrap endpoint must use `prisma.user.count` DB-backed guard | Not directly applicable to this phase (settings routes use session guard, not bootstrap check) |
| Session ID must be regenerated on every login | Not applicable to this phase (no new login paths) |
| Keep connector-specific logic isolated from internal domain models | Ingest logic lives in `modules/ingest/` and does NOT import from connector registry; interface via dependency injection |
| Treat write actions as high-trust operations requiring explicit review and auditability | `POST /api/ingest/run` requires authenticated session; file operations are server-side only |
| Do not revert unrelated work in the tree | Existing Phase 12 `IntegrationsPage.tsx` gets a third section appended — not refactored |
| Standard test command: `npx pnpm test` | All tests must pass under this command |

---

## Sources

### Primary (HIGH confidence)
- `apps/api/src/routes/integrations.ts` — injectable dependency pattern followed by settings.ts and ingest.ts
- `apps/api/src/modules/connectors/connector.registry.ts` — module-level singleton pattern for watcher
- `prisma/schema.prisma` §DocumentEmbedding — `Unsupported("vector(1536)")` field confirms raw SQL required for embedding inserts
- `apps/api/src/lib/credential-crypto.ts` — `decryptCredential` API for reading OpenAI key at runtime
- `apps/web/src/routes/settings/IntegrationsPage.tsx` — `IntegrationSection` component pattern for Ingest section
- chokidar README (paulmillr/chokidar) — v5 API, `ignoreInitial: false`, `awaitWriteFinish`, `watcher.close()`
- unjs/unpdf README — `extractText({ mergePages: true })` API

### Secondary (MEDIUM confidence)
- mammoth npm/snyk docs — `extractRawText({ buffer })` API; version 1.12.0 confirmed from npm search
- unpdf npm search — version 1.4.0 confirmed
- OpenAI Structured Outputs docs — `response_format: json_schema` with `strict: true`
- @tanstack/react-query docs — `refetchInterval` as function for conditional polling
- js-tiktoken npm — `getEncoding('cl100k_base')` for BPE tokenization

### Tertiary (LOW confidence)
- Node.js v20+ requirement for chokidar v5 — confirmed via WebSearch; not verified against runtime
- mammoth `buffer` vs `arrayBuffer` parameter — conflicting signals; Wave 0 verification step added

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified through existing package.json, WebSearch, and official READMEs
- Architecture: HIGH — patterns are directly lifted from existing codebase (connector.registry.ts, integrations.ts, IntegrationsPage.tsx)
- Pitfalls: MEDIUM — identified through official docs and known API constraints; some (Node version, mammoth buffer) require Wave 0 verification
- Prisma raw SQL for embeddings: HIGH — confirmed by `Unsupported("vector(1536)")` in schema.prisma

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable libraries; chokidar v5 very recent — watch for patch releases)
