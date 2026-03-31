# Phase 12: Integrations Settings UI - Research

**Researched:** 2026-03-30
**Domain:** Fastify API routes, React settings form, AES-256-GCM credential storage, Microsoft Graph token probe, OpenAI API key probe
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Secret fields (Intune `clientSecret`, OpenAI `apiKey`) load **empty** on every page load. A "Configured" badge beside the field label indicates the secret exists. Blank submission on save means "keep existing value unchanged."
- **D-02:** Non-secret fields (`tenantId`, `clientId`) load **pre-filled** with their saved values on page load. These are not secrets.
- **D-03:** The "Configured" badge is only shown when the value is already saved. New installs with no credentials show nothing beside the label.
- **D-04:** Test-connection response uses three simultaneous layers: (1) Toast — fires immediately on response (~4s auto-dismiss), (2) Inline result — appears beneath "Test connection" button, stays until next test or next save, (3) Health badge — updates in-place on section header.
- **D-05:** Inline result uses same error/success visual language as `SetupPage` — green for success, red/warm for failure.
- **D-06:** Health status row is **always visible** on page load. Before first test: "Not yet verified." After a test: last-verified timestamp and pass/fail state.
- **D-07:** Health state persists in the `IntegrationCredential` row (new fields: `lastTestedAt DateTime?`, `lastTestResult String?`). Survives page refreshes and restarts.
- **D-08:** `/settings` appears in the **utility nav** (sidebar utility section) as 4th item. Settings SVG icon already defined in `router.tsx`.
- **D-09:** Sidebar label: **"Integrations"** — specific to what's on the page.
- **D-10:** `GET /api/integrations/:key` returns `{ configured: boolean, tenantId?: string, clientId?: string, lastTestedAt?: string, lastTestResult?: string }`. Never returns secrets.
- **D-11:** `PUT /api/integrations/:key` accepts partial credential fields; blank/absent secret fields mean "keep existing." Returns `{ ok: true }`.
- **D-12:** `POST /api/integrations/:key/test` reads stored credential, attempts real connection, returns `{ ok: boolean, message: string }`. Persists `lastTestedAt` and `lastTestResult`.
- **D-13:** All three routes require an authenticated session (standard session guard).
- **D-14:** `ensureSystemKey` is called during `server.ts` startup before routes are registered.

### Claude's Discretion

- Exact form layout within sections (grid vs. flex, label width)
- Toast library or custom toast implementation — keep it minimal, no heavy dependency
- Loading/pending states during save and test-connection operations
- Exact wording of human-readable failure hints per integration type

### Deferred Ideas (OUT OF SCOPE)

- Folder path configuration for document ingest (source folder, output folder) — INGEST-01 scope, belongs in Phase 14
- General app settings beyond integrations (user management, notifications) — post-v1.2
- Re-wrap utility for SystemKey when SESSION_SECRET is rotated — post-v1.2 operational tooling
- Broadening the sidebar label from "Integrations" to "Settings" — when more config categories exist
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRED-01 | Operator can configure Intune credentials (tenant ID, client ID, client secret) from the integrations settings page. | IntegrationsPage Intune section with three fields; PUT /api/integrations/intune handler with encryptCredential |
| CRED-02 | Operator can configure an OpenAI API key from the integrations settings page. | IntegrationsPage OpenAI section with one field; PUT /api/integrations/openai handler |
| CRED-03 | Credentials are stored encrypted server-side and never returned to the browser after initial save. | encryptCredential/decryptCredential already built in Phase 10; GET route returns configured boolean + non-secrets only |
| CRED-04 | Operator can verify connection health for each integration and see last-sync status from the settings page. | POST /api/integrations/:key/test with persistent lastTestedAt/lastTestResult; always-visible health row per D-06/D-07 |
</phase_requirements>

---

## Summary

