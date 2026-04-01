---
phase: 14-document-ingest-pipeline
plan: "01"
subsystem: api
tags: [prisma, fastify, mammoth, unpdf, chokidar, js-tiktoken, typescript]

requires:
  - phase: 10-schema-and-credential-foundation
    provides: "DocumentEmbedding pgvector table (added here for worktree compatibility)"

provides:
  - "AppSetting, IngestRun, IngestFile Prisma models with migration SQL"
  - "GET /api/settings and PUT /api/settings routes with auth guard and same-path validation"
  - "ingest.types.ts: IngestFileStatus, IngestRunStatus, IngestTriggeredBy, ParseResult, ClassifyResult"
  - "ingest.parsers.ts: parseDocx, parsePdf, parsePlainText, parseFile, isSupportedFile"
  - "chokidar v5, mammoth, unpdf, js-tiktoken dependencies installed"

affects:
  - 14-02-plan (file watcher uses AppSetting for folder config, ingest.parsers for processing)
  - 14-03-plan (OpenAI classify/embed uses ParseResult from ingest.parsers)
  - 14-04-plan (UI reads/writes settings via new GET/PUT /api/settings routes)

tech-stack:
  added:
    - "chokidar v5 (file watcher — installed now, used in Plan 02)"
    - "mammoth v1.12 (docx text extraction)"
    - "unpdf v1.4 (pdf text extraction)"
    - "js-tiktoken v1.0 (token counting — installed now, used in Plan 03)"
  patterns:
    - "Injectable dependency pattern: registerXxxRoutes(app, { prisma, authService, onXxxChanged? })"
    - "TDD Red-Green for all new routes and modules"
    - "path.resolve() on folder inputs to normalize cross-platform paths"

key-files:
  created:
    - "prisma/migrations/20260401_0001_app_setting_ingest_models/migration.sql"
    - "apps/api/src/modules/ingest/ingest.types.ts"
    - "apps/api/src/modules/ingest/ingest.parsers.ts"
    - "apps/api/src/modules/ingest/__tests__/ingest.parsers.test.ts"
    - "apps/api/src/modules/ingest/__tests__/fixtures/sample.txt"
    - "apps/api/src/modules/ingest/__tests__/fixtures/sample.md"
    - "apps/api/src/routes/settings.ts"
    - "apps/api/src/routes/__tests__/settings.test.ts"
  modified:
    - "prisma/schema.prisma (added AppSetting, IngestRun, IngestFile, DocumentEmbedding models; added ingestFiles and embeddings relations to Document)"
    - "apps/api/src/server.ts (import and register registerSettingsRoutes)"
    - "apps/api/package.json (chokidar, mammoth, unpdf, js-tiktoken)"

key-decisions:
  - "DocumentEmbedding model added to this worktree's schema since it was not yet present (worktree based on v1.1 milestone, pre-Phase 10)"
  - "path.resolve() applied to folder path values in PUT /api/settings to normalize trailing slashes and handle cross-platform paths"
  - "onSourceFolderChanged callback only fires when the source folder value actually changes (checked against existing DB value), not on every PUT"
  - "Test assertions for folder paths use resolve() to produce platform-correct expected values"

patterns-established:
  - "Settings routes follow the same injectable dependency pattern as integrations.ts"
  - "TDD applied: failing tests committed before implementation for both tasks"
  - "Parser module uses switch-on-extension dispatch; throws clearly for unsupported types"

requirements-completed:
  - INGEST-01
  - INGEST-02

duration: 10min
completed: 2026-04-01
---

# Phase 14 Plan 01: Document Ingest Pipeline Foundation Summary

**AppSetting/IngestRun/IngestFile Prisma models + authenticated settings API (GET/PUT /api/settings) + mammoth/unpdf document parsers with 87 passing tests**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-01T00:03:59Z
- **Completed:** 2026-04-01T00:13:59Z
- **Tasks:** 2
- **Files modified:** 9 (plus 3 new test fixtures/directories)

## Accomplishments

