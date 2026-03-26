import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import type { ServerEnv } from "@agentsmith/shared";
import { parseServerEnv } from "@agentsmith/shared/env";
import { PrismaClient } from "@prisma/client";
import { AssetHealthRepository } from "./modules/assets/asset-health.repository.js";
import type { AssetRoutesDependencies } from "./routes/assets.js";
import { registerAssetRoutes } from "./routes/assets.js";
import { registerHealthRoute } from "./routes/health.js";

export type BuildServerOptions = {
  env?: ServerEnv;
  prisma?: PrismaClient;
  assetRoutes?: Partial<AssetRoutesDependencies>;
};

export function buildServer(options: BuildServerOptions = {}) {
  const env = options.env ?? parseServerEnv();
  const app = Fastify({
    logger: true,
  });
  const prisma = options.prisma ?? new PrismaClient();
  const assetHealthRepository = options.assetRoutes?.assetHealthRepository ?? new AssetHealthRepository(prisma);
  const assetRouteOptions = options.assetRoutes?.preHandler
    ? {
        assetHealthRepository,
        preHandler: options.assetRoutes.preHandler,
      }
    : {
        assetHealthRepository,
      };

  app.register(registerHealthRoute);
  app.register(registerAssetRoutes, assetRouteOptions);

  app.get("/", async () => ({
    name: "AgentSmith API",
    webOrigin: env.WEB_ORIGIN,
    phase: "foundations",
  }));

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  return { app, env };
}

async function start() {
  const { app, env } = buildServer();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void start();
}