Phase 12 is a plumbing phase: the crypto and schema infrastructure already exists from Phase 10, and the UI patterns exist from Phase 11. The work is connecting them — wiring `ensureSystemKey` into `server.ts` startup, building three Fastify routes (`GET`, `PUT`, `POST /test`) behind the existing session guard, adding two new fields to `IntegrationCredential` via migration, and building `IntegrationsPage` in the web app following established visual patterns.

The only net-new technical surface is the test-connection logic. For Intune, the test is a lightweight token probe using `@azure/identity`'s `ClientSecretCredential.getToken()` — no graph calls needed, just token acquisition. For OpenAI, the test calls `openai.models.list()` (cheapest API call that requires a valid key). Neither package is currently in `apps/api/package.json` so both need to be added.

Toast is the one area of genuine discretion. The web app has no toast infrastructure today. A minimal custom hook (`useToast`) with a single `<Toast>` overlay component is sufficient and avoids a heavyweight dependency. State management is `useState` + `useEffect` with a timeout for auto-dismiss.

**Primary recommendation:** Wire startup, add migration, build three routes, build `IntegrationsPage` following SetupPage/ConnectorStatusPage visual patterns, add a minimal custom toast, add `@azure/identity` and `openai` to `apps/api`.

---

## Project Constraints (from CLAUDE.md)

| Directive | Constraint |
|-----------|-----------|
| Credentials never reach browser | `GET /api/integrations/:key` must return `{ configured: boolean }` for secrets — never the secret value itself |
| Bootstrap endpoint DB-locked | Not directly relevant to Phase 12, but same DB-backed guard pattern should inform route design |
| Session ID regeneration on login | Not Phase 12 scope, already done in Phase 11 |
| Keep connector-specific logic isolated | Intune/OpenAI probe logic lives in the integrations route module, not in shared domain models |
| Test gate | `npx pnpm test` must remain green |
| No Entra ID as hard dependency | `parseServerEnv` already makes Entra vars optional — Phase 12 must not re-introduce a hard Entra dependency |

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| fastify | 5.3.3 | API server | `registerXxxRoutes` pattern already established |
| @prisma/client | 6.6.0 | DB access | `IntegrationCredential`, `SystemKey` models already exist |
| node:crypto | built-in | AES-256-GCM | `encryptCredential` / `decryptCredential` already built |
| react | 19.1.0 | Web UI | |
| @tanstack/react-query | 5.95.2 | Data fetching | `useQuery` / `useMutation` pattern used throughout |
| vitest | 4.1.2 | Web unit tests | |
| node:test | built-in | API unit tests | Used in bootstrap.test.ts, auth.test.ts, etc. |
| @playwright/test | 1.58.2 | E2E browser tests | mockApi.ts pattern for mocked API routes |

### New dependencies to add
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @azure/identity | 4.13.1 | Intune test-connection | `ClientSecretCredential.getToken()` — lightweight token probe without full Graph client |
| openai | 6.33.0 | OpenAI test-connection | `openai.models.list()` — cheapest API call that validates key |

**Installation:**
```bash
npx pnpm --filter @agentsmith/api add @azure/identity openai
```

**Version verification:** Confirmed via `npm view @azure/identity version` (4.13.1) and `npm view openai version` (6.33.0) on 2026-03-30.

Note: `@microsoft/microsoft-graph-client` (3.0.7) is NOT needed in Phase 12. The test-connection for Intune only needs to prove token acquisition succeeds — actual Graph calls are Phase 13. Using `@azure/identity` alone is simpler and avoids pulling in the Graph client prematurely.

---

## Architecture Patterns

### Recommended File Structure (new files only)

```
apps/
├── api/src/routes/
│   └── integrations.ts          # registerIntegrationRoutes — GET, PUT, POST /test
│   └── integrations.test.ts     # node:test unit tests (same pattern as bootstrap.test.ts)
└── web/src/
    ├── routes/settings/
    │   └── IntegrationsPage.tsx  # /settings page component
    ├── hooks/
    │   └── useToast.ts           # minimal auto-dismiss toast hook
    └── components/
        └── Toast.tsx             # single toast overlay component
prisma/migrations/
└── 20260330_0004_integration_credential_test_fields/migration.sql
```

