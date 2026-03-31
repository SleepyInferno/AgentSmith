---
phase: 11-first-run-bootstrap
verified: 2026-03-30T00:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 11: First-Run Bootstrap Verification Report

**Phase Goal:** Implement first-run bootstrap so the app can be set up without Entra ID as a hard dependency.
**Requirements:** BOOT-01, BOOT-02, BOOT-03
**Verified:** 2026-03-30
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | POST /api/bootstrap creates admin user with bcrypt-hashed password when no admin exists | VERIFIED | `bootstrap.ts` lines 30-75: guards with `prisma.user.count`, calls `bcrypt.hash(password, 12)`, creates user with `passwordHash` and `role: "admin"` |
| 2  | POST /api/bootstrap returns 409 when admin already exists (DB-locked via prisma.user.count) | VERIFIED | `bootstrap.ts` lines 31-35: `if (adminCount > 0)` returns `{ error: "bootstrap_already_completed" }` with `reply.code(409)`; test 4 in `bootstrap.test.ts` confirms this path |
| 3  | GET /api/bootstrap-status returns { bootstrapRequired: true/false } | VERIFIED | `bootstrap.ts` lines 23-26: queries `prisma.user.count({ where: { role: "admin" } })`, returns `{ bootstrapRequired: adminCount === 0 }`; tests 1 and 2 cover both branches |
| 4  | POST /api/auth/local/login authenticates local user and sets session cookie | VERIFIED | `bootstrap.ts` lines 80-128: finds user by `sourceSystem: "local"`, runs `bcrypt.compare`, calls `authService.loginLocal(reply, user.id)` on success; returns `{ redirectPath: "/" }` with 200; test 7 confirms |
| 5  | POST /api/auth/local/login returns 401 for invalid credentials without leaking username existence (timing-safe) | VERIFIED | `bootstrap.ts` lines 96-110: `DUMMY_HASH` used when user not found — `bcrypt.compare` always runs regardless of user existence; both wrong-password (test 8) and non-existent-user (test 9) return identical `{ error: "invalid_credentials" }` with 401 |
| 6  | Server starts without Entra env vars (Entra guard in createAuthService) | VERIFIED | `auth.ts` line 87: `const entraConfigured = !!(options.env.ENTRA_TENANT_ID && options.env.ENTRA_CLIENT_ID)`; `MicrosoftEntraAuthProvider` only constructed when `entraConfigured` is true; `env.ts` lines 7-10: all four Entra vars are `.optional()`; `auth.test.ts` test 1 confirms no-throw with no Entra vars |
| 7  | Session ID regenerated on login (fresh randomUUID in loginLocal) | VERIFIED | `auth.ts` lines 260-275 (standard impl) and 330-347 (dev-bypass impl): both call `randomUUID()` to generate a fresh `sessionId` per invocation; `auth.test.ts` test 2 confirms `agentsmith_session` cookie is set by `loginLocal` |
| 8  | ProtectedLayout redirects to /setup when bootstrapRequired is true | VERIFIED | `ProtectedLayout.tsx` lines 52, 63-65: `useBootstrapStatus()` called; `if (bootstrapData?.bootstrapRequired)` returns `<Navigate to="/setup" replace />`; this check precedes the `!authenticated` check |
| 9  | SetupPage shows admin creation form and navigates to / on success | VERIFIED | `SetupPage.tsx` lines 64-263: renders username/password/confirm inputs with submit button; on success calls `navigate("/", { replace: true })`; `SetupPage.test.tsx` tests 2 and 4 confirm rendering and navigation |
| 10 | SetupPage redirects to /login when bootstrap already completed | VERIFIED | `SetupPage.tsx` lines 19-21: `if (!bootstrapLoading && bootstrapData?.bootstrapRequired === false)` returns `<Navigate to="/login" replace />`; `SetupPage.test.tsx` test 1 confirms redirect |
| 11 | LoginPage shows local credential form | VERIFIED | `LoginPage.tsx` lines 196-297: full form with username input, password input, submit button; form POSTs to `/api/auth/local/login` via `handleLocalLogin` handler; always rendered once bootstrap is complete |
| 12 | /setup route accessible without authentication (outside ProtectedLayout) | VERIFIED | `router.tsx` lines 196-199: `/setup` route declared at top level alongside `/login`, before and outside the `ProtectedLayout` children block |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/routes/bootstrap.ts` | Bootstrap status, create, and local login endpoints | VERIFIED | 129 lines; all three routes fully implemented with real bcrypt and DB guards |
| `apps/api/src/routes/bootstrap.test.ts` | 9 tests covering bootstrap and login behaviors | VERIFIED | 381 lines; 9 tests covering status (2), create (4), and local login (3) |
| `apps/api/src/plugins/auth.ts` | loginLocal on interface and both implementations; Entra guard | VERIFIED | Interface at line 48; standard implementation at lines 259-275; dev-bypass at lines 330-347; Entra guard at line 87 |
| `apps/api/src/plugins/auth.test.ts` | 3 tests: no-Entra startup, loginLocal cookie, beginLogin 503 | VERIFIED | 117 lines; all three tests present and meaningful |
| `apps/api/src/server.ts` | registerBootstrapRoutes registered | VERIFIED | Line 28: import; lines 179-183: `app.register(registerBootstrapRoutes, { authService, auditService, prisma })` |
| `packages/shared/src/env.ts` | All four Entra vars optional | VERIFIED | Lines 7-10: `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI` all `.optional()` |
| `apps/web/src/hooks/useBootstrapStatus.ts` | useBootstrapStatus hook querying /api/bootstrap-status | VERIFIED | 15 lines; queries `/api/bootstrap-status` with `staleTime: Infinity` |
| `apps/web/src/routes/SetupPage.tsx` | Admin creation form at /setup | VERIFIED | 263 lines; full form with submit handler, redirect logic, password mismatch validation |
| `apps/web/src/routes/SetupPage.test.tsx` | 4 tests for SetupPage behaviors | VERIFIED | 154 lines; covers redirect, form rendering, validation, and success flow |
| `apps/web/src/routes/ProtectedLayout.tsx` | Bootstrap redirect before auth check | VERIFIED | Lines 52, 59-65: bootstrap check fires before session auth check |
| `apps/web/src/routes/LoginPage.tsx` | Local login form alongside Microsoft sign-in | VERIFIED | Lines 196-297: full local form with error display |
| `apps/web/src/router.tsx` | /setup route outside ProtectedLayout | VERIFIED | Lines 196-199: `/setup` element at top level, before ProtectedLayout block |
| `apps/web/src/test/mockApi.ts` | Bootstrap handlers with bootstrapRequired option | VERIFIED | Lines 30, 721, 754-768: `bootstrapRequired` option defaulting to false; handlers for all three bootstrap endpoints |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bootstrap.ts` POST /api/bootstrap | `bcrypt.hash` | import bcryptjs | WIRED | Line 1: `import bcrypt from "bcryptjs"`; line 50: `bcrypt.hash(password, BCRYPT_ROUNDS)` |
| `bootstrap.ts` POST /api/bootstrap | `prisma.user.count` | options.prisma | WIRED | Line 31: `prisma.user.count({ where: { role: "admin" } })` — DB-locked guard |
| `bootstrap.ts` POST /api/auth/local/login | `authService.loginLocal` | options.authService | WIRED | Line 114: `options.authService.loginLocal(reply, user.id)` |
| `createAuthService` | `MicrosoftEntraAuthProvider` | entraConfigured guard | WIRED | Line 87-88: `const entraConfigured = !!(...)`; provider set to null when not configured |
| `loginLocal` (auth.ts) | `randomUUID` | node:crypto | WIRED | Line 1: `import { ..., randomUUID, ... } from "node:crypto"`; lines 261, 332: `sessionId: randomUUID()` |
| `ProtectedLayout.tsx` | `useBootstrapStatus` | import | WIRED | Line 5 import; line 52: called; line 63: result checked before auth |
| `SetupPage.tsx` | `POST /api/bootstrap` | apiRequest | WIRED | Lines 35-38: `apiRequest("/api/bootstrap", { method: "POST", body: ... })` |
| `SetupPage.tsx` | `/login` redirect | Navigate | WIRED | Lines 19-21: `bootstrapRequired === false` triggers `<Navigate to="/login" replace />` |
| `LoginPage.tsx` | `POST /api/auth/local/login` | apiRequest | WIRED | Lines 38-41: `apiRequest("/api/auth/local/login", { method: "POST", ... })` |
| `router.tsx` | `/setup` route | outside ProtectedLayout | WIRED | Lines 196-199: `/setup` element declared at top-level array, not inside ProtectedLayout children |
| `server.ts` | `registerBootstrapRoutes` | app.register | WIRED | Lines 28 and 179-183: imported and registered with all required dependencies |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ProtectedLayout.tsx` | `bootstrapData.bootstrapRequired` | `useBootstrapStatus` → `GET /api/bootstrap-status` → `prisma.user.count` | Yes — live DB admin count | FLOWING |
| `SetupPage.tsx` | `bootstrapData.bootstrapRequired` | same hook | Yes | FLOWING |
| `LoginPage.tsx` | `bootstrapData.bootstrapRequired` | same hook | Yes | FLOWING |
| `bootstrap.ts` POST /api/bootstrap | `passwordHash` | `bcrypt.hash(password, 12)` | Yes — real bcrypt output | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — routes require a live database. All behaviors are covered by automated tests in the test suite. The four commits (299ed38, 7368d45, b033273, 1a80ded) are confirmed present in git history.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BOOT-01 | 11-01, 11-02 | Operator can create a local admin account (username + password) on first run when no admin exists | SATISFIED | POST /api/bootstrap creates bcrypt-hashed admin; SetupPage renders and submits form; test coverage in bootstrap.test.ts (tests 3-6) and SetupPage.test.tsx (tests 3-4) |
| BOOT-02 | 11-01, 11-02 | App detects bootstrap state server-side and routes unauthenticated users to setup before any protected route is accessible | SATISFIED | GET /api/bootstrap-status returns DB-backed `bootstrapRequired`; ProtectedLayout checks before session auth; /setup route outside ProtectedLayout |
| BOOT-03 | 11-01, 11-02 | Bootstrap endpoint is permanently locked in the database after the first admin is created | SATISFIED | POST /api/bootstrap uses `prisma.user.count` as gate (not a config flag); returns 409 when adminCount > 0; test 4 in bootstrap.test.ts verifies 409 path |

All three BOOT requirements confirmed SATISFIED. No orphaned requirements — REQUIREMENTS.md traceability table correctly marks all three as Complete for Phase 11.

---

### Anti-Patterns Found

No anti-patterns found. Specifically checked:

- No `TODO`/`FIXME` comments in bootstrap.ts, auth.ts (Phase 11 comments removed per summary)
- No placeholder returns — all three bootstrap endpoints return real data
- `DUMMY_HASH` in bootstrap.ts (line 10) is intentional security pattern, not a stub — it is used for timing-safe comparison, not rendered output
- No hardcoded empty state arrays rendered to users
- `mockApi.ts` handlers are test infrastructure, correctly scoped

---

### Human Verification Required

The following behaviors are correct in code but benefit from human spot-check during first real deployment:

**1. End-to-End Bootstrap Flow**
**Test:** Start the app with a fresh database (no users), navigate to a protected route (e.g., `/`)
**Expected:** Redirect chain: `/` → ProtectedLayout detects `bootstrapRequired: true` → redirects to `/setup`; SetupPage renders form; submit creates admin and lands on dashboard
**Why human:** Requires live database and running server; not automatable in current test setup

**2. Local Login After Bootstrap**
**Test:** After bootstrap, navigate to `/login`, enter the created username/password in the local form
**Expected:** Successful login, redirect to `/`, session cookie set
**Why human:** Requires live database and bcrypt verification against stored hash

**3. Entra-Optional Server Start**
**Test:** Start the API server with no `ENTRA_TENANT_ID` / `ENTRA_CLIENT_ID` environment variables set
**Expected:** Server starts cleanly; `/api/bootstrap-status` responds; Microsoft sign-in button on `/login` still renders but clicking it returns 503
**Why human:** Requires running the actual server binary

---

### Gaps Summary

No gaps. All 12 observable truths are verified. All artifacts exist, are substantive (not stubs), are wired to their dependencies, and data flows through the wiring. All three requirements (BOOT-01, BOOT-02, BOOT-03) are satisfied with test evidence. The four implementation commits (299ed38, 7368d45, b033273, 1a80ded) are confirmed present in the git history.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
