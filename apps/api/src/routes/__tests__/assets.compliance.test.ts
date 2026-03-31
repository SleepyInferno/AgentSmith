import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type { AgentSmithAuthService, OperatorSession } from "../../plugins/auth.js";
import { buildServer } from "../../server.js";
import type { AssetDetail } from "../../modules/assets/asset-health.types.js";

const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  SESSION_SECRET: "test-session-secret-compliance",
};

const operatorSession: OperatorSession = {
  sessionId: "session-compliance-1",
  user: {
    id: "user-compliance-1",
    email: "admin@agentsmith.local",
    displayName: "admin",
  },
  expiresAt: "2028-01-01T00:00:00.000Z",
};

function buildAuthService(): AgentSmithAuthService {
  return {
    async beginLogin(reply) {
      reply.code(503).send({ error: "entra_not_configured" });
    },
    async completeCallback() {
      return null as never;
    },
    async getSession() {
      return operatorSession;
    },
    clearSession() {},
    loginLocal() {},
  };
}

const mockDetailWithCompliance: AssetDetail = {
  id: "test-device-1",
  name: "TEST-DEVICE-01",
  ownerName: "Test Owner",
  ownerEmail: "test.owner@example.com",
  department: "IT",
  site: "HQ",
  operatingSystem: "Windows 11 Pro",
  lastCheckInAt: "2026-03-28T14:00:00.000Z",
  encryptionStatus: "healthy",
  antivirusStatus: "healthy",
  patchStatus: "healthy",
  diskFreePercent: 55,
  deviceAgeDays: 400,
  supportStatus: "healthy",
  riskScore: 12,
  riskLevel: "low",
  queueRank: 1,
  freshnessState: "healthy",
  summary: "All signals healthy",
  signals: [],
  complianceState: "compliant",
  serialNumber: "SN-TEST-01",
  sourceSystem: "intune",
  sourceId: "intune-test-device-1",
  calculatedAt: "2026-03-28T15:00:00.000Z",
  complianceAssignments: [
    {
      policyName: "Windows Baseline",
      platform: "windows10AndLater",
      status: "compliant",
      lastReportedAt: "2026-03-31T00:00:00.000Z",
    },
  ],
};

test("GET /api/assets/devices/:deviceId includes complianceAssignments array in response", async () => {
  const { app } = buildServer({
    env: testEnv,
    authService: buildAuthService(),
    systemKey: Buffer.alloc(32),
    assetRoutes: {
      assetHealthRepository: {
        listQueue: async () => [],
        listInventory: async () => [],
        getDeviceDetail: async (_deviceId: string) => mockDetailWithCompliance,
      },
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/assets/devices/test-device-1",
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body) as {
    complianceAssignments: Array<{
      policyName: string;
      platform: string;
      status: string;
      lastReportedAt: string | null;
    }>;
  };
  assert.ok(Array.isArray(body.complianceAssignments), "complianceAssignments should be an array");
  assert.equal(body.complianceAssignments.length, 1);
  assert.equal(body.complianceAssignments[0]!.policyName, "Windows Baseline");
  assert.equal(body.complianceAssignments[0]!.platform, "windows10AndLater");
  assert.equal(body.complianceAssignments[0]!.status, "compliant");
  assert.equal(body.complianceAssignments[0]!.lastReportedAt, "2026-03-31T00:00:00.000Z");
});

test("GET /api/assets/devices/:deviceId returns empty complianceAssignments when none exist", async () => {
  const detailNoCompliance: AssetDetail = {
    ...mockDetailWithCompliance,
    complianceAssignments: [],
  };

  const { app } = buildServer({
    env: testEnv,
    authService: buildAuthService(),
    systemKey: Buffer.alloc(32),
    assetRoutes: {
      assetHealthRepository: {
        listQueue: async () => [],
        listInventory: async () => [],
        getDeviceDetail: async (_deviceId: string) => detailNoCompliance,
      },
    },
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/assets/devices/test-device-1",
  });

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body) as { complianceAssignments: unknown[] };
  assert.ok(Array.isArray(body.complianceAssignments), "complianceAssignments should be an array");
  assert.equal(body.complianceAssignments.length, 0);
});
