# Feature Landscape: v1.2 Intune Integration

**Domain:** Solo IT ops console — Microsoft-centric, one-operator
**Researched:** 2026-03-30
**Scope:** Five new feature areas being added to the existing five-tool surface

---

## Context

The app already has Entra ID OAuth login, an asset health dashboard fed by seeded/mock data, lifecycle automation, network visibility, backup confidence, and a documentation assistant with PostgreSQL FTS + trigram keyword search. v1.2 adds live Intune data, credential management, first-run bootstrap, a document ingest pipeline, and RAG search. Research below covers what those features should actually do and feel like.

---

## Feature Area 1: First-Run Bootstrap

### What It Is

A one-time setup screen that runs when the app has no configured admin account. Creates a local username/password credential so the operator can access the app without Entra ID being pre-configured. Entra ID OAuth becomes optional rather than required.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-screen account creation (username, password, confirm password) | Users expect setup to be instant on fresh installs | Low | Password strength feedback in-line |
| Automatic redirect to login after account is created | Completing setup should drop the operator directly into their session | Low | Do not require them to navigate manually |
| Guard: only runs once | Re-accessing /setup after bootstrap is complete should redirect to /login or /dashboard | Low | Server-side flag, not just client-side route guard |
| Clear page title and purpose statement | Operator needs to know this is initial setup, not a standard login | Low | "Set up your admin account" — one sentence is enough |
| Password strength requirements stated before submit | Prevents confusion about why submission failed | Low | Show requirements as static text, not only on error |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Summary screen after account creation listing what to configure next | Points operator toward integrations settings without leaving them on a blank dashboard | Low | Two or three bullet links: add Intune credentials, add OpenAI key, review sync |
| Skip-link to OAuth path if Entra ID was already configured | Avoids confusion when operator reaches setup screen unintentionally | Low | "Already using Entra ID? Sign in here" as a secondary link |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Multi-step wizard with multiple screens | Overkill for one account — complexity hurts, not helps | Single-screen form with inline validation |
| Email verification or account recovery flow | This is a local admin account for a self-hosted tool; operator controls the server | Skip it. Recovery is a server-level concern |
| Asking for name, email, phone, or profile picture | Creates friction and stores irrelevant data | Username + password only |
| Forcing password change on first login | Operator just set the password — immediately asking to change it is patronizing | Skip it |

### Dependencies on Existing Architecture

- Needs a new `local_admin` credential store separate from Entra ID session management (does not conflict with existing Entra OAuth path)
- Setup guard logic lives in the Express router as middleware before the normal auth middleware runs
- Client-side route in React needs a `/setup` route that is not wrapped in ProtectedLayout

### Complexity: Low

---

## Feature Area 2: Integrations Settings Page

### What It Is

A settings page where the operator stores and verifies credentials for Intune (Microsoft Graph app registration) and OpenAI. Credentials are stored server-side and never exposed in full after entry. Each integration shows a connection health indicator.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Intune section: tenant ID, client ID, client secret input fields | Standard Azure app registration credentials — every Graph-connected tool asks for these | Low | Fields labeled clearly with help text linking to Azure portal |
| OpenAI section: API key field | Simplest possible OpenAI auth — standard pattern | Low | Single field |
| Save button per section (or per page) | Operator needs discrete save action, not auto-save for credentials | Low | Auto-save is wrong for secrets |
| Masked display after save (e.g., `••••••••abc123`) | Users expect saved secrets not to be shown in full | Low | Show last 6 chars or use full mask — never show full value |
| Connection test button per integration | Operator needs to verify credentials work before relying on sync | Low | Makes a lightweight API call, returns pass/fail |
| Connection health badge (connected / error / not configured) | Operators scan settings pages for status, not just read them | Low | Color + label: green "Connected", red "Error", grey "Not configured" |
| Last tested timestamp | Operator needs to know if the connection status is current or stale | Low | "Last verified: 3 hours ago" |
| Error message on failed connection test | Must tell the operator why it failed, not just that it did | Medium | Parse Graph/OpenAI error responses into readable messages |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Help text with link to "how to create an Azure app registration" | Solo operators may not know this workflow — saves a support lookup | Low | Static text, link to Microsoft docs |
| Required permission scopes listed inline | Operator needs to know which Graph permissions to grant | Low | DeviceManagementManagedDevices.Read.All, DeviceManagementApps.Read.All listed as copy-paste text |
| Re-test without re-entering credentials | Operator should be able to test the stored credential without having to type it again | Low | Test button operates on the stored value, not the masked display |
| Sync settings section: configurable sync interval (manual only vs scheduled) | Gives operator control over how aggressively data refreshes | Medium | Default: manual. Scheduled sync is a v1.2+ feature |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Storing credentials in the browser or localStorage | Security violation for app registration secrets | Server-side storage only, encrypted at rest |
| Showing the full secret value after first save | Exposes credentials in browser sessions | Show masked value; provide a "replace" flow instead |
| Single "Save all" button across all integrations | Mixing unrelated credential saves creates unexpected side effects | Save per integration section |
| Generic "Invalid credentials" error with no detail | Forces operator to guess what went wrong | Surface the actual API error (wrong tenant, insufficient permissions, etc.) |
| Auto-testing credentials on page load | Creates unnecessary API calls and potential noise | Test only on explicit user action |

