import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import type { AgentSmithAuthService, OperatorSession } from "../../plugins/auth.js";
import { registerSettingsRoutes } from "../settings.js";

const operatorSession: OperatorSession = {
  sessionId: "session-settings-1",
  user: {
    id: "user-settings-1",
    email: "admin@agentsmith.local",
    displayName: "admin",
  },
  expiresAt: "2028-01-01T00:00:00.000Z",
};

function buildAuthService(authenticated: boolean): Pick<AgentSmithAuthService, "getSession"> {
  return {
    async getSession() {
      return authenticated ? operatorSession : null;
    },
  };
}

type AppSettingRow = {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
};

function buildApp(opts: {
  authenticated?: boolean;
  findManyResult?: AppSettingRow[];
  upsertResult?: AppSettingRow;
  findUniqueResult?: AppSettingRow | null;
  onSourceFolderChanged?: (newPath: string) => Promise<void>;
}): FastifyInstance {
  const {
    authenticated = true,
    findManyResult = [],
    upsertResult,
    findUniqueResult = null,
  } = opts;

  const mockPrisma = {
    appSetting: {
      findMany: async () => findManyResult,
      findUnique: async (_args: { where: { key: string } }) => findUniqueResult,
      upsert: async (_args: unknown) =>
        upsertResult ?? ({ key: "test", value: "value", createdAt: new Date(), updatedAt: new Date() } as AppSettingRow),
    },
  };

  const app = Fastify({ logger: false });
  void app.register(registerSettingsRoutes, {
    prisma: mockPrisma as Parameters<typeof registerSettingsRoutes>[1]["prisma"],
    authService: buildAuthService(authenticated),
    onSourceFolderChanged: opts.onSourceFolderChanged,
  });
  return app;
}