### Pattern 1: Fastify Route Registration

Follow the exact pattern from `bootstrap.ts`:

```typescript
// apps/api/src/routes/integrations.ts
export type IntegrationRoutesDependencies = {
  prisma: Pick<PrismaClient, "integrationCredential" | "systemKey">;
  authService: Pick<AgentSmithAuthService, "getSession">;
  systemKey: Buffer;  // passed in from server.ts startup
};

type IntegrationRoutesOptions = FastifyPluginOptions & IntegrationRoutesDependencies;

export async function registerIntegrationRoutes(
  app: FastifyInstance,
  options: IntegrationRoutesOptions
) { ... }
```

**server.ts startup wiring (D-14):**
```typescript
// In buildServer(), before app.register calls:
const systemKey = await ensureSystemKey(prisma, env.SESSION_SECRET);

// Pass into route registration:
app.register(registerIntegrationRoutes, {
  prisma,
  authService,
  systemKey,
});
```

`buildServer()` is currently synchronous but calls `app.register()` which defers route setup. `ensureSystemKey` is async — `buildServer()` must become `async` or use Fastify's `addHook('onReady', ...)` approach. The cleanest approach is making `buildServer()` async, since `start()` already awaits `app.listen()`.

### Pattern 2: Credential Storage Format

`IntegrationCredential` stores one row per integration key (`"intune"`, `"openai"`). The `encryptedValue` column holds a JSON string of ALL fields for that integration. This avoids per-field columns.

```typescript
// Intune credential JSON structure (stored encrypted):
type IntuneCredential = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

// OpenAI credential JSON structure (stored encrypted):
type OpenAICredential = {
  apiKey: string;
};
```

**GET route response construction:**
```typescript
// Decrypt, parse, return only non-secrets
const json = decryptCredential(options.systemKey, row.encryptedValue, row.iv, row.authTag);
const cred = JSON.parse(json) as IntuneCredential;
return {
  configured: Boolean(cred.clientSecret),
  tenantId: cred.tenantId,
  clientId: cred.clientId,
  lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
  lastTestResult: row.lastTestResult ?? null,
};
```

**PUT route merge logic (blank = keep existing):**
```typescript
// If row exists, decrypt existing, merge, re-encrypt
const existing = row ? JSON.parse(decrypt(...)) : {};
const merged = {
  tenantId: body.tenantId ?? existing.tenantId ?? "",
  clientId: body.clientId ?? existing.clientId ?? "",
  clientSecret: body.clientSecret || existing.clientSecret || "",  // blank = keep
};
const { encryptedValue, iv, authTag } = encryptCredential(options.systemKey, JSON.stringify(merged));
await prisma.integrationCredential.upsert({ where: { key }, update: ..., create: ... });
```

### Pattern 3: Test-Connection Logic

**Intune — token probe only (no Graph call needed):**
```typescript
import { ClientSecretCredential } from "@azure/identity";

const cred = new ClientSecretCredential(tenantId, clientId, clientSecret);
// Scopes required per CLAUDE.md for future Graph calls:
await cred.getToken("https://graph.microsoft.com/.default");
// If no error thrown: token acquired successfully
```

**OpenAI — model list (cheapest valid call):**
```typescript
import OpenAI from "openai";

const client = new OpenAI({ apiKey });
await client.models.list();
// If no error thrown: key is valid
```

**Error mapping to human-readable messages:**
- Intune `AuthenticationRequiredError` / status 401 → "Auth failed: check client secret"
- Intune `CredentialUnavailableError` → "Check tenant ID and client ID"
- Intune network error → "Unable to reach Microsoft identity endpoint"
- OpenAI 401 → "Invalid API key"
- OpenAI 429 → "Rate limit reached — key is valid"
- OpenAI network error → "Unable to reach OpenAI API"

