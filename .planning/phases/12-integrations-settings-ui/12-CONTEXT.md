# Phase 12: Integrations Settings UI - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Give the operator a secure in-app page to configure and verify Intune and OpenAI credentials. Delivers:

1. `/settings` route — `IntegrationsPage` with two sections: Intune and OpenAI
2. Per-section credential save (Intune saves independently from OpenAI)
3. Credential masking — secrets never returned to the browser
4. Test-connection button per integration with pass/fail feedback
5. Last-verified timestamp and health badge per integration (CRED-04)
6. `ensureSystemKey` wired into API startup (deferred from Phase 10)
7. New `/api/integrations` routes (GET status, PUT save, POST test-connection)

No new operational modules. No write automation beyond credential storage.

</domain>

<decisions>
## Implementation Decisions

### Credential masking — what the form shows on page load
- **D-01:** Secret fields (Intune `clientSecret`, OpenAI `apiKey`) load **empty** on every page load. A "Configured" badge beside the field label indicates the secret exists. Blank submission on save means "keep existing value unchanged."
- **D-02:** Non-secret fields (`tenantId`, `clientId`) load **pre-filled** with their saved values. These are not secrets — showing them lets the operator confirm configuration without re-entering. Consistent with how `GET /api/integrations/:key` returns `{ configured: boolean }` for secrets but can return non-secret fields.
- **D-03:** The "Configured" badge is only shown when the value is already saved. New installs with no credentials show nothing beside the label.

### Test-connection feedback — three-layer response
- **D-04:** Test-connection response uses three simultaneous layers:
  1. **Toast** — fires immediately on response (auto-dismissing, ~4s) for instant "action completed" signal
  2. **Inline result** — appears beneath the "Test connection" button; stays visible until the next test or next save; shows actionable error text on failure (e.g. "Auth failed: invalid client secret")
  3. **Health badge** — updates in-place on the section header to reflect the latest test outcome (pass/fail/untested)
- **D-05:** The inline result uses the same error/success visual language as `SetupPage` — green border/background for success, red/warm for failure.

### Health badge — always visible
- **D-06:** The health status row is **always visible** on page load, for both integrations. Before any test has run: shows "Not yet verified." After a test: shows last-verified timestamp and pass/fail state. Mirrors `ConnectorStatusPage`'s always-visible freshness approach.
- **D-07:** Health state persists in the `IntegrationCredential` row (new fields: `lastTestedAt DateTime?`, `lastTestResult String?`). This means the status survives page refreshes and server restarts — not in-memory state.

### Settings nav placement
- **D-08:** `/settings` appears in the **utility nav** (sidebar utility section), alongside Connectors and Audit Log, as the 4th utility item. The `settings` icon SVG is already defined in `router.tsx` `SidebarIcon`.
- **D-09:** Sidebar label: **"Integrations"** — specific to what's on the page. Can be broadened to "Settings" in a later phase if more config categories are added.

### API routes
- **D-10:** `GET /api/integrations/:key` — returns `{ configured: boolean, tenantId?: string, clientId?: string, lastTestedAt?: string, lastTestResult?: string }`. Never returns secrets. `:key` is `"intune"` or `"openai"`.
- **D-11:** `PUT /api/integrations/:key` — accepts partial credential fields; blank/absent secret fields mean "keep existing." Returns `{ ok: true }`.
- **D-12:** `POST /api/integrations/:key/test` — reads the stored credential, attempts a real connection, returns `{ ok: boolean, message: string }`. Persists `lastTestedAt` and `lastTestResult` on the credential row.
- **D-13:** All three routes require an authenticated session (standard session guard, same as all other protected routes).

### ensureSystemKey startup wiring
- **D-14:** `ensureSystemKey` is called during `server.ts` startup (before routes are registered), storing the result in a module-level variable accessible to credential read/write operations. This was deferred from Phase 10 — Phase 12 activates it.

