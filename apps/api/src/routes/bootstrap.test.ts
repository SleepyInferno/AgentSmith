import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type { PrismaClient } from "@prisma/client";
import type { AuditWriteInput } from "../modules/audit/audit.service.js";
import type { AgentSmithAuthService, OperatorSession, CompletedLogin } from "../plugins/auth.js";
import { buildServer } from "../server.js";

// Bootstrap tests run without Entra env vars to verify no-Entra startup
const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  SESSION_SECRET: "test-session-secret-for-bootstrap-tests",
};

const operatorSession: OperatorSession = {
  sessionId: "session-bootstrap-1",
  user: {
    id: "user-bootstrap-1",
    email: "admin@agentsmith.local",
    displayName: "admin",
  },
  expiresAt: "2028-01-01T00:00:00.000Z",
};

const completedLogin: CompletedLogin = {
  session: operatorSession,
  identity: {
    sourceId: "admin",
    email: "admin@agentsmith.local",
    displayName: "admin",
  },
  redirectPath: null,
};

function createAuditRecord(input: AuditWriteInput) {
  return {
    id: `audit-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date(),
    timestamp: input.timestamp instanceof Date ? input.timestamp : new Date(input.timestamp),
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    result: input.result,
    metadata: input.metadata,
  };
}

function buildAuthService(overrides: Partial<AgentSmithAuthService> = {}): AgentSmithAuthService {
  return {
    async beginLogin(reply) {
      reply.code(503).send({ error: "entra_not_configured" });
    },
    async completeCallback() {
      return completedLogin;
    },
    async getSession() {
      return null;
    },
    clearSession() {
      // no-op
    },
    loginLocal(_reply, _userId) {
      // no-op spy — loginLocal being called is what we test
    },
    ...overrides,
  };
}

type UserCountStub = (args?: { where?: { role?: string } }) => Promise<number>;
type UserCreateStub = (args: { data: Record<string, unknown> }) => Promise<{ id: string; displayName: string; email: string | null }>;
type UserFindFirstStub = (args: { where: Record<string, unknown>; select: Record<string, boolean> }) => Promise<{ id: string; passwordHash: string | null; displayName: string; email: string | null } | null>;

function buildPrismaStub(overrides: {
  userCount?: UserCountStub;
  userCreate?: UserCreateStub;
  userFindFirst?: UserFindFirstStub;
} = {}) {
  return {
    $disconnect: async () => undefined,
    user: {
      count: overrides.userCount ?? (async () => 0),
      create: overrides.userCreate ?? (async (args) => ({
        id: "new-user-id",
        displayName: String(args.data.displayName ?? ""),
        email: null,
      })),
      findFirst: overrides.userFindFirst ?? (async () => null),
      findUnique: async () => null,
    },
    auditEvent: {},
    device: {},
    system: {},
    group: {},
    document: {},
    documentRevision: {},
    connectorSource: {},
    syncRun: {},
    lifecycleTemplate: {},
    lifecycleRun: {},
    lifecycleRunStep: {},
    backupProtectedSystem: {},
    backupProviderEvidence: {},
    backupRestoreTest: {},
    networkResource: {},
    networkRelationship: {},
    networkFinding: {},
  } as unknown as PrismaClient;
}

// ─── Test 1: GET /api/bootstrap-status returns { bootstrapRequired: true } when no admin ───

test("GET /api/bootstrap-status returns bootstrapRequired: true when no admin exists", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({ userCount: async () => 0 }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/bootstrap-status",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { bootstrapRequired: true });
});

// ─── Test 2: GET /api/bootstrap-status returns { bootstrapRequired: false } when admin exists ───

test("GET /api/bootstrap-status returns bootstrapRequired: false when admin exists", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({ userCount: async () => 1 }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/bootstrap-status",
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { bootstrapRequired: false });
});

// ─── Test 3: POST /api/bootstrap creates admin with bcrypt hash ───

test("POST /api/bootstrap creates admin user with bcrypt hash and returns 201", async (t) => {
  let createdUserData: Record<string, unknown> | null = null;

  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({
      userCount: async () => 0,
      userCreate: async (args) => {
        createdUserData = { ...args.data };
        return { id: "created-admin-id", displayName: String(args.data.displayName ?? ""), email: null };
      },
    }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/bootstrap",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "securepassword123" }),
  });

  assert.equal(response.statusCode, 201, `Expected 201 but got ${response.statusCode}: ${response.body}`);
  assert.ok(createdUserData !== null, "prisma.user.create should have been called");
  assert.equal(createdUserData?.sourceSystem, "local");
  assert.equal(createdUserData?.role, "admin");
  const hash = createdUserData?.passwordHash as string;
  assert.ok(
    typeof hash === "string" && hash.startsWith("$2b$12$"),
    `Expected passwordHash to start with '$2b$12$' but got: ${hash}`,
  );
  // Confirm password is NOT stored as plaintext
  assert.notEqual(hash, "securepassword123");
});

// ─── Test 4: POST /api/bootstrap returns 409 when admin already exists ───

test("POST /api/bootstrap returns 409 when admin already exists", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({ userCount: async () => 1 }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/bootstrap",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "securepassword123" }),
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), { error: "bootstrap_already_completed" });
});

// ─── Test 5: POST /api/bootstrap with missing username returns 400 ───

test("POST /api/bootstrap with missing username returns 400", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({ userCount: async () => 0 }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/bootstrap",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "securepassword123" }),
  });

  assert.equal(response.statusCode, 400);
  const body = response.json() as { error: string };
  assert.equal(body.error, "invalid_username");
});

// ─── Test 6: POST /api/bootstrap with short password returns 400 ───

test("POST /api/bootstrap with password shorter than 8 chars returns 400", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({ userCount: async () => 0 }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/bootstrap",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "short" }),
  });

  assert.equal(response.statusCode, 400);
  const body = response.json() as { error: string };
  assert.equal(body.error, "invalid_password");
});

// ─── Test 7: POST /api/auth/local/login returns 200 with valid credentials ───

test("POST /api/auth/local/login with valid credentials returns 200 with redirectPath", async (t) => {
  // Use a real bcrypt hash for "correctpassword"
  // $2b$12$ hash of "correctpassword" - pre-computed for test determinism
  // We'll use a low round count for speed in tests by using the actual bcrypt module
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("correctpassword", 4); // low rounds for test speed

  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({
      userCount: async () => 1,
      userFindFirst: async () => ({
        id: "local-user-id",
        passwordHash: hash,
        displayName: "admin",
        email: null,
      }),
    }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/local/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "correctpassword" }),
  });

  assert.equal(response.statusCode, 200, `Expected 200 but got ${response.statusCode}: ${response.body}`);
  assert.deepEqual(response.json(), { redirectPath: "/" });
});

// ─── Test 8: POST /api/auth/local/login with wrong password returns 401 ───

test("POST /api/auth/local/login with wrong password returns 401", async (t) => {
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash("correctpassword", 4);

  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({
      userCount: async () => 1,
      userFindFirst: async () => ({
        id: "local-user-id",
        passwordHash: hash,
        displayName: "admin",
        email: null,
      }),
    }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/local/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrongpassword" }),
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: "invalid_credentials" });
});

// ─── Test 9: POST /api/auth/local/login with non-existent username returns 401 (timing-safe) ───

test("POST /api/auth/local/login with non-existent username returns 401 same as wrong password", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub({
      userCount: async () => 0,
      userFindFirst: async () => null, // user not found
    }),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/local/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "nonexistent", password: "anypassword" }),
  });

  // Same response shape as wrong password — timing-safe
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: "invalid_credentials" });
});
