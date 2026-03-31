import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import type { AgentSmithAuthService, OperatorSession } from "../plugins/auth.js";
import { encryptCredential } from "../lib/credential-crypto.js";
import {
  registerIntegrationRoutes,
  type IntuneConnectionProbe,
  type OpenAIConnectionProbe,
} from "./integrations.js";

// Fixed 32-byte test key — works with real AES-256-GCM encrypt/decrypt
const TEST_KEY = Buffer.alloc(32);

const operatorSession: OperatorSession = {
  sessionId: "session-integrations-1",
  user: {
    id: "user-integrations-1",
    email: "admin@agentsmith.local",
    displayName: "admin",
  },
  expiresAt: "2028-01-01T00:00:00.000Z",
};

// Helper to build mock auth service
function buildAuthService(authenticated: boolean): Pick<AgentSmithAuthService, "getSession"> {
  return {
    async getSession() {
      return authenticated ? operatorSession : null;
    },
  };
}

// IntegrationCredential row type for test stubs
type CredRow = {
  id: string;
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  lastTestedAt: Date | null;
  lastTestResult: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function makeRow(key: string, plain: Record<string, unknown>): CredRow {
  const { encryptedValue, iv, authTag } = encryptCredential(TEST_KEY, JSON.stringify(plain));
  return {
    id: `row-${key}`,
    key,
    encryptedValue,
    iv,
    authTag,
    lastTestedAt: null,
    lastTestResult: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Build a test Fastify instance with integration routes registered
function buildApp(opts: {
  authenticated?: boolean;
  findUniqueResult?: CredRow | null;
  upsertResult?: CredRow;
  updateResult?: CredRow;
  findUniqueOverride?: (args: { where: { key: string } }) => Promise<CredRow | null>;
  upsertOverride?: (args: unknown) => Promise<CredRow>;
  updateOverride?: (args: unknown) => Promise<CredRow>;
  testIntune?: IntuneConnectionProbe;
  testOpenAI?: OpenAIConnectionProbe;
}): FastifyInstance {
  const {
    authenticated = true,
    findUniqueResult = null,
    findUniqueOverride,
    upsertOverride,
    updateOverride,
  } = opts;

  const mockPrisma = {
    integrationCredential: {
      findUnique: findUniqueOverride ?? (async (_args: { where: { key: string } }) => findUniqueResult),
      upsert: upsertOverride ?? (async () => (opts.upsertResult ?? makeRow("intune", {}))),
      update: updateOverride ?? (async () => (opts.updateResult ?? makeRow("intune", {}))),
    },
  };

  const app = Fastify({ logger: false });
  void app.register(registerIntegrationRoutes, {
    prisma: mockPrisma as Parameters<typeof registerIntegrationRoutes>[1]["prisma"],
    authService: buildAuthService(authenticated),
    systemKey: TEST_KEY,
    testIntuneConnection: opts.testIntune,
    testOpenAIConnection: opts.testOpenAI,
  });
  return app;
}

// ─── CRED-01: Intune configuration ───────────────────────────────────────────

describe("GET /api/integrations/intune", () => {
  it("returns { configured: false } when no row exists", async () => {
    const app = buildApp({ findUniqueResult: null });

    const response = await app.inject({ method: "GET", url: "/api/integrations/intune" });
    assert.equal(response.statusCode, 200);
    const body = response.json<{ configured: boolean; lastTestedAt: null; lastTestResult: null }>();
    assert.equal(body.configured, false);
    assert.equal(body.lastTestedAt, null);
    assert.equal(body.lastTestResult, null);
  });

  it("returns configured:true with tenantId and clientId after save (no clientSecret)", async () => {
    const row = makeRow("intune", { tenantId: "my-tenant", clientId: "my-client", clientSecret: "my-secret" });
    const app = buildApp({ findUniqueResult: row });

    const response = await app.inject({ method: "GET", url: "/api/integrations/intune" });
    assert.equal(response.statusCode, 200);
    const body = response.json<Record<string, unknown>>();
    assert.equal(body.configured, true);
    assert.equal(body.tenantId, "my-tenant");
    assert.equal(body.clientId, "my-client");
    // CRED-03: secret must never appear in response
    assert.ok(!("clientSecret" in body), "clientSecret must not appear in GET response");
  });
});

describe("PUT /api/integrations/intune", () => {
  it("saves encrypted credential and returns { ok: true }", async () => {
    let upsertCalled = false;
    let upsertData: unknown = null;

    const app = buildApp({
      findUniqueResult: null,
      upsertOverride: async (args: unknown) => {
        upsertCalled = true;
        upsertData = args;
        return makeRow("intune", {});
      },
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/integrations/intune",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "t1", clientId: "c1", clientSecret: "s1" }),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.ok(upsertCalled, "prisma.integrationCredential.upsert should have been called");
    // Verify the payload has encrypted fields (not raw credentials)
    const payload = upsertData as { create: { encryptedValue?: string } };
    assert.ok(typeof payload.create.encryptedValue === "string", "encryptedValue should be present");
  });

  it("with blank clientSecret keeps existing secret", async () => {
    const existingRow = makeRow("intune", {
      tenantId: "t1",
      clientId: "c1",
      clientSecret: "original-secret",
    });

    let upsertData: unknown = null;
    const app = buildApp({
      findUniqueResult: existingRow,
      upsertOverride: async (args: unknown) => {
        upsertData = args;
        return existingRow;
      },
    });

    // PUT with blank clientSecret
    const response = await app.inject({
      method: "PUT",
      url: "/api/integrations/intune",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "t1", clientId: "c1", clientSecret: "" }),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });

    // Decrypt the stored result and verify the original secret is preserved
    const upsertArg = upsertData as {
      create: { encryptedValue: string; iv: string; authTag: string };
    };
    const { decryptCredential } = await import("../lib/credential-crypto.js");
    const decrypted = decryptCredential(TEST_KEY, upsertArg.create.encryptedValue, upsertArg.create.iv, upsertArg.create.authTag);
    const merged = JSON.parse(decrypted) as Record<string, unknown>;
    assert.equal(merged.clientSecret, "original-secret", "original secret should be preserved when blank is submitted");
  });
});

// ─── CRED-02: OpenAI configuration ───────────────────────────────────────────

describe("GET /api/integrations/openai", () => {
  it("returns { configured: false } when no row exists", async () => {
    const app = buildApp({ findUniqueResult: null });

    const response = await app.inject({ method: "GET", url: "/api/integrations/openai" });
    assert.equal(response.statusCode, 200);
    const body = response.json<{ configured: boolean }>();
    assert.equal(body.configured, false);
  });
});

describe("PUT /api/integrations/openai", () => {
  it("saves apiKey and returns { ok: true }", async () => {
    let upsertCalled = false;
    const app = buildApp({
      findUniqueResult: null,
      upsertOverride: async () => {
        upsertCalled = true;
        return makeRow("openai", {});
      },
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/integrations/openai",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apiKey: "sk-test-key" }),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.ok(upsertCalled, "prisma.integrationCredential.upsert should have been called");
  });
});

// ─── CRED-03: Never return secrets ───────────────────────────────────────────

describe("CRED-03: Secrets must not appear in GET responses", () => {
  it("GET /api/integrations/intune response does not contain clientSecret key", async () => {
    const row = makeRow("intune", { tenantId: "t1", clientId: "c1", clientSecret: "very-secret" });
    const app = buildApp({ findUniqueResult: row });

    const response = await app.inject({ method: "GET", url: "/api/integrations/intune" });
    const body = response.json<Record<string, unknown>>();
    assert.ok(!("clientSecret" in body), "clientSecret must not be in response body");
  });

  it("GET /api/integrations/openai response does not contain apiKey key", async () => {
    const row = makeRow("openai", { apiKey: "sk-very-secret-key" });
    const app = buildApp({ findUniqueResult: row });

    const response = await app.inject({ method: "GET", url: "/api/integrations/openai" });
    const body = response.json<Record<string, unknown>>();
    assert.ok(!("apiKey" in body), "apiKey must not be in response body");
  });
});

// ─── CRED-04: Health persistence ─────────────────────────────────────────────

describe("POST /api/integrations/intune/test", () => {
  it("persists lastTestedAt and lastTestResult when test succeeds", async () => {
    const row = makeRow("intune", { tenantId: "t1", clientId: "c1", clientSecret: "s1" });
    let updateData: unknown = null;

    const app = buildApp({
      findUniqueResult: row,
      updateOverride: async (args: unknown) => {
        updateData = args;
        return row;
      },
      testIntune: async () => ({ ok: true, message: "Connected successfully" }),
    });

    const response = await app.inject({ method: "POST", url: "/api/integrations/intune/test" });
    assert.equal(response.statusCode, 200);
    const body = response.json<{ ok: boolean; message: string }>();
    assert.equal(body.ok, true);

    // Verify prisma.update was called with lastTestedAt and lastTestResult
    assert.ok(updateData !== null, "prisma.update should have been called");
    const upd = updateData as { data: { lastTestedAt?: Date; lastTestResult?: string } };
    assert.ok(upd.data.lastTestedAt instanceof Date, "lastTestedAt should be a Date");
    assert.equal(upd.data.lastTestResult, "pass", "lastTestResult should be 'pass' on success");
  });

  it("persists failure message when test fails", async () => {
    const row = makeRow("intune", { tenantId: "t1", clientId: "c1", clientSecret: "s1" });
    let updateData: unknown = null;

    const app = buildApp({
      findUniqueResult: row,
      updateOverride: async (args: unknown) => {
        updateData = args;
        return row;
      },
      testIntune: async () => ({ ok: false, message: "Auth failed: invalid client secret" }),
    });

    const response = await app.inject({ method: "POST", url: "/api/integrations/intune/test" });
    assert.equal(response.statusCode, 200);
    const body = response.json<{ ok: boolean; message: string }>();
    assert.equal(body.ok, false);

    const upd = updateData as { data: { lastTestedAt?: Date; lastTestResult?: string } };
    assert.ok(upd.data.lastTestedAt instanceof Date, "lastTestedAt should be set even on failure");
    assert.equal(upd.data.lastTestResult, "Auth failed: invalid client secret");
  });
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe("Auth guard", () => {
  it("GET /api/integrations/intune returns 401 when no session", async () => {
    const app = buildApp({ authenticated: false });

    const response = await app.inject({ method: "GET", url: "/api/integrations/intune" });
    assert.equal(response.statusCode, 401);
  });

  it("PUT /api/integrations/intune returns 401 when no session", async () => {
    const app = buildApp({ authenticated: false });

    const response = await app.inject({
      method: "PUT",
      url: "/api/integrations/intune",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "t1", clientId: "c1", clientSecret: "s1" }),
    });
    assert.equal(response.statusCode, 401);
  });
});

// ─── Invalid key ──────────────────────────────────────────────────────────────

describe("Invalid integration key", () => {
  it("GET /api/integrations/unknown returns 404", async () => {
    const app = buildApp({});

    const response = await app.inject({ method: "GET", url: "/api/integrations/unknown" });
    assert.equal(response.statusCode, 404);
  });

  it("PUT /api/integrations/unknown returns 404", async () => {
    const app = buildApp({});

    const response = await app.inject({
      method: "PUT",
      url: "/api/integrations/unknown",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.statusCode, 404);
  });
});