### Pattern 4: Web Form — IntegrationsPage

Follow `SetupPage` visual language exactly:
- Dark card panel: `background: "rgba(10, 17, 11, 0.97)"`, `border: "1px solid rgba(148, 163, 184, 0.22)"`
- Green uppercase labels: `color: "#89ff93"`, `textTransform: "uppercase"`, `letterSpacing: "0.06em"`
- Dark inputs: `background: "rgba(6, 10, 6, 0.74)"`, `color: "#e2f5e3"`
- Green gradient save button (same as SetupPage)
- Error state: `border: "1px solid rgba(216, 93, 70, 0.34)"`, `background: "rgba(216, 93, 70, 0.12)"`, `color: "#ffd8cf"`
- Success state: `border: "1px solid rgba(129, 255, 164, 0.22)"`, `background: "rgba(10, 30, 12, 0.7)"`, `color: "#9bffa3"`

Health badge: use `toneForState` from `ConnectorStatusPage` — import or inline the same color map.

### Pattern 5: Minimal Custom Toast

No external library. A `useToast` hook with `useState<{ message: string; ok: boolean } | null>`:

```typescript
// apps/web/src/hooks/useToast.ts
import { useCallback, useEffect, useState } from "react";

export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), durationMs);
    return () => clearTimeout(id);
  }, [toast, durationMs]);

  return { toast, showToast };
}
```

`<Toast>` renders absolutely positioned at the bottom of the viewport — inline styles, no CSS file needed (consistent with rest of app). z-index above page content.

### Pattern 6: React Query for Settings Data

```typescript
// GET on page mount
const intuneQuery = useQuery({
  queryKey: ["integrations", "intune"],
  queryFn: () => apiGet<IntegrationStatus>("/api/integrations/intune"),
});

// PUT on save (useMutation)
const saveMutation = useMutation({
  mutationFn: (body: SaveBody) =>
    apiRequest("/api/integrations/intune", { method: "PUT", body: JSON.stringify(body) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations", "intune"] }),
});

// POST test-connection (useMutation)
const testMutation = useMutation({
  mutationFn: () => apiRequest("/api/integrations/intune/test", { method: "POST" }),
});
```

### Anti-Patterns to Avoid

- **Returning secrets from GET:** GET must never return `clientSecret` or `apiKey` — return `configured: boolean` instead. This is a hard security invariant from CLAUDE.md.
- **Storing secrets in component state between renders:** Secret fields are uncontrolled conceptually — always empty on mount. Don't persist secret field values in React Query cache.
- **Calling test-connection in the HTTP request path for save:** Test-connection is triggered explicitly by the user, not automatically on save.
- **Making `buildServer()` async without updating callers:** The `start()` function and all test files that call `buildServer()` must be checked after making it async. Test stubs use synchronous `buildServer()` today — they will need `await buildServer()` or the function signature needs to be designed to keep sync initialization and async startup separate. See the "Pitfalls" section.
- **Re-encrypting with a new IV on every GET:** Only encrypt on write (PUT). GET decrypts and returns; no re-encryption needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Intune token acquisition | Custom OAuth2 token POST | `@azure/identity` `ClientSecretCredential` | Handles token caching, retry, Azure sovereign clouds, error normalization |
| OpenAI key validation | Raw fetch to `https://api.openai.com/v1/models` | `openai` npm package | Handles auth headers, error parsing, response types |
| AES-256-GCM encrypt/decrypt | Custom crypto logic | `encryptCredential` / `decryptCredential` in `credential-crypto.ts` | Already implemented and tested in Phase 10 |
| System key bootstrap | Custom key management | `ensureSystemKey` in `system-key.ts` | Already implemented in Phase 10 |
| Toast notification | Full notification library (react-hot-toast, sonner) | Custom `useToast` hook (~30 lines) | App has no other toast needs; library adds 10-50KB for one feature |

---

## Schema Migration Required

`IntegrationCredential` needs two new nullable columns for persistent health state (D-07). The Prisma schema must also be updated.

