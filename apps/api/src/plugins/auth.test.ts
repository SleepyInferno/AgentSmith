import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type { PrismaClient } from "@prisma/client";
import { createAuthService } from "./auth.js";

const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  ENTRA_TENANT_ID: "tenant-id",
  ENTRA_CLIENT_ID: "client-id",
  ENTRA_CLIENT_SECRET: "client-secret",
  ENTRA_REDIRECT_URI: "http://localhost:3001/auth/callback",
  SESSION_SECRET: "test-session-secret-for-testing-only",
};

const testEnvNoEntra: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  SESSION_SECRET: "test-session-secret-for-testing-only",
};

function buildPrismaStub(): Pick<PrismaClient, "user"> {
  return {
    user: {
      findUnique: async () => null,
    },
  } as unknown as Pick<PrismaClient, "user">;
}

// Minimal Fastify-like reply stub to capture Set-Cookie header
function buildReplyStub() {
  const headers: Record<string, string | string[]> = {};
  return {
    code: (_n: number) => stub,
    header: (name: string, value: string | string[]) => {
      headers[name.toLowerCase()] = value;
      return stub;
    },
    getHeader: (name: string) => headers[name.toLowerCase()],
    send: async () => undefined,
    headers,
  } as unknown as import("fastify").FastifyReply & { headers: Record<string, string | string[]> };
  var stub: ReturnType<typeof buildReplyStub>;
}

// Build the stub properly to avoid the forward reference issue
function buildReply() {
  const headers: Record<string, string | string[]> = {};
  const stub = {
    code(_n: number) { return stub; },
    header(name: string, value: string | string[]) {
      headers[name.toLowerCase()] = value;
      return stub;
    },
    getHeader(name: string) { return headers[name.toLowerCase()]; },
    send: async () => undefined,
    get setCookieHeaders() {
      const val = headers["set-cookie"];
      if (!val) return [] as string[];
      return Array.isArray(val) ? val : [val];
    },
  } as unknown as import("fastify").FastifyReply & { setCookieHeaders: string[] };
  return stub;
}

test("createAuthService does not throw when ENTRA_TENANT_ID and ENTRA_CLIENT_ID are undefined", () => {
  assert.doesNotThrow(() => {
    createAuthService({
      env: testEnvNoEntra,
      prisma: buildPrismaStub(),
    });
  });
});

test("loginLocal sets a session cookie on the reply (Set-Cookie header contains agentsmith_session)", () => {
  const authService = createAuthService({
    env: testEnv,
    prisma: buildPrismaStub(),
  });

  assert.ok(
    "loginLocal" in authService,
    "loginLocal method should exist on AgentSmithAuthService",
  );

  const reply = buildReply();
  (authService as { loginLocal: (reply: import("fastify").FastifyReply, userId: string) => void }).loginLocal(reply, "user-123");

  const cookies = reply.setCookieHeaders;
  assert.ok(cookies.length > 0, "At least one Set-Cookie header should be set");
  assert.ok(
    cookies.some((c) => c.startsWith("agentsmith_session=")),
    `Expected a Set-Cookie header starting with 'agentsmith_session=' but got: ${JSON.stringify(cookies)}`,
  );
});

test("beginLogin returns 503 when Entra vars are absent (NoopEntraProvider)", async () => {
  const authService = createAuthService({
    env: testEnvNoEntra,
    prisma: buildPrismaStub(),
  });

  const codes: number[] = [];
  const reply = {
    code(n: number) { codes.push(n); return reply; },
    header: () => reply,
    getHeader: () => undefined,
    send: async (body?: unknown) => body,
  } as unknown as import("fastify").FastifyReply;

  await authService.beginLogin(reply);
  assert.ok(codes.includes(503), `Expected reply.code(503) but got codes: ${JSON.stringify(codes)}`);
});
