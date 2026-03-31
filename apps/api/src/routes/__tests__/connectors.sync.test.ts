import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type { AgentSmithAuthService, OperatorSession } from "../../plugins/auth.js";
import { buildServer } from "../../server.js";

const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  SESSION_SECRET: "test-session-secret-connectors-sync",
};

const operatorSession: OperatorSession = {
  sessionId: "session-connectors-sync-1",
  user: {
    id: "user-connectors-sync-1",
    email: "admin@agentsmith.local",
    displayName: "admin",
  },
  expiresAt: "2028-01-01T00:00:00.000Z",
};

function buildAuthService(authenticated: boolean): AgentSmithAuthService {
  return {
    async beginLogin(reply) {
      reply.code(503).send({ error: "entra_not_configured" });
    },
    async completeCallback() {
      return null as never;
    },
    async getSession() {
      return authenticated ? operatorSession : null;
    },
    clearSession() {},
    loginLocal() {},
  };
}

const mockRunConnectorSync = async (_connectorId: string) => ({
  connectorId: "intune",
  result: "success",
});

test("POST /api/connectors/intune/sync returns 200 with { ok: true } when authenticated", async () => {
  const { app } = buildServer({
    env: testEnv,
    authService: buildAuthService(true),
    systemKey: Buffer.alloc(32),
    connectorsRoutes: {
      runConnectorSync: mockRunConnectorSync,
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/connectors/intune/sync",
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body) as { ok: boolean; connectorId: string; result: string };
  assert.equal(body.ok, true);
  assert.equal(body.connectorId, "intune");
});

test("POST /api/connectors/intune/sync returns 401 when unauthenticated", async () => {
  const { app } = buildServer({
    env: testEnv,
    authService: buildAuthService(false),
    systemKey: Buffer.alloc(32),
    connectorsRoutes: {
      runConnectorSync: mockRunConnectorSync,
    },
  });

  const response = await app.inject({
    method: "POST",
    url: "/api/connectors/intune/sync",
  });

  assert.equal(response.statusCode, 401);
});
