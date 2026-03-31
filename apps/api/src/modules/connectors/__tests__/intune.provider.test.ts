import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import type { ConnectorSyncOutput } from "../providers/entra.provider.js";

// ---------------------------------------------------------------------------
// Mock graph-helpers before importing the provider
// ---------------------------------------------------------------------------

// We'll test the provider by passing mock deps directly, not via module mocks.
// The provider is a factory, so we can test the closure behavior.

// ---------------------------------------------------------------------------
// Mock prisma-like objects
// ---------------------------------------------------------------------------

type MockDeviceUpsert = (args: {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}) => Promise<{ id: string }>;

type MockDeviceDeleteMany = (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;

type MockUserFindMany = (args: { where: Record<string, unknown>; select: Record<string, boolean> }) => Promise<Array<{ id: string; sourceId: string }>>;

type MockPolicyUpsert = (args: {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}) => Promise<{ id: string }>;

type MockAssignmentUpsert = (args: {
  where: Record<string, unknown>;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}) => Promise<{ id: string }>;

function buildMockPrisma(overrides: {
  deviceUpsert?: MockDeviceUpsert;
  deviceDeleteMany?: MockDeviceDeleteMany;
  userFindMany?: MockUserFindMany;
  policyUpsert?: MockPolicyUpsert;
  assignmentUpsert?: MockAssignmentUpsert;
} = {}) {
  return {
    device: {
      upsert: overrides.deviceUpsert ?? (async () => ({ id: "device-1" })),
      deleteMany: overrides.deviceDeleteMany ?? (async () => ({ count: 0 })),
    },
    user: {
      findMany: overrides.userFindMany ?? (async () => []),
    },
    deviceCompliancePolicy: {
      upsert: overrides.policyUpsert ?? (async () => ({ id: "policy-1" })),
    },
    deviceComplianceAssignment: {
      upsert: overrides.assignmentUpsert ?? (async () => ({ id: "assignment-1" })),
    },
    integrationCredential: {
      findUnique: async () => null,
    },
  };
}

// ---------------------------------------------------------------------------
// Import the module under test — must come AFTER mock setup in this framework
// ---------------------------------------------------------------------------

// Lazy import inside each test to allow for different graph-helpers mocks.
// We test by injecting graphPageAll, buildGraphClient and withRetry as deps.

// ---------------------------------------------------------------------------
// Provider factory tests
// ---------------------------------------------------------------------------

describe("createIntuneProvider", () => {
  it("returns a function matching () => Promise<ConnectorSyncOutput>", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const prisma = buildMockPrisma();
    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({ api: () => ({ get: async () => ({ value: [] }) }) } as never),
      graphPageAllFn: async () => [],
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });
    assert.equal(typeof provider, "function");
    const output = await provider();
    assert.ok("recordsSeen" in output);
    assert.ok("recordsNormalized" in output);
    assert.ok("result" in output);
  });

  it("upserts devices with correct field mapping", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const upsertCalls: Array<{ create: Record<string, unknown>; update: Record<string, unknown> }> = [];
    const prisma = buildMockPrisma({
      deviceUpsert: async (args) => {
        upsertCalls.push(args as never);
        return { id: "device-mapped-1" };
      },
    });

    const fakeDevices = [
      {
        id: "intune-device-1",
        deviceName: "TestDevice",
        serialNumber: "SN123",
        operatingSystem: "Windows",
        osVersion: "11 23H2",
        complianceState: "compliant",
        isEncrypted: true,
        lastSyncDateTime: "2026-01-15T10:00:00Z",
        enrolledDateTime: "2025-01-01T00:00:00Z",
        userId: "entra-user-1",
      },
    ];

    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (client: never, path: string) => {
        if (path.includes("managedDevices") && !path.includes("deviceCompliancePolicyStates")) {
          return fakeDevices as unknown[];
        }
        return [];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    await provider();

    assert.ok(upsertCalls.length >= 1, "expected at least one device upsert");
    const call = upsertCalls[0]!;
    assert.equal(call.create["name"], "TestDevice");
    assert.equal(call.create["serialNumber"], "SN123");
    assert.equal(call.create["operatingSystem"], "Windows 11 23H2");
    assert.equal(call.create["complianceState"], "compliant");
    assert.equal(call.create["encryptionStatus"], "healthy");
    assert.ok(call.create["lastCheckInAt"] instanceof Date);
    assert.ok(call.create["lastSeenAt"] instanceof Date);
    assert.ok(typeof call.create["deviceAgeDays"] === "number");
  });

  it("maps isEncrypted=false to encryptionStatus=missing", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const upsertCalls: Array<{ create: Record<string, unknown> }> = [];
    const prisma = buildMockPrisma({
      deviceUpsert: async (args) => {
        upsertCalls.push(args as never);
        return { id: "dev-enc-missing" };
      },
    });

    const fakeDevices = [
      {
        id: "dev-2",
        deviceName: "EncMissing",
        isEncrypted: false,
        operatingSystem: "Windows",
        osVersion: "10",
        complianceState: "noncompliant",
        lastSyncDateTime: null,
        enrolledDateTime: null,
        serialNumber: null,
        userId: null,
      },
    ];

    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (_client: never, path: string) => {
        if (!path.includes("deviceCompliancePolicyStates")) return fakeDevices as unknown[];
        return [];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    await provider();
    const call = upsertCalls[0]!;
    assert.equal(call.create["encryptionStatus"], "missing");
  });

  it("fetches compliance policy states and upserts DeviceCompliancePolicy + DeviceComplianceAssignment", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const policyUpserts: unknown[] = [];
    const assignmentUpserts: unknown[] = [];
    const prisma = buildMockPrisma({
      deviceUpsert: async () => ({ id: "device-compliance-1" }),
      policyUpsert: async (args) => {
        policyUpserts.push(args);
        return { id: "policy-c-1" };
      },
      assignmentUpsert: async (args) => {
        assignmentUpserts.push(args);
        return { id: "assignment-c-1" };
      },
    });

    const fakeDevices = [{ id: "dev-comp-1", deviceName: "CompDevice", isEncrypted: null, operatingSystem: "iOS", osVersion: "17", complianceState: "compliant", lastSyncDateTime: null, enrolledDateTime: null, serialNumber: null, userId: null }];
    const fakePolicies = [
      { id: "policy-state-1", displayName: "Require Encryption", platformType: "windows10", state: "compliant" },
    ];

    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (_client: never, path: string) => {
        if (path.includes("deviceCompliancePolicyStates")) return fakePolicies as unknown[];
        return fakeDevices as unknown[];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    await provider();
    assert.ok(policyUpserts.length >= 1, "expected at least one policy upsert");
    assert.ok(assignmentUpserts.length >= 1, "expected at least one assignment upsert");
  });

  it("deduplicates compliance assignments by policyId before upsert", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const policyUpserts: unknown[] = [];
    const assignmentUpserts: unknown[] = [];
    const prisma = buildMockPrisma({
      deviceUpsert: async () => ({ id: "device-dedup-1" }),
      policyUpsert: async (args) => {
        policyUpserts.push(args);
        return { id: "policy-dedup-1" };
      },
      assignmentUpsert: async (args) => {
        assignmentUpserts.push(args);
        return { id: "assignment-dedup-1" };
      },
    });

    const fakeDevices = [{ id: "dev-dedup-1", deviceName: "DedupDevice", isEncrypted: null, operatingSystem: "iOS", osVersion: "17", complianceState: "compliant", lastSyncDateTime: null, enrolledDateTime: null, serialNumber: null, userId: null }];
    // Return the SAME policy id twice — should be deduped
    const fakePolicies = [
      { id: "policy-dup-1", displayName: "Require Encryption", platformType: "windows10", state: "compliant" },
      { id: "policy-dup-1", displayName: "Require Encryption", platformType: "windows10", state: "compliant" },
    ];

    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (_client: never, path: string) => {
        if (path.includes("deviceCompliancePolicyStates")) return fakePolicies as unknown[];
        return fakeDevices as unknown[];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    await provider();
    assert.equal(assignmentUpserts.length, 1, "duplicate policyId should be deduplicated");
  });

  it("deletes stale Device rows (sourceSystem=intune, sourceId NOT IN synced IDs) after successful sync", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const deleteCalls: Array<{ where: Record<string, unknown> }> = [];
    const prisma = buildMockPrisma({
      deviceDeleteMany: async (args) => {
        deleteCalls.push(args as never);
        return { count: 1 };
      },
    });

    const fakeDevices = [{ id: "intune-kept-1", deviceName: "Kept", isEncrypted: null, operatingSystem: "Windows", osVersion: "11", complianceState: "compliant", lastSyncDateTime: null, enrolledDateTime: null, serialNumber: null, userId: null }];

    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (_client: never, path: string) => {
        if (!path.includes("deviceCompliancePolicyStates")) return fakeDevices as unknown[];
        return [];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    await provider();
    assert.ok(deleteCalls.length >= 1, "expected deleteMany call for stale cleanup");
    const deleteCall = deleteCalls[0]!;
    assert.equal((deleteCall.where as Record<string, unknown>)["sourceSystem"], "intune");
    const notIn = ((deleteCall.where as Record<string, unknown>)["sourceId"] as Record<string, unknown>)["notIn"] as string[];
    assert.ok(Array.isArray(notIn));
    assert.ok(notIn.includes("intune-kept-1"));
  });

  it("does best-effort owner linking from User table", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const deviceUpsertCalls: Array<{ create: Record<string, unknown>; update: Record<string, unknown> }> = [];
    let userFindManyCalled = false;
    const prisma = buildMockPrisma({
      deviceUpsert: async (args) => {
        deviceUpsertCalls.push(args as never);
        return { id: "device-owner-1" };
      },
      userFindMany: async (_args) => {
        userFindManyCalled = true;
        return [{ id: "user-db-1", sourceId: "entra-user-1" }];
      },
    });

    const fakeDevices = [{ id: "dev-owner-1", deviceName: "OwnedDevice", isEncrypted: null, operatingSystem: "Windows", osVersion: "11", complianceState: "compliant", lastSyncDateTime: null, enrolledDateTime: null, serialNumber: null, userId: "entra-user-1" }];

    const provider = createIntuneProvider({
      prisma: prisma as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (_client: never, path: string) => {
        if (!path.includes("deviceCompliancePolicyStates")) return fakeDevices as unknown[];
        return [];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    await provider();
    assert.ok(userFindManyCalled, "expected user lookup for owner linking");
  });

  it("returns ConnectorSyncOutput with result=success on happy path", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const fakeDevices = [
      { id: "dev-success-1", deviceName: "Dev1", isEncrypted: true, operatingSystem: "Windows", osVersion: "11", complianceState: "compliant", lastSyncDateTime: null, enrolledDateTime: null, serialNumber: null, userId: null },
      { id: "dev-success-2", deviceName: "Dev2", isEncrypted: false, operatingSystem: "iOS", osVersion: "17", complianceState: "noncompliant", lastSyncDateTime: null, enrolledDateTime: null, serialNumber: null, userId: null },
    ];
    const provider = createIntuneProvider({
      prisma: buildMockPrisma() as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => ({} as never),
      graphPageAllFn: async (_client: never, path: string) => {
        if (!path.includes("deviceCompliancePolicyStates")) return fakeDevices as unknown[];
        return [];
      },
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    const output = await provider();
    assert.equal(output.result, "success");
    assert.equal(output.recordsSeen, 2);
    assert.equal(output.recordsNormalized, 2);
  });

  it("returns result=failure with lastError when Graph API throws", async () => {
    const { createIntuneProvider } = await import("../providers/intune.provider.js");
    const provider = createIntuneProvider({
      prisma: buildMockPrisma() as never,
      systemKey: Buffer.alloc(32),
      buildGraphClientFn: async () => { throw new Error("Graph API unavailable"); },
      graphPageAllFn: async () => [],
      withRetryFn: async (fn: () => Promise<unknown>) => fn(),
    });

    const output = await provider();
    assert.equal(output.result, "failure");
    assert.ok(output.lastError?.includes("Graph API unavailable"));
  });
});
