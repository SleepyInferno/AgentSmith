import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type { PrismaClient } from "@prisma/client";
import { authAuditActions, type AuditWriteInput } from "../modules/audit/audit.service.js";
import { AuthCallbackError, type AgentSmithAuthService, type CompletedLogin, type OperatorSession } from "../plugins/auth.js";
import { buildServer } from "../server.js";

const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  ENTRA_TENANT_ID: "tenant-id",
  ENTRA_CLIENT_ID: "client-id",
  ENTRA_CLIENT_SECRET: "client-secret",
  ENTRA_REDIRECT_URI: "http://localhost:3001/auth/callback",
  SESSION_SECRET: "session-secret",
};

const operatorSession: OperatorSession = {
  sessionId: "session-1",
  user: {
    id: "user-1",
    email: "operator@example.com",
    displayName: "Operator One",
  },
  expiresAt: "2026-03-28T18:00:00.000Z",
};

const completedLogin: CompletedLogin = {
  session: operatorSession,
  identity: {
    sourceId: "entra-user-1",
    email: "operator@example.com",
    displayName: "Operator One",
  },
};

function buildPrismaStub() {
  return {
    $disconnect: async () => undefined,
    user: {},
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
      reply.code(302).header("location", "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    },
    async completeCallback() {
      return completedLogin;
    },
    async getSession(request) {
      return request.headers["x-test-auth"] === "true" ? operatorSession : null;
    },
    clearSession(reply) {
      reply.header("set-cookie", "agentsmith_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax");
    },
    ...overrides,
  };
}

test("GET /auth/login redirects through the auth service", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub(),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/auth/login",
  });

  assert.equal(response.statusCode, 302);
  assert.equal(response.headers.location, "https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
});

test("GET /auth/callback records successful sign-in events and redirects home", async (t) => {
  const writes: AuditWriteInput[] = [];
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub(),
    authService: buildAuthService(),
    auditService: {
      write: async (input) => {
        writes.push(input);
        return createAuditRecord(input);
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/auth/callback?code=test-code&state=test-state",
  });

  assert.equal(response.statusCode, 302);
  assert.equal(response.headers.location, "http://localhost:3000/");
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.action, authAuditActions.login);
  assert.equal(writes[0]?.actorId, "user-1");
  assert.equal(writes[0]?.targetType, "session");
  assert.equal(writes[0]?.targetId, "session-1");
  assert.equal(writes[0]?.result, "success");
});

test("GET /auth/callback records failed sign-in events when callback validation fails", async (t) => {
  const writes: AuditWriteInput[] = [];
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub(),
    authService: buildAuthService({
      async completeCallback() {
        throw new AuthCallbackError("State mismatch", "state-123", {
          reason: "state_mismatch",
        });
      },
    }),
    auditService: {
      write: async (input) => {
        writes.push(input);
        return createAuditRecord(input);
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/auth/callback?state=state-123",
  });

  assert.equal(response.statusCode, 302);
  assert.equal(response.headers.location, "http://localhost:3000/login?error=auth_failed");
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.action, authAuditActions.loginFailed);
  assert.equal(writes[0]?.actorId, null);
  assert.equal(writes[0]?.targetType, "session");
  assert.equal(writes[0]?.targetId, "state-123");
  assert.equal(writes[0]?.result, "failure");
});

test("POST /auth/logout records sign-out events for active sessions", async (t) => {
  const writes: AuditWriteInput[] = [];
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub(),
    authService: buildAuthService(),
    auditService: {
      write: async (input) => {
        writes.push(input);
        return createAuditRecord(input);
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: {
      "x-test-auth": "true",
    },
  });

  assert.equal(response.statusCode, 204);
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.action, authAuditActions.logout);
  assert.equal(writes[0]?.actorId, "user-1");
  assert.equal(writes[0]?.result, "signed_out");
});

test("GET /api/me returns authenticated state from the API session", async (t) => {
  const { app } = buildServer({
    env: testEnv,
    prisma: buildPrismaStub(),
    authService: buildAuthService(),
    auditService: { write: async (input) => createAuditRecord(input) },
  });

  t.after(async () => {
    await app.close();
  });

  const unauthenticatedResponse = await app.inject({
    method: "GET",
    url: "/api/me",
  });

  assert.equal(unauthenticatedResponse.statusCode, 401);
  assert.deepEqual(unauthenticatedResponse.json(), {
    authenticated: false,
  });

  const authenticatedResponse = await app.inject({
    method: "GET",
    url: "/api/me",
    headers: {
      "x-test-auth": "true",
    },
  });

  assert.equal(authenticatedResponse.statusCode, 200);
  assert.deepEqual(authenticatedResponse.json(), {
    authenticated: true,
    user: {
      id: "user-1",
      email: "operator@example.com",
      displayName: "Operator One",
    },
  });
});
