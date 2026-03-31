import { pathToFileURL } from "node:url";
import Fastify, { type preHandlerHookHandler } from "fastify";
import type { ServerEnv } from "@agentsmith/shared";
import { parseServerEnv } from "@agentsmith/shared/env";
import { PrismaClient } from "@prisma/client";
import { AssetHealthRepository } from "./modules/assets/asset-health.repository.js";
import { BackupRepository } from "./modules/backup/backup.repository.js";
import { ConnectorsService } from "./modules/connectors/connectors.service.js";
import { DocsRepository } from "./modules/docs/docs.repository.js";
import { LifecycleRepository } from "./modules/lifecycle/lifecycle.repository.js";
import { NetworkRepository } from "./modules/network/network.repository.js";
import { AuditService } from "./modules/audit/audit.service.js";
import { createAuthService, type AgentSmithAuthService } from "./plugins/auth.js";
import type { AssetRoutesDependencies } from "./routes/assets.js";
import { registerAssetRoutes } from "./routes/assets.js";
import type { AuditRoutesDependencies } from "./routes/audit.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerAuthRoutes } from "./routes/auth.js";
import type { BackupRoutesDependencies } from "./routes/backup.js";
import { registerBackupRoutes } from "./routes/backup.js";
import type { ConnectorsRoutesDependencies } from "./routes/connectors.js";
import { registerConnectorsRoutes } from "./routes/connectors.js";
import type { DocsRoutesDependencies } from "./routes/docs.js";
import { registerDocsRoutes } from "./routes/docs.js";
import { registerHealthRoute } from "./routes/health.js";
import type { LifecycleRoutesDependencies } from "./routes/lifecycle.js";
import { registerLifecycleRoutes } from "./routes/lifecycle.js";
import { registerBootstrapRoutes } from "./routes/bootstrap.js";
import { registerMeRoutes } from "./routes/me.js";
import type { NetworkRoutesDependencies } from "./routes/network.js";
import { registerNetworkRoutes } from "./routes/network.js";

export type BuildServerOptions = {
  env?: ServerEnv;
  prisma?: PrismaClient;
  authService?: AgentSmithAuthService;
  auditService?: Pick<AuditService, "write">;
  assetRoutes?: Partial<AssetRoutesDependencies>;
  auditRoutes?: Partial<AuditRoutesDependencies>;
  backupRoutes?: Partial<BackupRoutesDependencies>;
  connectorsRoutes?: Partial<ConnectorsRoutesDependencies>;
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
  const connectorsService = options.connectorsRoutes?.connectorsService ?? new ConnectorsService(prisma);
  const docsRepository = options.docsRoutes?.docsRepository ?? new DocsRepository(prisma);
  const lifecycleRepository = options.lifecycleRoutes?.lifecycleRepository ?? new LifecycleRepository(prisma);
  const networkRepository = options.networkRoutes?.networkRepository ?? new NetworkRepository(prisma);
  const requireAuthenticatedSession: preHandlerHookHandler = async (request, reply) => {
    const session = await authService.getSession(request);

    if (!session) {
      reply.code(401);
      return reply.send({
        message: "Authentication required",
      });
    }
  };
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
  const connectorsRouteOptions = {
    connectorsService,
    preHandler: options.connectorsRoutes?.preHandler ?? requireAuthenticatedSession,
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
  const auditRouteOptions = {
    auditReader:
      options.auditRoutes?.auditReader ??
      ({
        async listRecent(limit: number) {
          const events = await prisma.auditEvent.findMany({
            orderBy: {
              timestamp: "desc",
            },
            take: limit,
          });

          if (events.length === 0) {
            const now = new Date();

            return [
              {
                timestamp: new Date(now.valueOf() - 20 * 60 * 1000).toISOString(),
                action: "auth.login",
                actorId: "operator-seeded",
                targetType: "session",
                targetId: "seeded-session-1",
                result: "success",
                metadata: {
                  provider: "microsoft-entra-id",
                  dataMode: "seeded_example",
                },
              },
              {
                timestamp: new Date(now.valueOf() - 6 * 60 * 1000).toISOString(),
                action: "connector.sync_succeeded",
                actorId: null,
                targetType: "connector",
                targetId: "entra",
                result: "success",
                metadata: {
                  recordsSeen: 42,
                  recordsNormalized: 42,
                  dataMode: "seeded_example",
                },
              },
            ];
          }

          return events.map((event) => ({
            timestamp: event.timestamp.toISOString(),
            action: event.action,
            actorId: event.actorId,
            targetType: event.targetType,
            targetId: event.targetId,
            result: event.result,
            metadata: event.metadata,
          }));
        },
      } satisfies AuditRoutesDependencies["auditReader"]),
    preHandler: options.auditRoutes?.preHandler ?? requireAuthenticatedSession,
  };

  app.register(registerHealthRoute);
  app.register(registerAuthRoutes, {
    authService,
    auditService,
    webOrigin: env.WEB_ORIGIN,
  });
  app.register(registerBootstrapRoutes, {
    authService,
    auditService,
    prisma,
  });
  app.register(registerMeRoutes, {
    authService,
  });
  app.register(registerAssetRoutes, assetRouteOptions);
  app.register(registerConnectorsRoutes, connectorsRouteOptions);
  app.register(registerAuditRoutes, auditRouteOptions);
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