### Dependencies on Existing Architecture

- Credentials encrypted at rest using an app-level secret key (existing pattern from connector isolation guideline in PROJECT.md)
- New `/api/settings/integrations` routes; does not modify existing asset health or lifecycle routes
- Connection health state should feed the existing connector health surface in the shell (SHELL-02 added connector health visibility)

### Complexity: Low–Medium (credential storage and masking are the only nontrivial parts)

---

## Feature Area 3: Intune Device Sync

### What It Is

A background sync that pulls live device data from Microsoft Graph and stores it in the existing PostgreSQL schema. The asset health dashboard, currently showing seeded/mock data, switches to showing real device records. The sync tracks freshness and surfaces a last-synced timestamp.

### Key Fields Available from Graph API (HIGH confidence — from official Microsoft Learn docs)

**Identity**
- `deviceName`, `id`, `azureADDeviceId`, `serialNumber`, `imei`, `udid`
- `userPrincipalName`, `userDisplayName`, `emailAddress`

**OS and Hardware**
- `operatingSystem`, `osVersion`, `model`, `manufacturer`
- `totalStorageSpaceInBytes`, `freeStorageSpaceInBytes`, `physicalMemoryInBytes`
- `isEncrypted`, `isSupervised`
- `androidSecurityPatchLevel` (Android only)

**Enrollment and Management**
- `enrolledDateTime`, `deviceEnrollmentType`, `managementAgent`
- `managedDeviceOwnerType` (company / personal)
- `managementState` (managed / retirePending / wiped / etc.)
- `enrollmentProfileName`
- `deviceRegistrationState`

**Sync Freshness**
- `lastSyncDateTime` — when the device last checked in with Intune
- `managementCertificateExpirationDate`

**Compliance**
- `complianceState`: compliant / noncompliant / inGracePeriod / unknown / notApplicable
- `complianceGracePeriodExpirationDateTime`
- `partnerReportedThreatState` (EDR signal)
- `jailBroken`

**Exchange / Conditional Access**
- `exchangeLastSuccessfulSyncDateTime`, `exchangeAccessState`, `exchangeAccessStateReason`