**New migration SQL:**
```sql
-- 20260330_0004_integration_credential_test_fields
ALTER TABLE "IntegrationCredential"
  ADD COLUMN "lastTestedAt"   TIMESTAMP(3),
  ADD COLUMN "lastTestResult" TEXT;
```

**Updated Prisma schema model:**
```prisma
model IntegrationCredential {
  id             String    @id @default(cuid())
  key            String    @unique
  encryptedValue String    @db.Text
  iv             String
  authTag        String
  lastTestedAt   DateTime?
  lastTestResult String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

This follows the project's manual migration file pattern (no live DB, consistent with Phase 10 approach).

---

## server.ts buildServer() Async Refactor

`ensureSystemKey` is async. `buildServer()` is currently synchronous. Three options:

1. **Make `buildServer()` async (recommended):** Change signature to `async function buildServer(...)`, await `ensureSystemKey` before route registration, update `start()` to `const { app, env } = await buildServer()`. Test files calling `buildServer()` must add `await`.

2. **Use `addHook('onReady', async () => { ... })` pattern:** Keep buildServer sync, wire ensureSystemKey inside an onReady hook that also registers integration routes. More complex, less obvious.

3. **Pass systemKey as an option (for testing):** Accept `options.systemKey?: Buffer` in `BuildServerOptions`. When not provided, call `ensureSystemKey` in startup. Tests can inject a fixed Buffer without hitting the DB. This is the cleanest for testability.

**Recommendation:** Option 3 — adds `systemKey?: Buffer` to `BuildServerOptions` so tests can inject a fixed key, while startup calls `ensureSystemKey`. This means `buildServer()` itself stays sync but `start()` becomes async (which it effectively already was).

---

## Common Pitfalls

### Pitfall 1: buildServer() async refactor breaks test stubs
**What goes wrong:** Making `buildServer()` async without updating the 5+ test files that call it synchronously causes TypeScript errors and test failures.
**Why it happens:** All existing test files pattern-match `const { app } = buildServer({...})`.
**How to avoid:** Use Option 3 above — keep `buildServer()` sync, pass `systemKey` as an option. Test files inject `Buffer.alloc(32)` as a fixed test key. Only `start()` calls `ensureSystemKey`.
**Warning signs:** TypeScript: "Property 'app' does not exist on type 'Promise<...>'"

### Pitfall 2: IV reuse breaks AES-GCM security
**What goes wrong:** Reusing an existing IV when re-encrypting a credential on PUT invalidates GCM's security guarantees.
**Why it happens:** Copy-paste of the old `iv` from the existing row when updating.
**How to avoid:** `encryptCredential` always generates a fresh `randomBytes(12)` IV — never pass the old IV. The PUT handler always calls `encryptCredential` fresh.
**Warning signs:** Test shows same IV in DB after two different saves.

### Pitfall 3: Secret field state leaking into PUT body
**What goes wrong:** A React controlled input for `clientSecret` starts empty, user types nothing, form submits an empty string, overwriting the existing secret with "".
**Why it happens:** Sending `{ clientSecret: "" }` to PUT if the field wasn't touched.
**How to avoid:** The PUT handler treats blank/absent secret fields as "keep existing" (D-11). Additionally, the UI should only include secret fields in the request body if the user actually typed something — or the API must handle empty string as "no change." D-11 says blank/absent = keep, so the API is the right enforcement point.
**Warning signs:** After saving non-secret fields only, the `configured` badge disappears.

### Pitfall 4: Health state lost on next save
**What goes wrong:** `PUT /api/integrations/:key` upsert overwrites `lastTestedAt` and `lastTestResult` with null if not included in the update payload.
**Why it happens:** Prisma upsert with partial update object doesn't auto-preserve unmentioned fields unless explicitly excluded.
**How to avoid:** The PUT handler's `update` clause must only include `encryptedValue`, `iv`, `authTag`, `updatedAt` — never touch `lastTestedAt` or `lastTestResult`.
**Warning signs:** Health badge resets to "Not yet verified" after every credential save.

### Pitfall 5: Test-connection timeout blocks the UI
**What goes wrong:** Azure identity token request or OpenAI call hangs for 30+ seconds on network issues, leaving the user staring at a spinner.
**Why it happens:** Default timeouts for fetch-based clients can be very long.
**How to avoid:** Wrap the test-connection call in `Promise.race` with a 10-second timeout. Return `{ ok: false, message: "Connection timed out after 10s" }` on timeout. This gives the user fast feedback.
**Warning signs:** "Test connection" button spins for >15 seconds on misconfigured credentials.

### Pitfall 6: GET returns non-existent row without a null-safe guard
**What goes wrong:** When no credential has been saved yet for `"intune"` or `"openai"`, the GET handler throws because it tries to decrypt a null row.
**Why it happens:** New install — `IntegrationCredential` table is empty.
**How to avoid:** GET handler checks `if (!row) return { configured: false }` early.
**Warning signs:** 500 error on first visit to /settings on a fresh install.

---

## Code Examples

### GET /api/integrations/:key handler skeleton
```typescript
// Source: derived from bootstrap.ts pattern + credential-crypto.ts API
app.get<{ Params: { key: string } }>("/api/integrations/:key", {
  preHandler: requireAuth,
}, async (request, reply) => {
  const { key } = request.params;
  if (key !== "intune" && key !== "openai") {
    reply.code(404);
    return { error: "unknown_integration" };
  }

  const row = await options.prisma.integrationCredential.findUnique({ where: { key } });
  if (!row) {
    return { configured: false, lastTestedAt: null, lastTestResult: null };
  }

  const json = decryptCredential(options.systemKey, row.encryptedValue, row.iv, row.authTag);
  const cred = JSON.parse(json) as Record<string, string>;

  if (key === "intune") {
    return {
      configured: Boolean(cred.clientSecret),
      tenantId: cred.tenantId ?? "",
      clientId: cred.clientId ?? "",
      lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
      lastTestResult: row.lastTestResult ?? null,
    };
  }
  // openai
  return {
    configured: Boolean(cred.apiKey),
    lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
    lastTestResult: row.lastTestResult ?? null,
  };
});
```

### Intune token probe (test-connection)
```typescript
// Source: @azure/identity docs — ClientSecretCredential.getToken()
import { ClientSecretCredential } from "@azure/identity";

