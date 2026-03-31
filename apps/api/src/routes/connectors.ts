import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { ConnectorsService, ConnectorCard } from "../modules/connectors/connectors.service.js";

export type ConnectorsRoutesDependencies = {
  connectorsService: Pick<ConnectorsService, "listConnectors">;
  runConnectorSync?: (connectorId: string) => Promise<{ connectorId: string; result: string }>;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type ConnectorsRoutesOptions = FastifyPluginOptions & ConnectorsRoutesDependencies;

export async function registerConnectorsRoutes(app: FastifyInstance, options: ConnectorsRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/connectors", routeOptions, async () => {
    const items = await options.connectorsService.listConnectors();

    return items.map(mapConnectorCardResponse);
  });

  // POST /api/connectors/intune/sync — authenticated, triggers a real Intune sync
  app.post("/api/connectors/intune/sync", routeOptions, async (_, reply) => {
    const runSync = options.runConnectorSync;
    if (!runSync) {
      reply.code(503);
      return { ok: false, error: "Sync not configured" };
    }

    try {
      const result = await runSync("intune");
      reply.code(200);
      return { ok: true, ...result };
    } catch (error) {
      reply.code(500);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  });
}

function mapConnectorCardResponse(item: ConnectorCard) {
  return {
    id: item.id,
    label: item.label,
    health: item.health,
    freshnessState: item.freshnessState,
    lastSuccessfulSyncAt: item.lastSuccessfulSyncAt,
    lastAttemptedSyncAt: item.lastAttemptedSyncAt,
    lastResult: item.lastResult,
  };
}
