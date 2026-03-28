import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import type { ServerEnv } from "@agentsmith/shared";
import { parseServerEnv } from "@agentsmith/shared/env";
import { PrismaClient } from "@prisma/client";
import { AssetHealthRepository } from "./modules/assets/asset-health.repository.js";
import { BackupRepository } from "./modules/backup/backup.repository.js";
import { DocsRepository } from "./modules/docs/docs.repository.js";
import { LifecycleRepository } from "./modules/lifecycle/lifecycle.repository.js";
import { NetworkRepository } from "./modules/network/network.repository.js";
import { AuditService } from "./modules/audit/audit.service.js";
import { createAuthService, type AgentSmithAuthService } from "./plugins/auth.js";
import type { AssetRoutesDependencies } from "./routes/assets.js";
import { registerAssetRoutes } from "./routes/assets.js";
import { registerAuthRoutes } from "./routes/auth.js";
import type { BackupRoutesDependencies } from "./routes/backup.js";
import { registerBackupRoutes } from "./routes/backup.js";
import type { DocsRoutesDependencies } from "./routes/docs.js";
import { registerDocsRoutes } from "./routes/docs.js";
import { registerHealthRoute } from "./routes/health.js";
import type { LifecycleRoutesDependencies } from "./routes/lifecycle.js";
import { registerLifecycleRoutes } from "./routes/lifecycle.js";
import { registerMeRoutes } from "./routes/me.js";
import type { NetworkRoutesDependencies } from "./routes/network.js";
import { registerNetworkRoutes } from "./routes/network.js";

export type BuildServerOptions = {
  env?: ServerEnv;
  prisma?: PrismaClient;
  authService?: AgentSmithAuthService;
  auditService?: Pick<AuditService, "write">;
  assetRoutes?: Partial<AssetRoutesDependencies>;
  backupRoutes?: Partial<BackupRoutesDependencies>;
  docsRoutes?: Partial<DocsRoutesDependencies>;
  lifecycleRoutes?: Partial<LifecycleRoutesDependencies>;
  networkRoutes?: Partial<NetworkRoutesDependencies>;
};

export function buildServer(options: BuildServerOptions = {}) {
  const env = options.env ?? parseServerEnv();
  const app = Fastify({
    logger: true,
  });
  const prisma = options.prisma ?? new PrismaClient();
  const auditService = options.auditService ?? new AuditService(prisma);
  const authService = options.authService ?? createAuthService({ env, prisma });
  const assetHealthRepository = options.assetRoutes?.assetHealthRepository ?? new AssetHealthRepository(prisma);
  const backupRepository = options.backupRoutes?.backupRepository ?? new BackupRepository(prisma);
  const docsRepository = options.docsRoutes?.docsRepository ?? new DocsRepository(prisma);
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
  const backupRouteOptions = options.backupRoutes?.preHandler
    ? {
        backupRepository,
        preHandler: options.backupRoutes.preHandler,
      }
    : {
        backupRepository,
      };
  const docsRouteOptions = options.docsRoutes?.preHandler
    ? {
        docsRepository,
        preHandler: options.docsRoutes.preHandler,
      }
    : {
        docsRepository,
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
  app.register(registerAuthRoutes, {
    authService,
    auditService,
    webOrigin: env.WEB_ORIGIN,
  });
  app.register(registerMeRoutes, {
    authService,
  });
  app.register(registerAssetRoutes, assetRouteOptions);
  app.register(registerBackupRoutes, backupRouteOptions);
  app.register(registerDocsRoutes, docsRouteOptions);
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