- Three new Prisma models (AppSetting, IngestRun, IngestFile) defined with correct fields, relations, and a SQL migration file including DocumentEmbedding
- Authenticated GET/PUT /api/settings routes with same-path folder validation and optional watcher callback
- Four document parsers (parsePlainText, parseDocx, parsePdf, parseFile) plus isSupportedFile filter
- All four required packages (chokidar, mammoth, unpdf, js-tiktoken) installed in @agentsmith/api
- Full test suite: 87 tests passing (72 existing + 9 settings + 15 parser tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema + migration + types + settings routes** - `c072eac` (feat)
2. **Task 2: Document parsers with tests** - `2e8efb9` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added AppSetting, IngestRun, IngestFile, DocumentEmbedding models; ingestFiles and embeddings relations to Document
- `prisma/migrations/20260401_0001_app_setting_ingest_models/migration.sql` - CREATE TABLE for all 4 new tables with FK constraints and indexes
- `apps/api/src/modules/ingest/ingest.types.ts` - IngestFileStatus, IngestRunStatus, IngestTriggeredBy, ParseResult, ClassifyResult
- `apps/api/src/routes/settings.ts` - GET/PUT /api/settings with auth guard, same-path validation, onSourceFolderChanged callback
- `apps/api/src/routes/__tests__/settings.test.ts` - 9 tests covering GET, PUT, 401, 400 same-path, callback
- `apps/api/src/modules/ingest/ingest.parsers.ts` - parseDocx (mammoth), parsePdf (unpdf), parsePlainText (fs), parseFile (dispatch), isSupportedFile
- `apps/api/src/modules/ingest/__tests__/ingest.parsers.test.ts` - 15 tests covering all parsers and isSupportedFile
- `apps/api/src/modules/ingest/__tests__/fixtures/sample.txt` - "Hello from sample text file"
- `apps/api/src/modules/ingest/__tests__/fixtures/sample.md` - Sample markdown fixture
- `apps/api/src/server.ts` - Import and register registerSettingsRoutes
- `apps/api/package.json` - Added chokidar, mammoth, unpdf, js-tiktoken

## Decisions Made

- **DocumentEmbedding model added locally**: This worktree is based on the v1.1 milestone (pre-Phase 10). The main branch has Phase 10 schema changes, but this worktree does not. Added DocumentEmbedding here to satisfy the IngestFile→Document relation requirements without breaking anything.
- **path.resolve() on folder paths**: Folder inputs are normalized via `resolve()` to handle trailing slashes and relative paths consistently. Test assertions updated to use `resolve()` for platform-correct expected values (Windows produces backslash paths).
- **onSourceFolderChanged only fires on actual change**: The callback fires only when the stored source folder value differs from the incoming value, avoiding unnecessary watcher restarts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shared package dist was missing in worktree**
- **Found during:** Initial test run
- **Issue:** `@agentsmith/shared/dist/env.js` not built in worktree; all route-level tests failing
- **Fix:** Ran `pnpm --filter @agentsmith/shared build` to compile the shared package
- **Files modified:** packages/shared/dist/ (generated, not committed)
- **Verification:** Route tests started passing after build
- **Committed in:** Not committed (generated output)

**2. [Rule 3 - Blocking] Prisma client not generated in worktree**
- **Found during:** Initial test run
- **Issue:** `@prisma/client` did not provide `Prisma` export; new models not available
- **Fix:** Ran `pnpm --filter @agentsmith/api prisma:generate`; re-ran after schema additions
- **Files modified:** node_modules (generated, not committed)
- **Verification:** Tests pass after generation
- **Committed in:** Not committed (generated output)

**3. [Rule 1 - Bug] Test path assertions fixed for Windows**
- **Found during:** Task 1 settings tests
- **Issue:** Tests used Unix paths (`/tmp/src`, `/new/path`) but `resolve()` on Windows produces backslash paths (`F:\tmp\src`)
- **Fix:** Updated test assertions to use `resolve()` for comparison or to check for path components
- **Files modified:** `apps/api/src/routes/__tests__/settings.test.ts`
- **Verification:** All 9 settings tests pass on Windows
- **Committed in:** c072eac (Task 1 commit)

---

**Total deviations:** 3 (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes essential for functionality. No scope creep.

## Issues Encountered

- The worktree schema was at the v1.1 baseline — missing Phase 10-13 models. Added DocumentEmbedding and the Document relations here, consistent with the Phase 14 plan's schema spec. No conflict expected since parallel worktrees work on different branches.

## Known Stubs

None — all implemented functionality is wired and tested.

## Next Phase Readiness

- Plan 02 (file watcher) can import from `ingest.parsers.ts` and use `AppSetting` for folder config
- Plan 03 (OpenAI classify/embed) can import from `ingest.types.ts` for type contracts
- Plan 04 (UI) can call GET/PUT /api/settings to manage folder configuration
- chokidar and js-tiktoken are installed and ready to use

---
*Phase: 14-document-ingest-pipeline*
*Completed: 2026-04-01*
