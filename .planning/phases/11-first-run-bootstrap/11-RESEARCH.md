# Phase 11: First-Run Bootstrap - Research

**Researched:** 2026-03-30
**Domain:** Local authentication, session management, first-run detection, Fastify/React Router
**Confidence:** HIGH

## Summary

Phase 11 adds local (username + password) authentication on top of the existing Entra ID OIDC flow. The core challenge is: (1) detecting bootstrap state server-side on every request before any protected route is reachable, (2) providing a one-time setup endpoint that is permanently locked via a DB count guard after the first admin is created, and (3) fitting a `LocalAuthProvider` into the existing `AuthProvider` interface without breaking the Entra path.

The Phase 10 schema work is already complete. `User.passwordHash` and `User.role` fields exist in the Prisma model. The `createAuthService` factory in `apps/api/src/plugins/auth.ts` already accepts an optional `provider` argument, making it straightforward to inject a `LocalAuthProvider` without touching the Entra code path. The existing cookie-session infrastructure (`signValue`, `readSignedCookie`, `serializeCookie`) should be reused verbatim for local login — no new session mechanism is needed.

Bootstrap detection must happen server-side. The `GET /api/bootstrap-status` endpoint returns `{ bootstrapRequired: boolean }` based on `prisma.user.count({ where: { role: "admin" } })`. The web app checks this on startup (alongside `/api/me`) and redirects to `/setup` when bootstrap is required. After the first admin is created, the setup endpoint rejects all future POST requests with 409.

**Primary recommendation:** Reuse the existing `AuthProvider` interface and signed-cookie session infrastructure. Add `LocalAuthProvider`, a `POST /api/bootstrap` endpoint with a DB-locked guard, a `POST /api/auth/local/login` endpoint, and `/setup` + `/login-local` web routes. The Entra path is preserved and continues to work when Entra vars are configured.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BOOT-01 | Operator can create a local admin account (username + password) on first run when no admin exists. | `POST /api/bootstrap` endpoint; bcrypt hash of password stored in `User.passwordHash`; one-time DB guard via `prisma.user.count`. |
| BOOT-02 | App detects bootstrap state server-side and routes unauthenticated users to setup before any protected route is accessible. | `GET /api/bootstrap-status` checked by web app; `ProtectedLayout` and `/login` redirect to `/setup` when `bootstrapRequired: true`. |
| BOOT-03 | Bootstrap endpoint is permanently locked in the database after the first admin is created. | `POST /api/bootstrap` checks `prisma.user.count({ where: { role: "admin" } })` before every create; returns 409 if count > 0. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bcrypt (or bcryptjs) | bcrypt ^5.1.1 / bcryptjs ^2.4.3 | Password hashing | Industry standard adaptive work-factor; already well-understood in Node ecosystem |
| Node.js `node:crypto` | built-in | HMAC signing for cookies | Already used throughout `plugins/auth.ts` — no new dependency |
| Prisma Client | existing | DB queries for user count + upsert | Already wired into server; `User.passwordHash` and `User.role` fields from Phase 10 |
| Fastify | existing | New route registration | Same pattern as all existing route files |
| React Router DOM | existing | `/setup` and `/login` routing | `appRoutes` array already defined in `router.tsx` |
| TanStack Query | existing | `bootstrapStatus` query in web | Same pattern as `useSession` hook |

**bcrypt choice:** `bcrypt` is the native Node binding (faster, preferred in production). `bcryptjs` is a pure-JS fallback if native bindings are problematic in the build. Either works — use `bcrypt` unless build issues arise. Work factor: 12 (standard for 2024–2026).

**Installation:**
```bash
npx pnpm --filter @agentsmith/api add bcrypt
npx pnpm --filter @agentsmith/api add -D @types/bcrypt
```

