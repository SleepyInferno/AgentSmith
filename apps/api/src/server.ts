import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import type { ServerEnv } from "@agentsmith/shared";
import { parseServerEnv } from "@agentsmith/shared/env";
import { PrismaClient } from "@prisma/client";
import { AssetHealthRepository } from "./modules/assets/asset-health.repository.js";
import { LifecycleRepository } from "./modules/lifecycle/lifecycle.repository.js";
import { NetworkRepository } from "./modules/network/network.repository.js";
import type { AssetRoutesDependencies } from "./routes/assets.js";
import { registerAssetRoutes } from "./routes/assets.js";
import { registerHealthRoute } from "./routes/health.js";
import type { LifecycleRoutesDependencies } from "./routes/lifecycle.js";
import { registerLifecycleRoutes } from "./routes/lifecycle.js";
import type { NetworkRoutesDependencies } from "./routes/network.js";
import { registerNetworkRoutes } from "./routes/network.js";

export type BuildServerOptions = {
  env?: ServerEnv;
  prisma?: PrismaClient;
  assetRoutes?: Partial<AssetRoutesDependencies>;
  lifecycleRoutes?: Partial<LifecycleRoutesDependencies>;
  networkRoutes?: Partial<NetworkRoutesDependencies>;
};

export function buildServer(options: BuildServerOptions = {}) {
  const env = options.env ?? parseServerEnv();
  const app = Fastify({
    logger: true,
  });
  const prisma = options.prisma ?? new PrismaClient();
  const assetHealthRepository = options.assetRoutes?.assetHealthRepository ?? new AssetHealthRepository(prisma);
  const lifecycleRepository = options.lifecycleRoutes?.lifecycleRepository ?? new LifecycleRepository(prisma);
  const networkRepository = options.networkRoutes?.networkRepository ?? new NetworkRepository(prisma);
  const assetRouteOptions = options.assetRoutes?.preHandler
    ? {
        assetHealthRepository,
        preHandler: options.assetRoutes.preHandler,
      }
    : {
        assetHealthRepository,
      };
  const lifecycleRouteOptions = options.lifecycleRoutes?.preHandler
    ? {
        lifecycleRepository,
        preHandler: options.lifecycleRoutes.preHandler,
      }
    : {
        lifecycleRepository,
      };
  const networkRouteOptions = options.networkRoutes?.preHandler
    ? {
        networkRepository,
        preHandler: options.networkRoutes.preHandler,
      }
    : {
        networkRepository,
      };

  app.register(registerHealthRoute);
  app.register(registerAssetRoutes, assetRouteOptions);
  app.register(registerLifecycleRoutes, lifecycleRouteOptions);
  app.register(registerNetworkRoutes, networkRouteOptions);

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
