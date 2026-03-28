import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { ConnectorsService, ConnectorCard } from "../modules/connectors/connectors.service.js";

export type ConnectorsRoutesDependencies = {
  connectorsService: Pick<ConnectorsService, "listConnectors">;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type ConnectorsRoutesOptions = FastifyPluginOptions & ConnectorsRoutesDependencies;

export async function registerConnectorsRoutes(app: FastifyInstance, options: ConnectorsRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/connectors", routeOptions, async () => {
    const items = await options.connectorsService.listConnectors();

    return items.map(mapConnectorCardResponse);
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