**Version verification (run before implementing):**
```bash
npm view bcrypt version
npm view bcryptjs version
```

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | existing | Request body validation for `/api/bootstrap` and `/api/auth/local/login` | Validate username/password presence and minimum length before any DB work |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcrypt | argon2 | argon2 is more modern but requires native bindings and adds a dependency not already in the tree; bcrypt is sufficient for a single-user local admin scenario |
| Custom session cookie | express-session / fastify-session | Project already has a hand-rolled cookie signer that works well; adding a plugin would be over-engineering for one new auth path |

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── plugins/
│   └── auth.ts                  # Existing — add LocalAuthProvider class here
├── routes/
│   ├── auth.ts                  # Existing — add POST /auth/local/login here
│   └── bootstrap.ts             # New — GET /api/bootstrap-status + POST /api/bootstrap
apps/web/src/
├── hooks/
│   └── useBootstrapStatus.ts    # New — mirrors useSession pattern
├── routes/
│   ├── SetupPage.tsx            # New — first-run admin creation form
│   ├── LocalLoginPage.tsx       # New — username/password login form (or extend LoginPage)
│   └── ProtectedLayout.tsx      # Existing — add bootstrap redirect logic
└── router.tsx                   # Existing — add /setup and /login routes
```

### Pattern 1: LocalAuthProvider implementing AuthProvider interface

The existing `AuthProvider` interface (internal to `plugins/auth.ts`) has:
```typescript
type AuthProvider = {
  buildAuthorizationUrl(flow: AuthFlowCookiePayload): Promise<URL>;
  exchangeCallback(currentUrl: URL, flow: AuthFlowCookiePayload): Promise<AuthenticatedIdentity>;
};
```

`LocalAuthProvider` does not use OAuth redirect flows. The recommended approach is **not** to force local login through `beginLogin`/`completeCallback` — those are OIDC-specific. Instead:

- Keep the existing `AgentSmithAuthService` interface for session reads (`getSession`, `clearSession`).
- Add a dedicated `POST /api/auth/local/login` route that bypasses `beginLogin`/`completeCallback` entirely and directly writes the session cookie using the same `signValue`/`serializeCookie` helpers already exported from (or accessible within) `plugins/auth.ts`.
- The `createAuthService` factory guards `MicrosoftEntraAuthProvider` construction behind a check for Entra vars being present (the TODO Phase 11 comment in the code confirms this is expected).

**Session cookie write for local login:**

The existing `serializeCookie`, `signValue`, and `appendCookies` helpers are private to `plugins/auth.ts`. Two options:
1. Export them as helpers (cleanest).
2. Add a `loginLocal(reply, userId)` method to `AgentSmithAuthService` that the new route calls.

Option 2 (add `loginLocal` to the service interface) is more consistent with the existing architecture — the route never directly touches cookies.

```typescript
// Addition to AgentSmithAuthService interface
loginLocal(reply: FastifyReply, userId: string): void;
```

### Pattern 2: Bootstrap status detection

The web app needs to know whether bootstrap is required before deciding where to redirect. This is a simple boolean check:

```typescript
// New hook — mirrors useSession
export function useBootstrapStatus() {
  return useQuery({
    queryKey: ["bootstrap-status"],
    queryFn: () => apiGet<{ bootstrapRequired: boolean }>("/api/bootstrap-status"),
    staleTime: Infinity, // Bootstrap state never changes once set
    retry: false,
  });
}
```

**ProtectedLayout redirect priority:**
1. If `bootstrapRequired === true` → redirect to `/setup` (before checking auth)
2. If not authenticated → redirect to `/login`
3. Otherwise → render the shell

This ordering is critical: the setup screen must be reachable before any auth session exists.

### Pattern 3: DB-locked bootstrap endpoint

```typescript
// POST /api/bootstrap — pseudocode
async function handleBootstrap(request, reply) {
  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  if (adminCount > 0) {
    reply.code(409);
    return { error: "Bootstrap already completed" };
  }
  // validate body, hash password, create user
  const { username, password } = validateBody(request.body);
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      sourceSystem: "local",
      sourceId: username,
      displayName: username,
      passwordHash,
      role: "admin",
    },
  });
  // write session cookie directly (via loginLocal)
  authService.loginLocal(reply, user.id);
  reply.code(201);
  return { userId: user.id };
}
```

### Pattern 4: Local login endpoint

```typescript
// POST /api/auth/local/login
async function handleLocalLogin(request, reply) {
  const { username, password } = validateBody(request.body);
  const user = await prisma.user.findFirst({
    where: { sourceSystem: "local", sourceId: username },
  });
  // Timing-safe: always compare even if user not found
  const hash = user?.passwordHash ?? "$2b$12$invalidhashpadding000000000000000000000000000000000000";
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid) {
    await auditService.write({ action: "auth.login_failed", ... });
    reply.code(401);
    return { error: "Invalid credentials" };
  }
  authService.loginLocal(reply, user.id);
  await auditService.write({ action: "auth.login", ... });
  reply.code(200);
  return { redirectPath: "/" };
}
```

**Timing-safe note:** Always run `bcrypt.compare` even when the user record is not found, using a dummy hash. This prevents timing attacks that could reveal whether a username exists.

### Pattern 5: Entra guard in createAuthService

The existing `createAuthService` currently constructs `MicrosoftEntraAuthProvider` unconditionally when `DEV_AUTH_BYPASS` is not set. Phase 11 must add a guard:

```typescript
// In createAuthService:
if (!options.env.ENTRA_TENANT_ID || !options.env.ENTRA_CLIENT_ID) {
  // Return a stub provider or skip OIDC wiring entirely
  // beginLogin on this path should return 503 "Entra not configured"
  // completeCallback on this path should return 503
}
```

The `MicrosoftEntraAuthProvider` constructor accesses `this.env.ENTRA_TENANT_ID!` — this will throw at construction time if the var is absent. The guard prevents that.

### Pattern 6: Session ID regeneration on login

CLAUDE.md notes "Session ID must be regenerated on every login (both local and Entra paths)." The existing Entra path already generates a `randomUUID()` sessionId in `completeCallback`. The new `loginLocal` method must also generate a fresh `randomUUID()` sessionId — it must never reuse a session ID.

### Anti-Patterns to Avoid

- **Config-flag bootstrap guard:** Never check `process.env.BOOTSTRAP_COMPLETE` or similar. The guard must be `prisma.user.count()` — a process restart must not re-open the endpoint.
- **Constructing MicrosoftEntraAuthProvider without Entra vars:** Will throw at construction time. Guard it.
- **Returning the password hash anywhere:** `passwordHash` must never appear in any API response. Exclude it from all user query selects.
- **Username enumeration via response timing:** Always run `bcrypt.compare` even for unknown usernames.
- **Sharing local and Entra user records:** Local users use `sourceSystem: "local"` — they are distinct from `sourceSystem: "entra"` users, using the existing `@@unique([sourceSystem, sourceId])` constraint.
- **Setting up the setup route as a protected route:** `/setup` must be reachable without an active session.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | bcrypt | Adaptive work factor, timing-safe comparison, well-audited |
| Cookie signing | Custom signing scheme | Existing `signValue`/`readSignedCookie` in `plugins/auth.ts` | Already tested and deployed — reinventing breaks parity |
| Session management | New session table or Redis | Existing signed cookie pattern | Project decision from Phase 01; consistent with all existing auth |
| Input validation | Custom string checks | Zod schemas (already in use via `@agentsmith/shared`) | Consistent with env validation pattern |

**Key insight:** Phase 11 adds a new auth path, not a new auth infrastructure. Almost everything reuses existing building blocks — bcrypt is the only new dependency.

## Common Pitfalls

### Pitfall 1: Bootstrap race condition
**What goes wrong:** Two concurrent POST requests to `/api/bootstrap` both pass the `count > 0` check and both create admin users.
**Why it happens:** No database-level uniqueness on "admin count = 0" — the application-level count check is not atomic.
**How to avoid:** Either (a) add a unique constraint on `(sourceSystem, sourceId)` (already exists — a second create with `sourceSystem: "local", sourceId: <same username>` will fail at DB level), or (b) wrap in a transaction with `SELECT FOR UPDATE`. In practice, this is a single-operator first-run scenario; the DB-level unique constraint on `(sourceSystem, sourceId)` provides adequate protection. Document this explicitly in the plan.
**Warning signs:** Two admin users with the same username in the DB.

### Pitfall 2: Entra vars absent crashes the server
**What goes wrong:** `new MicrosoftEntraAuthProvider(env)` accesses `env.ENTRA_TENANT_ID!` — TypeScript allows the non-null assertion but at runtime the value is `undefined`, causing `new URL("undefined/v2.0")` which produces a valid-but-wrong URL. Bugs surface only on the first OIDC request.
**Why it happens:** The TODO comment at line 305 of `plugins/auth.ts` notes this was deferred to Phase 11.
**How to avoid:** Check `env.ENTRA_TENANT_ID && env.ENTRA_CLIENT_ID` before constructing `MicrosoftEntraAuthProvider`. Return a `NoopEntraProvider` that throws a clear error when Entra routes are called without configuration.
**Warning signs:** OIDC discovery calls fail with confusing URL errors.

### Pitfall 3: Setup page accessible after bootstrap
**What goes wrong:** Operator navigates to `/setup` after an admin exists — the form appears and an attempt to submit returns 409, but the UX is confusing.
**Why it happens:** The web app doesn't check bootstrap state on `/setup` render.
**How to avoid:** `SetupPage` calls `useBootstrapStatus` and redirects to `/login` if `bootstrapRequired === false`.
**Warning signs:** Setup form submits return 409 after bootstrap is complete.

### Pitfall 4: `getSession` loads a local user but the existing code expects Entra fields
**What goes wrong:** `getSession` does `prisma.user.findUnique` and returns `{ id, email, displayName }`. Local users may have a null `email`. The existing code already handles `email: String?` (nullable) in the session type, so this is fine — but confirm `displayName` is always set.
**Why it happens:** Local users are created with `displayName: username`, so this is safe.
**How to avoid:** Ensure `displayName` is populated from `username` at creation time, never left empty.

### Pitfall 5: Password hash leaked in API responses
**What goes wrong:** A query returns the full `User` model including `passwordHash`.
**Why it happens:** Prisma returns all fields by default unless `select` is specified.
**How to avoid:** All user queries that return data to the client must use `select: { id: true, displayName: true, email: true, role: true }` — never select `passwordHash`.

### Pitfall 6: staleTime on bootstrapStatus query
**What goes wrong:** After bootstrap completes, the web app still thinks `bootstrapRequired: true` because TanStack Query cached the old value.
**Why it happens:** Default `staleTime` behavior.
**How to avoid:** After a successful `POST /api/bootstrap`, call `queryClient.setQueryData(["bootstrap-status"], { bootstrapRequired: false })` or `queryClient.invalidateQueries({ queryKey: ["bootstrap-status"] })` before navigating.

## Code Examples

### Bcrypt hash and compare
```typescript
// Source: https://github.com/kelektiv/node.bcrypt.js (official README)
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

