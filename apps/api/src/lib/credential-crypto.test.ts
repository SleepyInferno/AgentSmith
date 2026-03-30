import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { wrapKey, unwrapKey, encryptCredential, decryptCredential } from "./credential-crypto.js";

describe("credential-crypto", () => {
  const testSecret = "test-session-secret-for-wrapping";

  describe("wrapKey / unwrapKey", () => {
    it("round-trips a 32-byte key", () => {
      const dataKey = randomBytes(32);
      const wrapped = wrapKey(testSecret, dataKey);
      const unwrapped = unwrapKey(testSecret, wrapped);
      assert.ok(unwrapped.equals(dataKey));
    });

    it("returns a colon-separated hex string with three parts", () => {
      const dataKey = randomBytes(32);
      const wrapped = wrapKey(testSecret, dataKey);
      const parts = wrapped.split(":");
      assert.equal(parts.length, 3);
      for (const part of parts) {
        assert.match(part, /^[0-9a-f]+$/);
      }
    });

    it("throws when unwrapping with the wrong secret", () => {
      const dataKey = randomBytes(32);
      const wrapped = wrapKey(testSecret, dataKey);
      assert.throws(() => unwrapKey("wrong-secret", wrapped));
    });
  });

  describe("encryptCredential / decryptCredential", () => {
    const dataKey = randomBytes(32);
    const plainJson = JSON.stringify({ tenantId: "tid", clientId: "cid", clientSecret: "cs" });

    it("round-trips a JSON credential string", () => {
      const { encryptedValue, iv, authTag } = encryptCredential(dataKey, plainJson);
      const decrypted = decryptCredential(dataKey, encryptedValue, iv, authTag);
      assert.equal(decrypted, plainJson);
    });

    it("produces hex-encoded output fields", () => {
      const result = encryptCredential(dataKey, plainJson);
      assert.match(result.encryptedValue, /^[0-9a-f]+$/);
      assert.match(result.iv, /^[0-9a-f]+$/);
      assert.match(result.authTag, /^[0-9a-f]+$/);
    });

    it("generates a unique IV on each call", () => {
      const result1 = encryptCredential(dataKey, plainJson);
      const result2 = encryptCredential(dataKey, plainJson);
      assert.notEqual(result1.iv, result2.iv);
    });

    it("throws when decrypting with wrong data key", () => {
      const { encryptedValue, iv, authTag } = encryptCredential(dataKey, plainJson);
      const wrongKey = randomBytes(32);
      assert.throws(() => decryptCredential(wrongKey, encryptedValue, iv, authTag));
    });
  });
});
