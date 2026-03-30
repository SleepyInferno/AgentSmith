import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseServerEnv } from "@agentsmith/shared/env";

describe("parseServerEnv", () => {
  const baseEnv = {
    DATABASE_URL: "postgresql://localhost:5432/agentsmith",
    WEB_ORIGIN: "http://localhost:3000",
    SESSION_SECRET: "test-secret-at-least-one-char",
  };

  it("succeeds without any Entra env vars", () => {
    const result = parseServerEnv(baseEnv as unknown as NodeJS.ProcessEnv);
    assert.equal(result.DATABASE_URL, baseEnv.DATABASE_URL);
    assert.equal(result.ENTRA_TENANT_ID, undefined);
    assert.equal(result.ENTRA_CLIENT_ID, undefined);
    assert.equal(result.ENTRA_CLIENT_SECRET, undefined);
    assert.equal(result.ENTRA_REDIRECT_URI, undefined);
  });

  it("succeeds with all Entra env vars present", () => {
    const fullEnv = {
      ...baseEnv,
      ENTRA_TENANT_ID: "tenant-id",
      ENTRA_CLIENT_ID: "client-id",
      ENTRA_CLIENT_SECRET: "client-secret",
      ENTRA_REDIRECT_URI: "http://localhost:3001/auth/callback",
    };
    const result = parseServerEnv(fullEnv as unknown as NodeJS.ProcessEnv);
    assert.equal(result.ENTRA_TENANT_ID, "tenant-id");
    assert.equal(result.ENTRA_CLIENT_ID, "client-id");
    assert.equal(result.ENTRA_CLIENT_SECRET, "client-secret");
    assert.equal(result.ENTRA_REDIRECT_URI, "http://localhost:3001/auth/callback");
  });

  it("succeeds with partial Entra env vars", () => {
    const partialEnv = {
      ...baseEnv,
      ENTRA_TENANT_ID: "tenant-id",
    };
    const result = parseServerEnv(partialEnv as unknown as NodeJS.ProcessEnv);
    assert.equal(result.ENTRA_TENANT_ID, "tenant-id");
    assert.equal(result.ENTRA_CLIENT_ID, undefined);
  });
});
