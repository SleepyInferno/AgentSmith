---
phase: 12-integrations-settings-ui
verified: 2026-03-31T00:00:00Z
status: human_needed
score: 15/15 must-haves verified
re_verification: false
human_verification:
  - test: "Visual inspection of /settings page in a running browser"
    expected: "Dark card panels for Intune and OpenAI sections, green labels, health badge visible, Configured badge visible when credentials are saved, toast fires on Save and Test connection, inline result appears beneath Test button"
    why_human: "Visual styling, layout correctness, toast animation, and real credential test-connection behavior cannot be verified programmatically"
  - test: "Save + Test connection round-trip with real Intune credentials (optional)"
    expected: "POST /api/integrations/intune saves encrypted row, POST /api/integrations/intune/test returns ok:true or a specific auth error, lastTestedAt timestamp updates in health row"
    why_human: "Requires live Azure AD tenant — cannot be verified without external credentials"
---

# Phase 12: Integrations Settings UI Verification Report

**Phase Goal:** Integrations Settings UI — credential forms for Intune and OpenAI with masked secrets, test-connection, health badges, and full E2E coverage.
**Verified:** 2026-03-31
**Status:** human_needed (all automated checks passed; visual sign-off pending)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths are drawn from the `must_haves` frontmatter in Plans 01, 02, and 03.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/integrations/intune returns configured:false and no secrets when no credential row exists | VERIFIED | Route returns `{ configured: false, lastTestedAt: null, lastTestResult: null }` — no `clientSecret` or `apiKey` key in any return object |
| 2 | PUT /api/integrations/intune saves encrypted credential and returns ok:true | VERIFIED | Route calls `encryptCredential` before upsert, returns `{ ok: true }` |
| 3 | PUT /api/integrations/intune with blank clientSecret preserves the existing secret | VERIFIED | Merge logic at lines 158–162 of integrations.ts: blank/empty `clientSecret` retains `existingCred.clientSecret` |
| 4 | GET /api/integrations/intune never returns clientSecret or apiKey fields | VERIFIED | Return objects at lines 107–123 contain `configured`, `tenantId`, `clientId`, `lastTestedAt`, `lastTestResult` — no secret keys |
| 5 | POST /api/integrations/intune/test persists lastTestedAt and lastTestResult on the credential row | VERIFIED | Lines 266–270: `prisma.integrationCredential.update({ data: { lastTestedAt: new Date(), lastTestResult: ... } })` |
| 6 | All integration routes require an authenticated session | VERIFIED | `requireAuth` preHandler on all three route handlers; 401 test passes |
| 7 | ensureSystemKey runs at server startup before routes are registered | VERIFIED | `apps/api/src/server.ts` imports and calls `ensureSystemKey` in `start()` before `app.listen`; injectable `systemKey` in `BuildServerOptions` |
| 8 | Operator can navigate to /settings via the Integrations link in sidebar utility nav | VERIFIED | `router.tsx` line 44: `{ to: "/settings", label: "Integrations", icon: "settings" }` in `utilityItems`; Playwright test confirms navigation |
| 9 | Operator sees Intune section with tenantId, clientId, clientSecret fields and a Save button | VERIFIED | `IntegrationsPage.tsx` renders `IntegrationSection` with `intuneFields` array containing all three fields; E2E test asserts field presence |
| 10 | Operator sees OpenAI section with apiKey field and a Save button | VERIFIED | `IntegrationsPage.tsx` renders `IntegrationSection` with `openaiFields`; E2E test confirms |
| 11 | Secret fields (clientSecret, apiKey) are always empty on page load | VERIFIED | `getFieldValue` returns `formValues[field.name] ?? ""` for secret fields, initialized to `""` from `useState`; unit test asserts empty value |
| 12 | Non-secret fields (tenantId, clientId) are pre-filled with saved values | VERIFIED | `getFieldValue` falls back to `data?.tenantId` and `data?.clientId` when local state is `""`; unit test asserts pre-fill |
| 13 | A Configured badge appears next to secret field labels when credential is saved | VERIFIED | Lines 199–215: renders `<span>Configured</span>` when `field.isSecret && data?.configured === true`; unit test + E2E confirm |
| 14 | Test connection button shows pass/fail result inline, fires a toast, and updates the health badge | VERIFIED | `testMutation.onSuccess` calls `setTestResult`, `showToast`, and `queryClient.invalidateQueries`; inline `<div role="status">` renders result; E2E test clicks button and asserts "Connected successfully" |
| 15 | Health status row is always visible showing "Not yet verified" or last-verified timestamp | VERIFIED | Lines 176–179: always-rendered div showing `lastTestedAt ? "Last verified: ..." : "Not yet verified"`; unit test asserts 2x "Not yet verified"; E2E asserts text present |

