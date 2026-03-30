import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { wrapKey } from "./credential-crypto.js";
import { ensureSystemKey } from "./system-key.js";

describe("ensureSystemKey", () => {
  const testSecret = "test-session-secret-for-wrapping";

  it("creates a new SystemKey row when none exists and returns a 32-byte key", async () => {
    let createdData: { purpose: string; wrappedKey: string } | null = null;

    const mockPrisma = {
      systemKey: {
        findUnique: mock.fn(async () => null),
        create: mock.fn(async (args: { data: { purpose: string; wrappedKey: string } }) => {
          createdData = args.data;
          return { id: "test-id", ...args.data, createdAt: new Date() };
        }),
      },
    };

    const dataKey = await ensureSystemKey(mockPrisma as any, testSecret);

    assert.equal(dataKey.length, 32, "Data key must be 32 bytes");
    assert.equal(mockPrisma.systemKey.findUnique.mock.callCount(), 1);
    assert.equal(mockPrisma.systemKey.create.mock.callCount(), 1);
    assert.ok(createdData);
    assert.equal(createdData!.purpose, "credential_encryption");
    assert.ok(createdData!.wrappedKey.includes(":"), "wrappedKey should be iv:authTag:ciphertext format");
  });

  it("returns the unwrapped key from an existing SystemKey row", async () => {
    const originalKey = randomBytes(32);
    const wrappedKey = wrapKey(testSecret, originalKey);

    const mockPrisma = {
      systemKey: {
        findUnique: mock.fn(async () => ({
          id: "existing-id",
          purpose: "credential_encryption",
          wrappedKey,
          createdAt: new Date(),
        })),
        create: mock.fn(async () => {
          throw new Error("create should not be called");
        }),
      },
    };

    const dataKey = await ensureSystemKey(mockPrisma as any, testSecret);

    assert.equal(dataKey.length, 32, "Data key must be 32 bytes");
    assert.ok(dataKey.equals(originalKey), "Unwrapped key must equal original key");
    assert.equal(mockPrisma.systemKey.findUnique.mock.callCount(), 1);
    assert.equal(mockPrisma.systemKey.create.mock.callCount(), 0);
  });
});