**Health Attestation (Windows)**
- `bitLockerStatus`, `secureBoot`, `codeIntegrity` via `deviceHealthAttestationState`

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Device inventory list showing all managed devices | Core ask — replaces mock data | Medium | Paginated, sortable |
| Per-device: name, OS/version, compliance state, last sync, enrollment date, owner | Every IT tool shows these fields | Low | Standard columns |
| Compliance state filter (compliant / noncompliant / in grace period / unknown) | Primary triage action in any Intune-adjacent tool | Low | Multi-select filter |
| Sync freshness indicator on the dashboard and sync status page | Operator must know how old the data is | Low | "Last synced: 12 minutes ago" with a manual trigger button |
| Manual sync trigger button | Operator needs on-demand refresh without waiting for a schedule | Low | POST /api/sync/intune, shows spinner while running |
| Error state when sync fails | Operator must see when sync broke and why | Low | Store last sync error in DB, surface in UI |
| Stale data warning if last sync is older than a configurable threshold | Prevents operator from acting on data they don't realize is stale | Low | Default threshold: 24 hours, yellow warning badge |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Compliance summary counts (X compliant, Y noncompliant, Z in grace period) at top of inventory | Gives operator a 5-second picture before scanning the list | Low | Already partially exists in asset health dashboard risk cards |
| Non-compliant devices sorted to the top by default | Reduces time to identify highest-risk devices | Low | Default sort order, overrideable |
| Device detail page showing all synced fields | Operator needs to drill into a specific device | Medium | Links from inventory row, back-link to inventory (FLOW-01/FLOW-02 requirement) |
| Sync history log (last N sync runs, timestamp, records updated, errors) | Operator needs to see if sync is running reliably over time | Medium | Lightweight table: timestamp, status, count |
| App inventory per device (via detectedApps endpoint) | Surfaces what software is installed without opening Intune | High | Separate sync pass; large data volume requires care |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Pulling every available Graph field on every sync | Unnecessary data volume; many fields are irrelevant to this tool | Select only the fields listed above; skip health attestation details initially |
| Real-time sync (polling Graph on every page load) | Graph API is rate-limited; real-time polling will cause throttling | Scheduled or manual sync with a cached result in PostgreSQL |
| Attempting write-back to Intune (remote wipe, retire, etc.) | High-trust destructive actions outside v1.2 scope | Read-only sync only in this milestone |
| Showing raw API field names to the operator | `userPrincipalName` is not useful labeling | Map to human-friendly labels: "Primary user", "Last check-in", etc. |
| Separate app inventory table before device inventory is stable | App data multiplies row count dramatically — manage complexity | Device inventory first, app inventory deferred or gated on phase flag |

### Dependencies on Existing Architecture

- Replaces seeded/mock data in the existing asset health dashboard; schema changes must preserve existing field names or migrate gracefully
- `lastSyncDateTime` from Graph maps directly to the "last check-in" concept already displayed in the asset dashboard
- Compliance state maps to the existing risk-scoring concepts in the asset health domain
- Connector isolation principle from PROJECT.md: Graph client code lives in a dedicated `intune` connector module, not mixed into domain models

### Complexity: Medium (Graph auth + sync job + schema migration + freshness UI)

---

## Feature Area 4: Document Ingest Pipeline

### What It Is

A background process that reads files from a configured source folder, parses them (md, txt, docx, pdf), sends each document to OpenAI for classification/summarization/tagging, and copies organized output to a structured output folder. Triggered either by a file-system watcher (automatic) or by a manual "Run ingest" button in the UI. Ingested documents get embeddings stored for RAG search.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ingest status list showing recent runs (file name, status, timestamp) | Operator needs to know what happened — black-box pipelines erode trust | Medium | Per-file rows: queued / processing / done / failed |
| Manual "Run ingest" trigger button | Operator needs to force a run without waiting for the watcher | Low | POST /api/ingest/run, shows progress |
| Per-file status: done / failed / processing | Binary "it worked" is not enough — operator needs to see which files failed | Low | Status badge per row |
| Error display per failed file | Operator must see why a file failed (parse error, OpenAI error, permission error) | Low | Expandable error message per row |
| Output folder organization visible in UI (category → file name) | Operator wants to see what the AI did with their files | Medium | Read from the output folder and display tree or list |
| Supported formats: md, txt, docx, pdf | These are the four formats listed in the milestone scope | Medium | pdf requires a parsing library (pdfjs-dist or pdf-parse); docx requires mammoth |
| Configuration: source folder path, output folder path | Operator needs to set these paths, not hard-code them | Low | Settings section, persisted server-side |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| File-system watcher (auto-ingest on file drop) | Eliminates the need to remember to trigger manually | Medium | chokidar is the standard Node.js watch library; needs start/stop lifecycle tied to app startup |
| AI-generated summary visible per document | Lets operator validate what the AI extracted without opening the source file | Low | Stored at ingest time, displayed in doc detail view |
| AI-generated tags visible per document | Makes searchability visible before the operator queries | Low | Stored as array in DB |
| Re-ingest button per file | Allows operator to re-process a file after correcting it | Low | POST /api/ingest/file/:id |
| Ingest queue depth indicator | Tells operator how many files are pending during a large batch | Low | COUNT from a queue table |
| Skip-already-processed guard with override | Prevents re-processing unchanged files; override lets operator force re-run | Low | Hash-based deduplication or file modified-time check |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Polling OpenAI synchronously per file in the HTTP request | Blocks the API thread; large files or batches will time out | Queue-based processing: enqueue on trigger, process asynchronously |
| Storing raw file content in PostgreSQL as large blobs | Unmanageable for large docs, makes backups heavy | Store only extracted text, summary, tags, and embeddings; leave source files on disk |
| Deleting source files after ingest | Irreversible; operator expects source files to remain | Copy to output folder; never delete source |
| Showing only a "done" / "failed" binary status | Operator cannot debug or improve prompts | Show per-file status + error detail + AI output |
| Auto-classifying into a deeply nested folder hierarchy | AI-generated folder trees become hard to navigate | Two levels max: category / file name |
| Processing files without any rate-limit awareness | OpenAI rate limits will cause silent failures on large batches | Implement a retry with exponential backoff; surface rate-limit errors clearly |

