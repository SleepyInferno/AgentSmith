import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import { buildDeviceDetail, buildQueueItems } from "../modules/assets/asset-health.service.js";
import type { AssetDeviceForScoring } from "../modules/assets/asset-health.service.js";
import type { AssetDetail, AssetInventoryFilters, AssetInventoryRow, AssetQueueItem } from "../modules/assets/asset-health.types.js";
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

function makeDevice(overrides: Partial<AssetDeviceForScoring> = {}): AssetDeviceForScoring {
  return {
    id: "device-1",
    name: "OPS-LT-01",
    ownerName: "Taylor Admin",
    ownerEmail: "taylor@example.com",
    department: "IT",
    site: "HQ",
    operatingSystem: "Windows 11",
    lastCheckInAt: new Date().toISOString(),
    encryptionStatus: "healthy",
    antivirusStatus: "healthy",
    patchStatus: "healthy",
    diskFreePercent: 42,
    deviceAgeDays: 400,
    supportStatus: "healthy",
    freshnessState: "healthy",
    serialNumber: "ABC123",
    complianceState: "compliant",
    sourceSystem: "intune",
    sourceId: "managed-device-1",
    ...overrides,
  };
}

function makeInventoryRow(overrides: Partial<AssetInventoryRow> = {}): AssetInventoryRow {
  return {
    id: "device-1",
    name: "OPS-LT-01",
    ownerName: "Taylor Admin",
    ownerEmail: "taylor@example.com",
    department: "IT",
    site: "HQ",
    operatingSystem: "Windows 11",
    lastCheckInAt: "2026-03-20T00:00:00.000Z",
    encryptionStatus: "healthy",
    antivirusStatus: "healthy",
    patchStatus: "healthy",
    diskFreePercent: 42,
    deviceAgeDays: 400,
    supportStatus: "healthy",
    riskScore: 0,
    riskLevel: "low",
    queueRank: 2,
    freshnessState: "healthy",
    summary: "No active risk signals.",
    signals: [],
    ...overrides,
  };
}

test("GET /api/assets/queue returns ranked queue items in descending risk order", async (t) => {
  const queueItems: AssetQueueItem[] = buildQueueItems([
    makeDevice({ id: "device-low", name: "OPS-LT-02" }),
    makeDevice({
      id: "device-high",
      name: "OPS-LT-99",
      encryptionStatus: "missing",
      antivirusStatus: "missing",
      lastCheckInAt: "2026-01-01T00:00:00.000Z",
      freshnessState: "stale",
    }),
  ]);

  const { app } = buildServer({
    env: testEnv,
    assetRoutes: {
      assetHealthRepository: {
        async listQueue() {
          return queueItems;
        },
        async listInventory() {
          return [];
        },
        async getDeviceDetail() {
          return null;
        },
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/assets/queue",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    items: Array<{ deviceId: string; deviceName: string; queueRank: number; riskScore: number; sourceFreshnessState: string }>;
  };

  assert.equal(body.items[0]?.deviceId, "device-high");
  assert.equal(body.items[0]?.queueRank, 1);
  assert.equal(body.items[0]?.riskScore > body.items[1]!.riskScore, true);
  assert.equal(body.items[0]?.sourceFreshnessState, "stale");
});

test("GET /api/assets/devices?staleOnly=true returns only stale rows", async (t) => {
  const rows = [
    makeInventoryRow({
      id: "device-stale",
      name: "OPS-LT-03",
      riskScore: 20,
      riskLevel: "watch",
      freshnessState: "stale",
      signals: [
        {
          code: "stale_check_in",
          severity: "high",
          label: "Stale check-in",
          explanation: "The device has not checked in recently enough to trust its current telemetry.",
        },
      ],
      summary: "watch risk driven by stale check-in.",
    }),
    makeInventoryRow({
      id: "device-fresh",
      name: "OPS-LT-04",
      freshnessState: "healthy",
      summary: "No active risk signals.",
    }),
  ];

  const { app } = buildServer({
    env: testEnv,
    assetRoutes: {
      assetHealthRepository: {
        async listQueue() {
          return [];
        },
        async listInventory(filters?: AssetInventoryFilters) {
          return filters?.staleOnly ? rows.filter((row) => row.freshnessState === "stale") : rows;
        },
        async getDeviceDetail() {
          return null;
        },
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/assets/devices?staleOnly=true",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    items: Array<{ deviceId: string; sourceFreshnessState: string }>;
  };

  assert.equal(body.items.length, 1);
  assert.equal(body.items[0]?.deviceId, "device-stale");
  assert.equal(body.items[0]?.sourceFreshnessState, "stale");
});

test("GET /api/assets/devices/:deviceId returns signals, summary, and sourceFreshnessState", async (t) => {
  const detail: AssetDetail = buildDeviceDetail(
    makeDevice({
      id: "device-detail",
      name: "OPS-LT-07",
      encryptionStatus: "missing",
      lastCheckInAt: "2026-02-01T00:00:00.000Z",
      freshnessState: "stale",
    }),
  );

  const { app } = buildServer({
    env: testEnv,
    assetRoutes: {
      assetHealthRepository: {
        async listQueue() {
          return [];
        },
        async listInventory() {
          return [];
        },
        async getDeviceDetail(deviceId: string) {
          return deviceId === "device-detail" ? detail : null;
        },
      },
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/assets/devices/device-detail",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    deviceId: string;
    signals: Array<{ code: string }>;
    summary: string;
    sourceFreshnessState: string;
  };

  assert.equal(body.deviceId, "device-detail");
  assert.equal(Array.isArray(body.signals), true);
  assert.equal(body.signals.length > 0, true);
  assert.equal(typeof body.summary, "string");
  assert.equal(body.sourceFreshnessState, "stale");
});