async function testIntuneConnection(tenantId: string, clientId: string, clientSecret: string): Promise<{ ok: boolean; message: string }> {
  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    await Promise.race([
      credential.getToken("https://graph.microsoft.com/.default"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10_000)),
    ]);
    return { ok: true, message: "Connected successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "timeout") return { ok: false, message: "Connection timed out after 10s" };
    if (msg.includes("AADSTS7000215") || msg.includes("invalid client secret")) {
      return { ok: false, message: "Auth failed: invalid client secret" };
    }
    if (msg.includes("AADSTS90002") || msg.includes("tenant")) {
      return { ok: false, message: "Auth failed: tenant ID not found" };
    }
    return { ok: false, message: `Auth failed: ${msg}` };
  }
}
```

### OpenAI key probe (test-connection)
```typescript
// Source: openai npm package — models.list()
import OpenAI from "openai";

async function testOpenAIConnection(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const client = new OpenAI({ apiKey, timeout: 10_000 });
    await client.models.list();
    return { ok: true, message: "Connected successfully" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("401") || msg.includes("Incorrect API key")) {
      return { ok: false, message: "Invalid API key" };
    }
    if (msg.includes("429")) {
      return { ok: true, message: "Rate limit reached — key is valid" };
    }
    return { ok: false, message: `Connection failed: ${msg}` };
  }
}
```

### Router addition (router.tsx)
```typescript
// Add to utilityItems array (4th item as per D-08):
{ to: "/settings", label: "Integrations", icon: "settings" },