**Score:** 15/15 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/routes/integrations.ts` | GET, PUT, POST /test handlers for intune and openai, exports `registerIntegrationRoutes` | VERIFIED | 277 lines; exports `registerIntegrationRoutes`; imports `encryptCredential`, `decryptCredential`, `ClientSecretCredential`, `OpenAI` |
| `apps/api/src/routes/integrations.test.ts` | Unit tests for all integration route behaviors, min 100 lines | VERIFIED | 353 lines; 14 test cases covering CRED-01 through CRED-04, auth guard, invalid key |
| `prisma/migrations/20260330_0004_integration_credential_test_fields/migration.sql` | lastTestedAt and lastTestResult columns on IntegrationCredential, contains ALTER TABLE | VERIFIED | Contains `ALTER TABLE "IntegrationCredential" ADD COLUMN "lastTestedAt" TIMESTAMP(3), ADD COLUMN "lastTestResult" TEXT` |
| `prisma/schema.prisma` | Updated IntegrationCredential model with lastTestedAt and lastTestResult | VERIFIED | Lines 543–544 contain `lastTestedAt   DateTime?` and `lastTestResult String?` |
| `apps/web/src/routes/settings/IntegrationsPage.tsx` | Full integrations page with Intune + OpenAI sections, min 150 lines | VERIFIED | 451 lines; renders both `IntegrationSection` components and `ModelSelector` |
| `apps/web/src/hooks/useToast.ts` | Minimal auto-dismiss toast hook, exports `useToast` | VERIFIED | 16 lines; exports `useToast` with auto-dismiss via `setTimeout` |
| `apps/web/src/components/Toast.tsx` | Toast overlay component, exports `Toast` | VERIFIED | 42 lines; exports `Toast`; absolutely positioned overlay with success/error variants |
| `apps/web/src/routes/settings/IntegrationsPage.test.tsx` | Vitest unit tests for IntegrationsPage, min 50 lines | VERIFIED | 248 lines; 8 test cases using `@testing-library/react` and React Query provider |
| `apps/web/tests/settings.spec.ts` | Playwright E2E tests for /settings route, min 30 lines | VERIFIED | 62 lines; 7 E2E test cases |
| `apps/web/src/test/mockApi.ts` | Mock API handlers containing `api/integrations` | VERIFIED | Line 914–944: 6 integration endpoint handlers (GET/PUT intune, POST intune/test, GET/PUT openai, POST openai/test) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/src/server.ts` | `apps/api/src/lib/system-key.ts` | `ensureSystemKey` call in `start()` | VERIFIED | Lines 33, 221: imported and called before `app.listen` |
| `apps/api/src/routes/integrations.ts` | `apps/api/src/lib/credential-crypto.ts` | `encryptCredential`/`decryptCredential` calls | VERIFIED | Line 4: imports both; used at lines 103, 143, 177, 211, 252 |
| `apps/api/src/server.ts` | `apps/api/src/routes/integrations.ts` | `registerIntegrationRoutes` registration | VERIFIED | Lines 32, 199: imported and registered with `prisma`, `authService`, `systemKey` |
| `apps/web/src/router.tsx` | `apps/web/src/routes/settings/IntegrationsPage.tsx` | Route registration at `/settings` | VERIFIED | Lines 19, 225: imported and registered as `{ path: "settings", element: <IntegrationsPage /> }` |
| `apps/web/src/routes/settings/IntegrationsPage.tsx` | `/api/integrations/intune` and `/api/integrations/openai` | `apiGet` and `apiRequest` fetch calls | VERIFIED | Lines 69, 102, 126: `apiGet` in query, `apiRequest` in save and test mutations |
| `apps/web/src/router.tsx` | `utilityItems` array | Sidebar nav entry at `/settings` | VERIFIED | Line 44: `{ to: "/settings", label: "Integrations", icon: "settings" }` |
| `apps/web/tests/settings.spec.ts` | `apps/web/tests/support/mockApi.ts` | Mocked API routes for integrations | VERIFIED | `mockOperatorApp` used in `beforeEach`; `tests/support/mockApi.ts` lines 233–263 contain all 6 integration handlers |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `IntegrationsPage.tsx` > `IntegrationSection` | `query.data` (`IntegrationStatus`) | `apiGet<IntegrationStatus>("/api/integrations/:key")` via React Query | Yes — calls `GET /api/integrations/:key` which decrypts from DB row | FLOWING |
| `IntegrationsPage.tsx` > `IntegrationSection` | `testResult` (`TestResult`) | `apiRequest<TestResult>("/api/integrations/:key/test", { method: "POST" })` | Yes — calls live probe functions (or mock injections), persists to DB | FLOWING |
| `IntegrationsPage.tsx` > `IntegrationSection` | `saveMutation` PUT | `apiRequest("/api/integrations/:key", { method: "PUT" })` | Yes — encrypts with `encryptCredential` and upserts to DB | FLOWING |
| `IntegrationsPage.tsx` > `ModelSelector` | `modelsQuery.data.models` | `apiGet<{ models: string[] }>("/api/integrations/openai/models")` | Yes — route fetches live from OpenAI SDK when configured | FLOWING |
| Secret fields (`clientSecret`, `apiKey`) | `formValues[field.name]` | Initialized to `""` via `useState`, never written from server response | N/A — correctly always empty (by design) | VERIFIED EMPTY BY DESIGN |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — routes require a running API server with a live PostgreSQL DB. The test suite serves as the behavioral proxy.

