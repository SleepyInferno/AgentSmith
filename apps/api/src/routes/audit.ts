import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";

export type AuditEventListItem = {
  timestamp: string;
  action: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  result: string;
  metadata: unknown;
};

export type AuditRoutesDependencies = {
  auditReader: {
    listRecent: (limit: number) => Promise<AuditEventListItem[]>;
  };
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type AuditRoutesOptions = FastifyPluginOptions & AuditRoutesDependencies;

export async function registerAuditRoutes(app: FastifyInstance, options: AuditRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get<{ Querystring: { limit?: string } }>("/api/audit-events", routeOptions, async (request) => {
    const limit = parseLimit(request.query.limit);
    const items = await options.auditReader.listRecent(limit);

    return items.map((item) => ({
      timestamp: item.timestamp,
      action: item.action,
      actorId: item.actorId,
      targetType: item.targetType,
      targetId: item.targetId,
      result: item.result,
      metadata: item.metadata,
    }));
  });
}

function parseLimit(limit?: string) {
  if (!limit) {
    return 50;
  }

  const parsedLimit = Number.parseInt(limit, 10);
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return 50;
  }

  return Math.min(parsedLimit, 200);
}