// Add to appRoutes children inside AppShell:
{ path: "settings", element: <IntegrationsPage /> },
```

### Sidebar nav in router.tsx (current state)
```typescript
const utilityItems: NavItem[] = [
  { to: "/docs", label: "Documentation", icon: "docs" },
  { to: "/connectors", label: "Connectors", icon: "connectors" },
  { to: "/audit", label: "Audit Log", icon: "audit" },
  // Phase 12 adds: { to: "/settings", label: "Integrations", icon: "settings" },
];
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `@azure/msal-node` for token acquisition | `@azure/identity` `ClientSecretCredential` | Simpler API, no MSAL config required for service-to-service flows |
| `axios` or raw `fetch` for OpenAI | `openai` npm package | Typed responses, built-in retry, timeout support |
| Storing raw secrets in DB | AES-256-GCM with HKDF-derived key | Already done in Phase 10 — just wire it in |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API runtime | Yes | Existing project | — |
| PostgreSQL | IntegrationCredential table | Not probed (no live DB in dev) | — | Manual SQL migration file (project pattern) |
| @azure/identity | Intune test-connection | Not installed yet | 4.13.1 (npm registry) | — (must add) |
| openai | OpenAI test-connection | Not installed yet | 6.33.0 (npm registry) | — (must add) |

**Missing dependencies with no fallback:**
- `@azure/identity` and `openai` — must be added to `apps/api/package.json` before test-connection routes can be implemented.