| Behavior | Proxy Evidence | Status |
|----------|----------------|--------|
| GET /api/integrations/intune returns configured:false with no secrets | integrations.test.ts: "returns { configured: false } when no row exists" (14 tests total pass) | PASS |
| PUT /api/integrations/intune with blank secret preserves existing | integrations.test.ts: "with blank clientSecret keeps existing secret" — decrypts upsert payload and asserts `merged.clientSecret === "original-secret"` | PASS |
| GET response never contains clientSecret or apiKey | integrations.test.ts: 2 dedicated CRED-03 tests assert `!("clientSecret" in body)` and `!("apiKey" in body)` | PASS |
| POST /test persists lastTestedAt and lastTestResult | integrations.test.ts: asserts `upd.data.lastTestedAt instanceof Date` and `upd.data.lastTestResult === "pass"` | PASS |
| Secret fields empty on page load | IntegrationsPage.test.tsx: "secret fields are always empty on load even when configured" asserts `clientSecretInput.value === ""` | PASS |
| Configured badge appears only when configured:true | IntegrationsPage.test.tsx: 2 tests for badge present/absent; E2E confirms in browser | PASS |
| E2E navigates to /settings via sidebar | settings.spec.ts test 1 | PASS |
| E2E Intune pre-fills tenantId/clientId | settings.spec.ts test 2 asserts `getByLabel("Tenant ID").toHaveValue("mock-tenant-id")` | PASS |
| E2E test-connection shows "Connected successfully" | settings.spec.ts test 6 | PASS |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CRED-01 | 12-01, 12-02, 12-03 | Operator can configure Intune credentials (tenant ID, client ID, client secret) from the integrations settings page | SATISFIED | GET returns tenantId/clientId, PUT saves all three fields encrypted, UI renders all three fields, E2E confirms |
| CRED-02 | 12-01, 12-02, 12-03 | Operator can configure an OpenAI API key from the integrations settings page | SATISFIED | GET returns configured:bool, PUT saves apiKey encrypted, UI renders apiKey field, E2E confirms OpenAI section |
| CRED-03 | 12-01, 12-02, 12-03 | Credentials are stored encrypted server-side and never returned to the browser after initial save | SATISFIED | encryptCredential/decryptCredential used on all DB writes/reads; GET return objects contain no secret keys; UI initializes secret fields to empty string regardless of server response; dedicated test assertions confirm |
| CRED-04 | 12-01, 12-02, 12-03 | Operator can verify connection health for each integration and see last-sync status from the settings page | SATISFIED | POST /test persists lastTestedAt and lastTestResult via prisma.update; UI reads these from GET response; health row always visible showing timestamp or "Not yet verified"; health badge shows verified/failed/not-verified states |

No orphaned requirements — all four CRED-01 through CRED-04 are accounted for. No additional Phase 12 requirements exist in REQUIREMENTS.md traceability table beyond these four.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/src/routes/settings/IntegrationsPage.tsx` | 224 | `placeholder="(keep existing)"` — the word "placeholder" appears in JSX attribute | Info | This is a standard HTML input placeholder attribute, not a code stub. Not a concern. |

No other TODO, FIXME, empty returns, or stub patterns found in any phase 12 artifacts.

---

### Human Verification Required

#### 1. Visual Inspection of /settings Page

**Test:** Start dev servers (`npx pnpm --filter @agentsmith/api dev` and `npx pnpm --filter @agentsmith/web dev`). Navigate to the app in a browser. Click "Integrations" in the sidebar utility section.
**Expected:**
- /settings loads with "Microsoft Intune" and "OpenAI" card sections in dark panel styling
- Green uppercase labels for Tenant ID, Client ID, Client Secret, API Key
- Health row visible on both sections showing "Not yet verified"
- clientSecret and apiKey fields are password type and empty
- Save and Test connection buttons with green gradient / outlined styles
- Disabled Test connection button when not configured (OpenAI section, or Intune if no credentials)
**Why human:** Visual styling, layout geometry, button hover states, and color palette adherence cannot be verified programmatically.

#### 2. Toast Behavior

**Test:** Save credentials on either section. Observe the bottom of the viewport.
**Expected:** A toast overlay appears with the success/failure message, then auto-dismisses after ~4 seconds.
**Why human:** DOM animation timing and visual overlay position require browser observation.

#### 3. Real Credential Test-Connection (Optional)

**Test:** Configure real Intune or OpenAI credentials. Click "Test connection."
**Expected:** Inline result shows "Connected successfully" (or specific error). Health badge updates. lastTestedAt timestamp updates in health row.
**Why human:** Requires live Azure AD tenant or OpenAI API key — not available in automated test environment.

---

### Gaps Summary

None. All 15 must-have truths are verified. All 10 required artifacts exist, are substantive, and are wired. All 7 key links are confirmed. CRED-01 through CRED-04 are fully satisfied. The only pending item is human visual sign-off, which was planned as a blocking checkpoint in Plan 03 (Task 2).

---

_Verified: 2026-03-31_
_Verifier: Claude (gsd-verifier)_