### Claude's Discretion
- Exact form layout within sections (grid vs. flex, label width)
- Toast library or custom toast implementation — keep it minimal, no heavy dependency
- Loading/pending states during save and test-connection operations
- Exact wording of human-readable failure hints per integration type

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §"Phase 12: Integrations Settings UI" — Goal, success criteria (4 items), depends on Phase 10
- `.planning/REQUIREMENTS.md` §"Integrations Settings" — CRED-01, CRED-02, CRED-03, CRED-04

### Security invariants
- `CLAUDE.md` §"Key Security Invariants" — Credentials never reach browser; session guard on all routes

### Phase 10 infrastructure this phase activates
- `apps/api/src/lib/credential-crypto.ts` — `encryptCredential`, `decryptCredential`
- `apps/api/src/lib/system-key.ts` — `ensureSystemKey` (must be wired into `server.ts` startup in this phase)
- `prisma/schema.prisma` — `IntegrationCredential` table (already migrated); may need `lastTestedAt` / `lastTestResult` fields added

### Existing code to extend
- `apps/web/src/router.tsx` — `appRoutes`, `utilityItems` array, `SidebarIcon` (settings case already defined)
- `apps/web/src/routes/connectors/ConnectorStatusPage.tsx` — health badge and status row visual pattern to follow
- `apps/web/src/routes/SetupPage.tsx` — form input, error/success message visual language
- `apps/web/src/lib/api.ts` — `apiGet`, `apiRequest` utilities
- `apps/api/src/server.ts` — startup hook for `ensureSystemKey`
- `apps/api/src/routes/bootstrap.ts` — route registration pattern to follow for new integrations routes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/PageTitle.tsx` — standard page heading component, used on all protected route pages
- `apps/web/src/lib/api.ts` `apiGet` / `apiRequest` — standard fetch wrapper with credentials, error handling
- `apps/api/src/lib/credential-crypto.ts` — `encryptCredential` / `decryptCredential` — ready to use
- `apps/api/src/lib/system-key.ts` — `ensureSystemKey` — ready to wire into startup
- `router.tsx` `SidebarIcon` "settings" case (line ~109) — SVG icon already defined, just needs a route entry

### Established Patterns
- All protected route pages: inline styles, `PageTitle` at top, dark card panels (`background: "rgba(10, 17, 11, 0.97)"`, `border: "1px solid rgba(148, 163, 184, 0.22)"`)
- Health/freshness state: `ConnectorStatusPage` badge pattern (`toneForState`, colored pill badges)
- Forms: `SetupPage` pattern — green uppercase labels, dark input backgrounds, green gradient submit button
- API routes: registered with `registerXxxRoutes(app, options)` pattern, session guard via `options.authService`

### Integration Points
- `apps/web/src/router.tsx` `utilityItems` array — add `{ to: "/settings", label: "Integrations", icon: "settings" }` entry
- `apps/api/src/server.ts` — add `ensureSystemKey` call before route registration; pass the key into integrations route handler
- `prisma/schema.prisma` `IntegrationCredential` — may need `lastTestedAt DateTime?` and `lastTestResult String?` fields + migration

</code_context>

<specifics>
## Specific Ideas

- "Always empty" for secret fields with a "Configured" badge — user's explicit choice
- "Pre-filled" for non-secret fields (tenantId, clientId) — user's explicit choice
- All three test-connection feedback layers (toast + inline + badge) — user's explicit choice ("can we do all three?")
- Health badge always visible (not only after first test) — mirrors ConnectorStatusPage pattern
- Sidebar label: "Integrations" not "Settings" — keeps it specific to this phase's scope

</specifics>

<deferred>
## Deferred Ideas

- Folder path configuration for document ingest (source folder, output folder) — INGEST-01 scope, belongs in Phase 14
- General app settings beyond integrations (user management, notifications) — post-v1.2
- Re-wrap utility for SystemKey when SESSION_SECRET is rotated — post-v1.2 operational tooling
- Broadening the sidebar label from "Integrations" to "Settings" — when more config categories exist

</deferred>

---

*Phase: 12-integrations-settings-ui*
*Context gathered: 2026-03-30*