**No live database available in dev** — migration must follow the manual SQL file pattern used in Phase 10 (add a new file to `prisma/migrations/`, update `schema.prisma`).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| API framework | node:test (built-in), same as bootstrap.test.ts |
| Web framework | vitest 4.1.2, same as SetupPage.test.tsx |
| E2E framework | Playwright 1.58.2 |
| API quick run | `npx pnpm --filter @agentsmith/api test` |
| Web quick run | `npx pnpm --filter @agentsmith/web test` |
| Full suite | `npx pnpm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRED-01 | GET /api/integrations/intune returns configured:false when no row | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-01 | GET /api/integrations/intune returns configured:true + non-secrets after save | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-01 | PUT /api/integrations/intune saves encrypted credential | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-01 | PUT /api/integrations/intune with blank clientSecret keeps existing | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-01 | GET /api/integrations/intune requires auth session | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-02 | GET /api/integrations/openai returns configured:false when no row | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-02 | PUT /api/integrations/openai saves encrypted credential | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-03 | GET /api/integrations/:key never returns secret fields in response | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-04 | POST /api/integrations/intune/test persists lastTestedAt + lastTestResult | unit (API) | `npx pnpm --filter @agentsmith/api test` | No — Wave 0 |
| CRED-04 | IntegrationsPage shows "Not yet verified" when lastTestedAt is null | unit (web) | `npx pnpm --filter @agentsmith/web test` | No — Wave 0 |
| CRED-04 | IntegrationsPage shows last-verified timestamp after test completes | unit (web) | `npx pnpm --filter @agentsmith/web test` | No — Wave 0 |
| All | /settings route renders IntegrationsPage via sidebar nav | E2E (Playwright) | `npx pnpm --filter @agentsmith/web test:e2e` | No — Wave 0 |

**Note on test-connection unit tests:** The actual token probe (`@azure/identity`, `openai`) cannot be unit-tested without network access or mocking the external call. Tests for the route should inject mock probe functions (same dependency-injection pattern as existing routes) and test the response shape, error mapping, and DB persistence separately. The actual connectivity is smoke-tested manually during verify-phase.

### Sampling Rate
- **Per task commit:** `npx pnpm --filter @agentsmith/api test` (API changes) or `npx pnpm --filter @agentsmith/web test` (web changes)
- **Per wave merge:** `npx pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/routes/integrations.test.ts` — covers CRED-01, CRED-02, CRED-03, CRED-04 API layer
- [ ] `apps/web/src/routes/settings/IntegrationsPage.test.tsx` — covers CRED-04 web layer (health display)
- [ ] Playwright mock: `mockApi.ts` needs `/api/integrations/intune`, `/api/integrations/openai`, `/api/integrations/intune/test`, `/api/integrations/openai/test` routes added for E2E coverage of `/settings`

---

## Open Questions

1. **buildServer() async refactor scope**
   - What we know: `ensureSystemKey` is async; all existing test files call `buildServer()` synchronously
   - What's unclear: How many test files need updating; whether `buildServer()` should become async or stay sync with `systemKey` injected
   - Recommendation: Use Option 3 (inject `systemKey?: Buffer` in options). All 5+ test files can pass `Buffer.alloc(32)` as a fixed test key — zero async changes needed in test files.

2. **Route prefix for integrations**
   - What we know: All existing routes use `/api/` prefix; bootstrap uses `/api/bootstrap`
   - What's unclear: Should it be `/api/integrations/:key` or `/api/settings/integrations/:key`?
   - Recommendation: `/api/integrations/:key` as specified in D-10/D-11/D-12. Keeps it consistent with the naming in CLAUDE.md security invariants.

3. **400 vs 500 when systemKey is unavailable at request time**
   - What we know: `ensureSystemKey` runs at startup; if DB is down at startup the server won't start
   - What's unclear: What happens if the key is somehow null at request time (defensive coding)
   - Recommendation: The route handler should guard `if (!options.systemKey)` and return 503 — but in practice this won't occur if startup wiring is correct.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `apps/api/src/lib/credential-crypto.ts` — confirmed `encryptCredential` / `decryptCredential` API
- Direct code inspection: `apps/api/src/lib/system-key.ts` — confirmed `ensureSystemKey` API and async signature
- Direct code inspection: `apps/api/src/server.ts` — confirmed `buildServer()` sync pattern and `BuildServerOptions` shape
- Direct code inspection: `apps/api/src/routes/bootstrap.ts` — confirmed `registerXxxRoutes` pattern, session guard, prisma stub pattern
- Direct code inspection: `prisma/schema.prisma` — confirmed `IntegrationCredential` model (no `lastTestedAt`/`lastTestResult` yet)
- Direct code inspection: `apps/web/src/routes/SetupPage.tsx` — confirmed visual language, `apiRequest` usage
- Direct code inspection: `apps/web/src/routes/connectors/ConnectorStatusPage.tsx` — confirmed `toneForState`, badge style, always-visible health pattern
- Direct code inspection: `apps/web/src/router.tsx` — confirmed `utilityItems`, `SidebarIcon` settings case, route structure
- Direct code inspection: `apps/web/src/lib/api.ts` — confirmed `apiGet`, `apiRequest`, `ApiError` API
- npm registry: `@azure/identity` version 4.13.1 (verified 2026-03-30)
- npm registry: `openai` version 6.33.0 (verified 2026-03-30)

### Secondary (MEDIUM confidence)
- `@azure/identity` `ClientSecretCredential.getToken()` API — based on package knowledge; token scope `https://graph.microsoft.com/.default` is standard for Graph API service principals
- OpenAI `client.models.list()` as cheapest valid API call — well-documented as the standard key validation pattern

### Tertiary (LOW confidence)
- Azure AD error code strings (AADSTS7000215, AADSTS90002) — based on training knowledge; exact strings should be verified when implementing the error mapping

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing packages confirmed via direct inspection; new packages confirmed via npm registry
- Architecture patterns: HIGH — derived from direct reading of bootstrap.ts, credential-crypto.ts, system-key.ts, SetupPage.tsx, ConnectorStatusPage.tsx
- Schema migration: HIGH — manual SQL pattern confirmed from Phase 10 migration files
- Test-connection probes: MEDIUM — @azure/identity and openai API shapes are well-established; exact error strings are LOW confidence
- Toast implementation: HIGH — custom hook pattern is straightforward; no external verification needed

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack)
