import assert from "node:assert/strict";
import test from "node:test";
import { buildDeviceDetail, buildQueueItems, scoreDeviceRisk } from "./asset-health.service.js";
import type { AssetDeviceForScoring } from "./asset-health.service.js";

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

test("scoreDeviceRisk marks missing encryption with stale check-in as critical risk", () => {
  const result = scoreDeviceRisk(
    makeDevice({
      encryptionStatus: "missing",
      lastCheckInAt: "2026-02-01T00:00:00.000Z",
    }),
  );

  assert.equal(result.riskScore, 55);
  assert.equal(result.riskLevel, "high");
  assert.deepEqual(
    result.signals.map((signal) => signal.code),
    ["missing_encryption", "stale_check_in"],
  );
});

test("scoreDeviceRisk keeps incomplete data devices out of healthy state", () => {
  const result = scoreDeviceRisk(
    makeDevice({
      antivirusStatus: "unknown",
    }),
  );

  assert.equal(result.riskScore, 10);
  assert.equal(result.riskLevel, "watch");
  assert.equal(result.signals.at(-1)?.code, "data_incomplete");
});

test("low-risk devices stay low risk and queue behind higher-risk devices", () => {
  const lowRiskDevice = makeDevice({ id: "device-low", name: "OPS-LT-02" });
  const highRiskDevice = makeDevice({
    id: "device-high",
    name: "OPS-LT-03",
    encryptionStatus: "missing",
    antivirusStatus: "missing",
    lastCheckInAt: "2026-01-15T00:00:00.000Z",
  });

  const result = scoreDeviceRisk(lowRiskDevice);
  const queue = buildQueueItems([lowRiskDevice, highRiskDevice]);
  const detail = buildDeviceDetail(lowRiskDevice);

  assert.equal(result.riskScore, 0);
  assert.equal(result.riskLevel, "low");
  assert.equal(result.signals.length, 0);
  assert.equal(queue[0]?.id, "device-high");
  assert.equal(queue[1]?.id, "device-low");
  assert.equal(detail.riskLevel, "low");
});