// On create:
const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);

// On verify:
const valid = await bcrypt.compare(candidatePassword, storedHash);
```

### DB-locked bootstrap guard
```typescript
// Source: project pattern — prisma.user.count
const adminCount = await prisma.user.count({ where: { role: "admin" } });
if (adminCount > 0) {
  reply.code(409);
  return { error: "bootstrap_already_completed" };
}
```

### Bootstrap status API route
```typescript
// GET /api/bootstrap-status — no auth required
app.get("/api/bootstrap-status", async () => {
  const adminCount = await prisma.user.count({ where: { role: "admin" } });
  return { bootstrapRequired: adminCount === 0 };
});
```

### ProtectedLayout bootstrap redirect (priority ordering)
```typescript
// In ProtectedLayout — check bootstrap before auth
const { data: bootstrapStatus } = useBootstrapStatus();
const { authenticated, isLoading } = useSession();

if (isLoading || bootstrapStatus === undefined) {
  return <LoadingShell />;
}
if (bootstrapStatus.bootstrapRequired) {
  return <Navigate to="/setup" replace />;
}
if (!authenticated) {
  return <Navigate to={loginUrl} replace />;
}
// render shell
```

### Timing-safe login (prevent username enumeration)
```typescript
// Always bcrypt.compare, even for missing user
const DUMMY_HASH = "$2b$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const hash = user?.passwordHash ?? DUMMY_HASH;
const valid = await bcrypt.compare(candidate, hash);
if (!user || !valid) {
  reply.code(401);
  return { error: "invalid_credentials" };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bcrypt work factor 10 | bcrypt work factor 12 | ~2022 | Factor 12 is the current recommendation for interactive login on modern hardware; factor 10 is no longer considered sufficient |
| MD5/SHA1 password hashing | bcrypt/argon2 adaptive hashing | Pre-2010 | Never use fast hashes for passwords |

**No deprecated approaches relevant to this phase.**

## Open Questions

1. **Local login page: extend LoginPage or create LocalLoginPage?**
   - What we know: `LoginPage.tsx` currently shows only the "Sign in with Microsoft" button and is tightly styled for that flow.
   - What's unclear: Should local login be a separate `/login` route variant, or should `/login` conditionally show local vs Entra based on bootstrap/config state?
   - Recommendation: Create a separate `SetupPage` for bootstrap. For post-bootstrap login when Entra is not configured, add a `/login` form for local credentials. If Entra is configured, keep the existing Microsoft button. This keeps the Entra path untouched while adding the local path. The planner should decide whether to modify `LoginPage` or create a new one.

2. **What happens when both Entra and local users exist?**
   - What we know: CLAUDE.md says "Entra ID auth preserved and still works if configured." The DB constraint `@@unique([sourceSystem, sourceId])` cleanly separates them.
   - What's unclear: Does the login page show both options when both are configured?
   - Recommendation: For Phase 11 scope, local login is for bootstrap-state access only. When Entra is configured, the operator should use Entra. Showing both buttons is a UX decision the planner should make explicitly.

3. **`loginLocal` as a service method vs. helper export?**
   - What we know: The `serializeCookie`/`signValue`/`appendCookies` helpers are private in `plugins/auth.ts`.
   - What's unclear: Whether to add `loginLocal` to `AgentSmithAuthService` or export the helpers.
   - Recommendation: Add `loginLocal(reply, userId)` to the service interface. This keeps cookie logic inside the auth plugin and is consistent with how `beginLogin`/`clearSession` work.

## Environment Availability

> Step 2.6: This phase is code-only — it adds routes, a service method, and a React page. No new external services or tools are required beyond what Phase 10 already established (PostgreSQL, Prisma). bcrypt requires native bindings (node-gyp); if the build environment cannot compile native modules, `bcryptjs` is the pure-JS fallback.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | prisma.user.count, user.create | Existing (Phase 10) | — | — |
| bcrypt (native) | password hashing | Not yet installed | — | bcryptjs (pure JS) |
| node-gyp / build tools | bcrypt native compile | Assumed present on Windows 11 dev machine | — | bcryptjs |

**Missing dependencies with no fallback:** None that block execution.

**Missing dependencies with fallback:**
- bcrypt native: If native bindings fail to compile, use `bcryptjs` instead. Identical API, slightly slower, no build toolchain required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (API) | Node test runner (`node --import tsx --test`) |
| Framework (Web) | Vitest + React Testing Library |
| Config file (Web) | `apps/web/vitest.config.ts` (or `vite.config.ts` — shares config) |
| Quick run command | `npx pnpm --filter @agentsmith/api test` / `npx pnpm --filter @agentsmith/web test` |
| Full suite command | `npx pnpm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOOT-01 | `POST /api/bootstrap` creates admin user and sets session cookie | unit (API route test) | `npx pnpm --filter @agentsmith/api test` | ❌ Wave 0 |
| BOOT-01 | `POST /api/bootstrap` hashes password with bcrypt (not plaintext) | unit (API route test) | `npx pnpm --filter @agentsmith/api test` | ❌ Wave 0 |
| BOOT-02 | `GET /api/bootstrap-status` returns `{ bootstrapRequired: true }` when no admin exists | unit (API route test) | `npx pnpm --filter @agentsmith/api test` | ❌ Wave 0 |
| BOOT-02 | `ProtectedLayout` redirects to `/setup` when `bootstrapRequired: true` | unit (web component test) | `npx pnpm --filter @agentsmith/web test` | ❌ Wave 0 |
| BOOT-02 | `SetupPage` redirects to `/login` when `bootstrapRequired: false` | unit (web component test) | `npx pnpm --filter @agentsmith/web test` | ❌ Wave 0 |
| BOOT-03 | `POST /api/bootstrap` returns 409 when admin already exists | unit (API route test) | `npx pnpm --filter @agentsmith/api test` | ❌ Wave 0 |
| BOOT-03 | Second POST to `/api/bootstrap` with different username also returns 409 | unit (API route test) | `npx pnpm --filter @agentsmith/api test` | ❌ Wave 0 |

**Existing tests that must remain green:**
- `apps/web/src/test/router.smoke.test.tsx` — all 17 route smoke tests
- `apps/web/src/routes/auth-routing.test.tsx` — 3 auth routing tests (Entra path)
- All existing API tests

**Bootstrap-specific test file:** `apps/api/src/routes/bootstrap.test.ts` — to be created in Wave 0.

**Web bootstrap test file:** `apps/web/src/routes/SetupPage.test.tsx` — to be created alongside the component.

### Sampling Rate
- **Per task commit:** `npx pnpm test` (full suite; fast enough given mock-heavy tests)
- **Per wave merge:** `npx pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/routes/bootstrap.test.ts` — covers BOOT-01, BOOT-02, BOOT-03 (API layer)
- [ ] `apps/web/src/routes/SetupPage.test.tsx` — covers BOOT-01 web form, BOOT-02 redirect from setup when complete
- [ ] Mock API extension in `apps/web/src/test/mockApi.ts` — add `GET /api/bootstrap-status` and `POST /api/bootstrap` handlers

*(Web mock API already exists at `apps/web/src/test/mockApi.ts` — needs new route handlers added.)*

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `apps/api/src/plugins/auth.ts` — full auth service, session cookie infrastructure, AuthProvider interface
- Direct codebase read: `prisma/schema.prisma` — confirmed `User.passwordHash`, `User.role`, `@@unique([sourceSystem, sourceId])`
- Direct codebase read: `packages/shared/src/env.ts` — confirmed Entra vars already optional
- Direct codebase read: `apps/web/src/routes/ProtectedLayout.tsx` — existing redirect logic
- Direct codebase read: `apps/web/src/router.tsx` — route structure and appRoutes array
- Direct codebase read: `apps/web/src/hooks/useSession.ts` — TanStack Query session pattern to mirror
- Direct codebase read: `.planning/STATE.md` — confirmed Phase 10 decisions and "Phase 11 next"

### Secondary (MEDIUM confidence)
- bcrypt README (https://github.com/kelektiv/node.bcrypt.js) — work factor 12 recommendation, timing-safe compare API
- OWASP Password Storage Cheat Sheet — bcrypt minimum factor 10, recommended 12 for 2024+

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — bcrypt is industry standard; all other stack is existing project code
- Architecture: HIGH — directly grounded in codebase reading; patterns mirror existing auth.ts structure
- Pitfalls: HIGH — directly derived from TODO comments in existing code and known bcrypt security patterns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain — no fast-moving external dependencies)