### Dependencies on Existing Architecture

- OpenAI key comes from the integrations settings page (Feature Area 2 above)
- Output documents feed the Documentation Assistant's existing search surface — schema must extend the existing `documents` table, not replace it
- Embeddings require pgvector extension on PostgreSQL (or a sidecar vector store); this is the key architectural dependency for RAG
- chokidar watcher lifecycle must be managed in the Express app startup/shutdown sequence
- File parsing libraries (pdf-parse, mammoth) are server-side Node.js only — no browser-side parsing

### Complexity: High (async queue + multiple parsers + OpenAI integration + embedding storage + file system management)

---

## Feature Area 5: RAG Search

### What It Is

A natural-language search experience over the ingested document corpus. At query time, the operator's question is embedded, the nearest document chunks are retrieved from the vector store, and GPT synthesizes a direct answer with citations. The existing keyword search (PostgreSQL FTS + trigram) remains available as a fallback or secondary mode.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Natural language query input replacing or augmenting the existing keyword search box | Operators expect to type a question, not compose a Boolean query | Low | Single input, same search surface as today |
| Synthesized answer displayed above source list | Operator wants the answer, not just a list of documents | Medium | GPT response with a hard prompt instructing it to cite sources |
| Source citations listed below the answer (document name, excerpt) | Without citations, the answer cannot be trusted or verified | Medium | Map chunk back to source document; display title + short excerpt |
| Fallback to keyword search when no embeddings exist | Not all documents may be ingested yet; keyword search must not disappear | Low | If embedding search returns 0 results, fall through to existing FTS |
| Loading state during synthesis | GPT calls take 1-5 seconds; operator needs to see something is happening | Low | Spinner or "Thinking..." state |
| Error handling when OpenAI is unavailable | Operators must not see a blank page when the AI is down | Low | Show error message + offer keyword search as fallback |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Search mode" toggle: AI synthesis vs keyword only | Some operators will distrust AI answers and want the traditional results | Low | Toggle in the search UI; persisted in session |
| Confidence signal on the answer ("Based on 3 documents") | Sets correct expectations — not a hallucination, grounded in real files | Low | Append source count to the synthesis response |
| Direct link from citation to full document view | Operator should be able to read the source without hunting | Low | Existing document detail route already exists |
| Query history (last N searches) | Repeat queries are common in IT ops ("show me the firewall rules again") | Low | In-session history; not persisted to DB unless the effort is minimal |
| Scope filter: search only in a specific document category | IT admin may want to restrict search to "network procedures" or "SOPs" only | Medium | Passes category filter to the retrieval step |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Removing keyword search in favor of RAG only | Not all docs will have embeddings; reliability requires both paths | Keep both; RAG is additive, not a replacement |
| Showing the raw GPT response without citations | Hallucinations are invisible without grounding | Always cite sources; reject or flag responses that cannot be grounded |
| Streaming the GPT response token-by-token | Adds frontend complexity; synthesized answers are short enough to wait for | Fetch complete response, display when done |
| Sending the full document text to GPT as context | Token limits and cost; full documents often exceed context windows | Chunk at ingest, retrieve only relevant chunks at query time |
| Allowing arbitrary RAG queries against non-document data (device records, network data) | Out of scope for v1.2; can mislead the operator | Restrict RAG to the document corpus only |
| Caching synthesized answers across operators or sessions | Stale or wrong answers served from cache destroy trust | No caching of GPT synthesis; cache only embeddings and chunk retrieval |

