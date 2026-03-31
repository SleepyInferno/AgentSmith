import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { AgentSmithAuthService } from "../plugins/auth.js";
import type { PrismaClient } from "@prisma/client";
import { encryptCredential, decryptCredential } from "../lib/credential-crypto.js";
import { ClientSecretCredential } from "@azure/identity";
import OpenAI from "openai";

const VALID_KEYS = ["intune", "openai"] as const;
type IntegrationKey = (typeof VALID_KEYS)[number];

function isValidKey(key: string): key is IntegrationKey {
  return (VALID_KEYS as readonly string[]).includes(key);
}

export type IntuneConnectionProbe = (tenantId: string, clientId: string, clientSecret: string) => Promise<{ ok: boolean; message: string }>;
export type OpenAIConnectionProbe = (apiKey: string) => Promise<{ ok: boolean; message: string }>;

export type IntegrationRoutesDependencies = {
  prisma: Pick<PrismaClient, "integrationCredential">;
  authService: Pick<AgentSmithAuthService, "getSession">;
  systemKey: Buffer;
  testIntuneConnection?: IntuneConnectionProbe;
  testOpenAIConnection?: OpenAIConnectionProbe;
};

type IntegrationRoutesOptions = FastifyPluginOptions & IntegrationRoutesDependencies;

async function defaultTestIntuneConnection(tenantId: string, clientId: string, clientSecret: string): Promise<{ ok: boolean; message: string }> {
  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const tokenPromise = credential.getToken("https://graph.microsoft.com/.default");
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timed out after 10s")), 10_000)
    );
    await Promise.race([tokenPromise, timeoutPromise]);
    return { ok: true, message: "Connected successfully" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Connection timed out")) {
      return { ok: false, message: "Connection timed out after 10s" };
    }
    if (message.includes("AADSTS7000215") || message.toLowerCase().includes("invalid client secret")) {
      return { ok: false, message: "Auth failed: invalid client secret" };
    }
    if (message.includes("AADSTS90002") || message.toLowerCase().includes("tenant")) {
      return { ok: false, message: "Auth failed: tenant ID not found" };
    }
    return { ok: false, message: `Auth failed: ${message}` };
  }
}

async function defaultTestOpenAIConnection(apiKey: string): Promise<{ ok: boolean; message: string }> {
  try {
    const client = new OpenAI({ apiKey, timeout: 10_000 });
    await client.models.list();
    return { ok: true, message: "Connected successfully" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return { ok: true, message: "Rate limit reached -- key is valid" };
      }
      if (error.status === 401 || message.toLowerCase().includes("incorrect api key")) {
        return { ok: false, message: "Invalid API key" };
      }
    }
    return { ok: false, message: `Connection failed: ${message}` };
  }
}