describe("GET /api/settings", () => {
  it("returns {} when no settings exist", async () => {
    const app = buildApp({ findManyResult: [] });
    const response = await app.inject({ method: "GET", url: "/api/settings" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {});
  });

  it("returns key-value map when settings exist", async () => {
    const app = buildApp({
      findManyResult: [
        { key: "ingest.sourceFolder", value: "/tmp/src", createdAt: new Date(), updatedAt: new Date() },
        { key: "ingest.outputFolder", value: "/tmp/out", createdAt: new Date(), updatedAt: new Date() },
      ],
    });
    const response = await app.inject({ method: "GET", url: "/api/settings" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      "ingest.sourceFolder": "/tmp/src",
      "ingest.outputFolder": "/tmp/out",
    });
  });

  it("returns 401 without authenticated session", async () => {
    const app = buildApp({ authenticated: false });
    const response = await app.inject({ method: "GET", url: "/api/settings" });
    assert.equal(response.statusCode, 401);
  });
});

describe("PUT /api/settings", () => {
  it("upserts settings and returns { ok: true }", async () => {
    let upsertCalled = false;
    const app = buildApp({
      findManyResult: [],
      upsertResult: { key: "ingest.sourceFolder", value: "/tmp/src", createdAt: new Date(), updatedAt: new Date() },
    });

    // Override upsert to track calls
    const appWithTracking = Fastify({ logger: false });
    void appWithTracking.register(registerSettingsRoutes, {
      prisma: {
        appSetting: {
          findMany: async () => [],
          findUnique: async () => null,
          upsert: async (_args: unknown) => {
            upsertCalled = true;
            return { key: "ingest.sourceFolder", value: "/tmp/src", createdAt: new Date(), updatedAt: new Date() };
          },
        },
      } as Parameters<typeof registerSettingsRoutes>[1]["prisma"],
      authService: buildAuthService(true),
    });

    const response = await appWithTracking.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "ingest.sourceFolder", value: "/tmp/src" }] }),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.ok(upsertCalled, "prisma.appSetting.upsert should have been called");
  });

  it("after PUT returns updated value in GET", async () => {
    // Simulate round-trip: store is updated after PUT
    let storedSettings: AppSettingRow[] = [];

    const appWithStorage = Fastify({ logger: false });
    void appWithStorage.register(registerSettingsRoutes, {
      prisma: {
        appSetting: {
          findMany: async () => storedSettings,
          findUnique: async (args: { where: { key: string } }) =>
            storedSettings.find((s) => s.key === args.where.key) ?? null,
          upsert: async (args: { where: { key: string }; create: AppSettingRow; update: Partial<AppSettingRow> }) => {
            const existing = storedSettings.findIndex((s) => s.key === args.where.key);
            const row: AppSettingRow = { key: args.where.key, value: args.create.value, createdAt: new Date(), updatedAt: new Date() };
            if (existing >= 0) storedSettings[existing] = row;
            else storedSettings.push(row);
            return row;
          },
        },
      } as Parameters<typeof registerSettingsRoutes>[1]["prisma"],
      authService: buildAuthService(true),
    });

    // PUT to store the value
    await appWithStorage.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "ingest.sourceFolder", value: "/tmp/src" }] }),
    });

    // GET to verify it's stored (resolve() normalizes the path on all platforms)
    const getResponse = await appWithStorage.inject({ method: "GET", url: "/api/settings" });
    assert.equal(getResponse.statusCode, 200);
    const body = getResponse.json<Record<string, string>>();
    assert.equal(body["ingest.sourceFolder"], resolve("/tmp/src"));
  });

  it("returns 400 when sourceFolder and outputFolder are the same path", async () => {
    const app = buildApp({
      findManyResult: [],
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settings: [
          { key: "ingest.sourceFolder", value: "/tmp/docs" },
          { key: "ingest.outputFolder", value: "/tmp/docs" },
        ],
      }),
    });

    assert.equal(response.statusCode, 400);
    const body = response.json<{ error: string }>();
    assert.ok(body.error.includes("Source and output folders must not be the same"), `Expected same-path error, got: ${body.error}`);
  });

  it("returns 400 when new sourceFolder matches existing outputFolder", async () => {
    const app = buildApp({
      findManyResult: [
        { key: "ingest.outputFolder", value: "/tmp/docs", createdAt: new Date(), updatedAt: new Date() },
      ],
      findUniqueResult: { key: "ingest.outputFolder", value: "/tmp/docs", createdAt: new Date(), updatedAt: new Date() },
    });

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        settings: [{ key: "ingest.sourceFolder", value: "/tmp/docs" }],
      }),
    });

    assert.equal(response.statusCode, 400);
    const body = response.json<{ error: string }>();
    assert.ok(body.error.includes("Source and output folders must not be the same"), `Expected same-path error, got: ${body.error}`);
  });

  it("returns 401 without authenticated session", async () => {
    const app = buildApp({ authenticated: false });

    const response = await app.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "ingest.sourceFolder", value: "/tmp/src" }] }),
    });

    assert.equal(response.statusCode, 401);
  });

  it("calls onSourceFolderChanged when ingest.sourceFolder is updated", async () => {
    let changedPath: string | null = null;
    const app = Fastify({ logger: false });

    void app.register(registerSettingsRoutes, {
      prisma: {
        appSetting: {
          findMany: async () => [],
          findUnique: async () => null,
          upsert: async (_args: unknown) => ({ key: "ingest.sourceFolder", value: "/new/path", createdAt: new Date(), updatedAt: new Date() }),
        },
      } as Parameters<typeof registerSettingsRoutes>[1]["prisma"],
      authService: buildAuthService(true),
      onSourceFolderChanged: async (newPath: string) => {
        changedPath = newPath;
      },
    });

    await app.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: [{ key: "ingest.sourceFolder", value: "/new/path" }] }),
    });

    // resolve() produces an absolute path; on Windows it converts /new/path to C:\new\path
    // so just check that the path ends with the expected directory
    assert.ok(
      changedPath !== null && changedPath.includes("new") && changedPath.includes("path"),
      `onSourceFolderChanged should be called with the new path, got: ${changedPath}`
    );
  });
});
