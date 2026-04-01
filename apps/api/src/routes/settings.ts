import { resolve } from "node:path";
import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { AgentSmithAuthService } from "../plugins/auth.js";
import type { PrismaClient } from "@prisma/client";

export type SettingsRoutesDependencies = {
  prisma: Pick<PrismaClient, "appSetting">;
  authService: Pick<AgentSmithAuthService, "getSession">;
  onSourceFolderChanged?: (newPath: string) => Promise<void>;
};

type SettingsRoutesOptions = FastifyPluginOptions & SettingsRoutesDependencies;

type SettingEntry = { key: string; value: string };

export async function registerSettingsRoutes(app: FastifyInstance, options: SettingsRoutesOptions) {
  const requireAuth: preHandlerHookHandler = async (request, reply) => {
    const session = await options.authService.getSession(request);
    if (!session) {
      reply.code(401);
      return reply.send({ message: "Authentication required" });
    }
  };

  // GET /api/settings — returns all settings as a key-value map
  app.get(
    "/api/settings",
    { preHandler: requireAuth },
    async (_request, _reply) => {
      const rows = await options.prisma.appSetting.findMany();
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    }
  );

  // PUT /api/settings — upserts one or more settings, validates folder paths
  app.put(
    "/api/settings",
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = request.body as { settings?: SettingEntry[] } | null ?? {};
      const settings: SettingEntry[] = Array.isArray(body?.settings) ? body.settings : [];

      // Extract folder paths from the incoming batch
      const batchMap = new Map<string, string>(settings.map((s) => [s.key, s.value]));
      let incomingSourceFolder = batchMap.get("ingest.sourceFolder");
      let incomingOutputFolder = batchMap.get("ingest.outputFolder");

      // Resolve paths to handle trailing slashes and relative paths
      if (incomingSourceFolder) {
        incomingSourceFolder = resolve(incomingSourceFolder);
      }
      if (incomingOutputFolder) {
        incomingOutputFolder = resolve(incomingOutputFolder);
      }

      // If only one folder is in the batch, look up the other from the DB
      if (incomingSourceFolder && !incomingOutputFolder) {
        const existing = await options.prisma.appSetting.findUnique({
          where: { key: "ingest.outputFolder" },
        });
        if (existing) {
          incomingOutputFolder = resolve(existing.value);
        }
      } else if (incomingOutputFolder && !incomingSourceFolder) {
        const existing = await options.prisma.appSetting.findUnique({
          where: { key: "ingest.sourceFolder" },
        });
        if (existing) {
          incomingSourceFolder = resolve(existing.value);
        }
      }

      // Validate: source and output folders must not be the same
      if (
        incomingSourceFolder &&
        incomingOutputFolder &&
        incomingSourceFolder === incomingOutputFolder
      ) {
        reply.code(400);
        return {
          error: "Source and output folders must not be the same path",
        };
      }

      // Upsert each setting
      let sourceFolderChanged = false;
      let newSourceFolderValue: string | undefined;

      for (const entry of settings) {
        const resolvedValue =
          entry.key === "ingest.sourceFolder" || entry.key === "ingest.outputFolder"
            ? resolve(entry.value)
            : entry.value;

        if (entry.key === "ingest.sourceFolder") {
          // Check if value actually changed
          const existing = await options.prisma.appSetting.findUnique({
            where: { key: "ingest.sourceFolder" },
          });
          if (!existing || resolve(existing.value) !== resolvedValue) {
            sourceFolderChanged = true;
            newSourceFolderValue = resolvedValue;
          }
        }

        await options.prisma.appSetting.upsert({
          where: { key: entry.key },
          create: { key: entry.key, value: resolvedValue },
          update: { value: resolvedValue },
        });
      }

      // Notify watcher if source folder changed
      if (sourceFolderChanged && newSourceFolderValue && options.onSourceFolderChanged) {
        await options.onSourceFolderChanged(newSourceFolderValue);
      }

      return { ok: true };
    }
  );
}