export async function registerIntegrationRoutes(app: FastifyInstance, options: IntegrationRoutesOptions) {
  const testIntuneConnection = options.testIntuneConnection ?? defaultTestIntuneConnection;
  const testOpenAIConnection = options.testOpenAIConnection ?? defaultTestOpenAIConnection;

  const requireAuth: preHandlerHookHandler = async (request, reply) => {
    const session = await options.authService.getSession(request);
    if (!session) {
      reply.code(401);
      return reply.send({ message: "Authentication required" });
    }
  };

  // GET /api/integrations/:key — returns status without secrets
  app.get<{ Params: { key: string } }>(
    "/api/integrations/:key",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { key } = request.params;
      if (!isValidKey(key)) {
        reply.code(404);
        return { error: "not_found" };
      }

      const row = await options.prisma.integrationCredential.findUnique({ where: { key } });
      if (!row) {
        return {
          configured: false,
          lastTestedAt: null,
          lastTestResult: null,
        };
      }

      const plainJson = decryptCredential(options.systemKey, row.encryptedValue, row.iv, row.authTag);
      const cred = JSON.parse(plainJson) as Record<string, unknown>;

      if (key === "intune") {
        return {
          configured: Boolean(cred.clientSecret),
          tenantId: typeof cred.tenantId === "string" ? cred.tenantId : "",
          clientId: typeof cred.clientId === "string" ? cred.clientId : "",
          lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
          lastTestResult: row.lastTestResult ?? null,
        };
      }

      // openai
      return {
        configured: Boolean(cred.apiKey),
        selectedModel: typeof cred.selectedModel === "string" && cred.selectedModel ? cred.selectedModel : null,
        lastTestedAt: row.lastTestedAt?.toISOString() ?? null,
        lastTestResult: row.lastTestResult ?? null,
      };
    }
  );

  // PUT /api/integrations/:key — save/update credentials with encryption
  app.put<{ Params: { key: string } }>(
    "/api/integrations/:key",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { key } = request.params;
      if (!isValidKey(key)) {
        reply.code(404);
        return { error: "not_found" };
      }

      const body = request.body as Record<string, unknown> | null ?? {};

      // Load existing credential if present (for secret preservation on blank fields)
      const existingRow = await options.prisma.integrationCredential.findUnique({ where: { key } });
      let existingCred: Record<string, unknown> = {};
      if (existingRow) {
        const plainJson = decryptCredential(
          options.systemKey,
          existingRow.encryptedValue,
          existingRow.iv,
          existingRow.authTag
        );
        existingCred = JSON.parse(plainJson) as Record<string, unknown>;
      }

      // Merge: blank/empty secret fields retain the existing secret
      let merged: Record<string, unknown>;
      if (key === "intune") {
        merged = {
          tenantId: typeof body.tenantId === "string" ? body.tenantId : (existingCred.tenantId ?? ""),
          clientId: typeof body.clientId === "string" ? body.clientId : (existingCred.clientId ?? ""),
          clientSecret:
            typeof body.clientSecret === "string" && body.clientSecret.trim() !== ""
              ? body.clientSecret
              : (existingCred.clientSecret ?? ""),
        };
      } else {
        // openai
        merged = {
          apiKey:
            typeof body.apiKey === "string" && body.apiKey.trim() !== ""
              ? body.apiKey
              : (existingCred.apiKey ?? ""),
          selectedModel:
            typeof body.selectedModel === "string"
              ? body.selectedModel
              : (existingCred.selectedModel ?? ""),
        };
      }

      const { encryptedValue, iv, authTag } = encryptCredential(options.systemKey, JSON.stringify(merged));

      await options.prisma.integrationCredential.upsert({
        where: { key },
        create: {
          key,
          encryptedValue,
          iv,
          authTag,
        },
        update: {
          encryptedValue,
          iv,
          authTag,
          updatedAt: new Date(),
        },
      });

      reply.code(200);
      return { ok: true };
    }
  );

  // GET /api/integrations/openai/models — fetch available chat models for model selector
  app.get(
    "/api/integrations/openai/models",
    { preHandler: requireAuth },
    async (_request, reply) => {
      const row = await options.prisma.integrationCredential.findUnique({ where: { key: "openai" } });
      if (!row) {
        reply.code(400);
        return { error: "openai_not_configured" };
      }

      const plainJson = decryptCredential(options.systemKey, row.encryptedValue, row.iv, row.authTag);
      const cred = JSON.parse(plainJson) as Record<string, unknown>;
      const apiKey = typeof cred.apiKey === "string" ? cred.apiKey : "";
      if (!apiKey) {
        reply.code(400);
        return { error: "openai_not_configured" };
      }

      try {
        const client = new OpenAI({ apiKey, timeout: 10_000 });
        const modelsPage = await client.models.list();
        const models = modelsPage.data
          .map((m) => m.id)
          .filter((id) => /^(gpt-|o1|o3|o4)/.test(id))
          .sort();
        return { models };
      } catch (error) {
        reply.code(502);
        const message = error instanceof Error ? error.message : String(error);
        return { error: "models_fetch_failed", message };
      }
    }
  );

  // POST /api/integrations/:key/test — test connection and persist result
  app.post<{ Params: { key: string } }>(
    "/api/integrations/:key/test",
    { preHandler: requireAuth },
    async (request, reply) => {
      const { key } = request.params;
      if (!isValidKey(key)) {
        reply.code(404);
        return { error: "not_found" };
      }

      const row = await options.prisma.integrationCredential.findUnique({ where: { key } });
      if (!row) {
        reply.code(400);
        return { ok: false, message: "No credentials configured" };
      }

      const plainJson = decryptCredential(options.systemKey, row.encryptedValue, row.iv, row.authTag);
      const cred = JSON.parse(plainJson) as Record<string, unknown>;

      let result: { ok: boolean; message: string };
      if (key === "intune") {
        result = await testIntuneConnection(
          typeof cred.tenantId === "string" ? cred.tenantId : "",
          typeof cred.clientId === "string" ? cred.clientId : "",
          typeof cred.clientSecret === "string" ? cred.clientSecret : ""
        );
      } else {
        result = await testOpenAIConnection(typeof cred.apiKey === "string" ? cred.apiKey : "");
      }

      await options.prisma.integrationCredential.update({
        where: { key },
        data: {
          lastTestedAt: new Date(),
          lastTestResult: result.ok ? "pass" : result.message,
        },
      });

      return result;
    }
  );
}