### Dependencies on Existing Architecture

- Requires embeddings stored in pgvector (set up during ingest pipeline — Feature Area 4 dependency)
- OpenAI key from integrations settings (Feature Area 2 dependency)
- Extends the existing Documentation Assistant search route — same page, enhanced search behavior
- The existing FTS + trigram keyword path remains as a fallback and must not be removed or broken during this feature addition
- Chunking strategy at ingest time directly affects retrieval quality at query time — these two features must be designed together

### Complexity: Medium (retrieval logic + prompt engineering + citation rendering + fallback handling; heavy lifting is in ingest, not query)

---

## Feature Dependencies Map

```
Feature Area 2 (Integrations / Credentials)
  └── Feature Area 3 (Intune Sync)       — needs Intune credentials
  └── Feature Area 4 (Document Ingest)   — needs OpenAI key
      └── Feature Area 5 (RAG Search)    — needs embeddings from ingest

Feature Area 1 (Bootstrap)
  └── Standalone — no dependencies on other new features
      └── Enables operator to reach Feature Area 2

Feature Area 3 (Intune Sync)
  └── Feeds existing Asset Health Dashboard — existing feature dependency
```

**Build order implied by dependencies:**
1. Bootstrap (unblocked, unlocks app access)
2. Integrations settings (unblocks 3, 4, 5)
3. Intune sync (needs credentials; feeds existing dashboard)
4. Ingest pipeline (needs OpenAI key; sets up embeddings for RAG)
5. RAG search (needs embeddings; extends existing search)

---

## MVP Recommendation

**Prioritize in v1.2:**
1. Bootstrap — low complexity, high unlock value (removes Entra ID as hard dependency)
2. Integrations settings — gates everything else; no other feature works without it
3. Intune sync — replaces mock data with real data; validates the app's core value proposition
4. Ingest pipeline (core flow: parse + classify + embed) — enables RAG
5. RAG search (retrieval + synthesis + citation) — completes the documentation assistant

**Defer within v1.2 or to v1.3:**
- App inventory per device (high data volume, high complexity, limited immediate value vs device inventory)
- Sync scheduler / configurable interval (manual sync is sufficient for v1.2)
- Scope filter on RAG search (nice to have, not table stakes)
- Query history persistence (session-only history is fine for v1.2)
- Deep ingest analytics / pipeline metrics dashboard

---

## Sources

- Microsoft Graph API — managedDevice resource: https://learn.microsoft.com/en-us/graph/api/intune-devices-manageddevice-list?view=graph-rest-1.0
- Microsoft Graph — Intune concept overview: https://learn.microsoft.com/en-us/graph/intune-concept-overview
- Intune compliance policies: https://learn.microsoft.com/en-us/intune/intune-service/protect/device-compliance-get-started
- Setup wizard UX best practices: https://blog.logrocket.com/ux-design/creating-setup-wizard-when-you-shouldnt/ (MEDIUM confidence — UX blog, verified against enterprise UX patterns)
- RAG citation patterns: https://www.tensorlake.ai/blog/rag-citations (MEDIUM confidence)
- RAG knowledge base UX: https://blog.helpdocs.io/rag-knowledge-base/ (MEDIUM confidence)
- Integration settings auth patterns: https://prismatic.io/blog/making-best-auth-decisions-saas-integrations/ (MEDIUM confidence)
