import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { NetworkRepository } from "../modules/network/network.repository.js";
import {
  networkFreshnessStates,
  networkResourceKinds,
  type NetworkFindingItem,
  type NetworkInventoryFilters,
  type NetworkInventoryRow,
  type NetworkMapResponse,
  type NetworkRelatedResource,
  type NetworkResourceDetail,
} from "../modules/network/network.types.js";

export type NetworkRoutesDependencies = {
  networkRepository: Pick<NetworkRepository, "listFindings" | "listInventory" | "getMap" | "getResourceDetail">;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type NetworkRoutesOptions = FastifyPluginOptions & NetworkRoutesDependencies;

export async function registerNetworkRoutes(app: FastifyInstance, options: NetworkRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get<{ Querystring: { limit?: string } }>("/api/network/findings", routeOptions, async (request) => {
    const items = await options.networkRepository.listFindings(parseFindingsLimit(request.query.limit));
    const dataMode = items[0]?.dataMode ?? (await options.networkRepository.getMap()).dataMode;

    return {
      dataMode,
      items: items.map(mapFindingItemResponse),
    };
  });

  app.get<{
    Querystring: {
      search?: string;
      kind?: string;
      site?: string;
      operationalStatus?: string;
      freshnessState?: string;
    };
  }>("/api/network/resources", routeOptions, async (request) => {
    const items = await options.networkRepository.listInventory(parseInventoryFilters(request.query));
    const dataMode = items[0]?.dataMode ?? (await options.networkRepository.getMap()).dataMode;

    return {
      dataMode,
      items: items.map(mapInventoryRowResponse),
    };
  });

  app.get("/api/network/map", routeOptions, async () => {
    const map = await options.networkRepository.getMap();

    return mapNetworkMapResponse(map);
  });

  app.get<{ Params: { resourceId: string } }>("/api/network/resources/:resourceId", routeOptions, async (request, reply) => {
    const detail = await options.networkRepository.getResourceDetail(request.params.resourceId);

    if (!detail) {
      reply.code(404);
      return {
        message: "Network resource not found",
      };
    }

    return mapResourceDetailResponse(detail);
  });
}

function parseFindingsLimit(limit?: string): number {
  if (!limit) {
    return 25;
  }

  const parsedLimit = Number.parseInt(limit, 10);
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    return 25;
  }

  return Math.min(parsedLimit, 100);
}

function parseInventoryFilters(query: {
  search?: string;
  kind?: string;
  site?: string;
  operationalStatus?: string;
  freshnessState?: string;
}): NetworkInventoryFilters {
  const filters: NetworkInventoryFilters = {};
  const search = normalizeQueryValue(query.search);
  const kind = parseResourceKind(query.kind);
  const siteName = normalizeQueryValue(query.site);
  const operationalStatus = normalizeQueryValue(query.operationalStatus);
  const freshnessState = parseFreshnessState(query.freshnessState);

  if (search) {
    filters.search = search;
  }

  if (kind) {
    filters.kind = kind;
  }

  if (siteName) {
    filters.siteName = siteName;
  }

  if (operationalStatus) {
    filters.operationalStatus = operationalStatus;
  }

  if (freshnessState) {
    filters.freshnessState = freshnessState;
  }

  return filters;
}

function normalizeQueryValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseResourceKind(value?: string) {
  return value && networkResourceKinds.includes(value as (typeof networkResourceKinds)[number])
    ? (value as (typeof networkResourceKinds)[number])
    : undefined;
}

function parseFreshnessState(value?: string) {
  return value && networkFreshnessStates.includes(value as (typeof networkFreshnessStates)[number])
    ? (value as (typeof networkFreshnessStates)[number])
    : undefined;
}

function mapFindingItemResponse(item: NetworkFindingItem) {
  return {
    dataMode: item.dataMode,
    findingId: item.findingId,
    resourceId: item.resourceId,
    resourceName: item.resourceName,
    resourceKind: item.resourceKind,
    kind: item.kind,
    severity: item.severity,
    queueRank: item.queueRank,
    siteName: item.siteName,
    scopeLabel: item.scopeLabel,
    operationalStatus: item.operationalStatus,
    freshnessState: item.freshnessState,
    lastSeenAt: item.lastSeenAt,
    summary: item.summary,
    suggestedNextStep: item.suggestedNextStep,
  };
}

function mapInventoryRowResponse(item: NetworkInventoryRow) {
  return {
    dataMode: item.dataMode,
    resourceId: item.resourceId,
    resourceName: item.resourceName,
    resourceKind: item.resourceKind,
    siteName: item.siteName,
    operationalStatus: item.operationalStatus,
    freshnessState: item.freshnessState,
    lastSeenAt: item.lastSeenAt,
    managementIp: item.managementIp,
    cidr: item.cidr,
    ownerLabel: item.ownerLabel,
    summary: item.summary,
  };
}

function mapNetworkMapResponse(map: NetworkMapResponse) {
  return {
    dataMode: map.dataMode,
    sites: map.sites.map((site) => ({
      siteName: site.siteName,
      resourceIds: site.resourceIds,
      relationshipCount: site.relationshipCount,
      freshnessState: site.freshnessState,
    })),
    resources: map.resources.map((resource) => ({
      resourceId: resource.resourceId,
      resourceName: resource.resourceName,
      resourceKind: resource.resourceKind,
      siteName: resource.siteName,
      operationalStatus: resource.operationalStatus,
      freshnessState: resource.freshnessState,
      lastSeenAt: resource.lastSeenAt,
    })),
    relationships: map.relationships.map((relationship) => ({
      relationshipId: relationship.relationshipId,
      fromResourceId: relationship.fromResourceId,
      toResourceId: relationship.toResourceId,
      relationship: relationship.relationship,
      confidence: relationship.confidence,
      lastSeenAt: relationship.lastSeenAt,
    })),
  };
}

function mapResourceDetailResponse(detail: NetworkResourceDetail) {
  return {
    dataMode: detail.dataMode,
    resourceId: detail.resource.resourceId,
    resourceName: detail.resource.resourceName,
    resourceKind: detail.resource.resourceKind,
    siteName: detail.resource.siteName,
    operationalStatus: detail.resource.operationalStatus,
    freshnessState: detail.resource.freshnessState,
    lastSeenAt: detail.resource.lastSeenAt,
    managementIp: detail.resource.managementIp,
    cidr: detail.resource.cidr,
    ownerLabel: detail.resource.ownerLabel,
    scopeSummary: detail.scopeSummary,
    summary: detail.findings[0]?.summary ?? detail.scopeSummary,
    suggestedNextStep: detail.suggestedNextStep,
    findings: detail.findings.map(mapFindingItemResponse),
    relatedResources: detail.relatedResources.map(mapRelatedResourceResponse),
  };
}

function mapRelatedResourceResponse(resource: NetworkRelatedResource) {
  return {
    resourceId: resource.resourceId,
    resourceName: resource.resourceName,
    resourceKind: resource.resourceKind,
    siteName: resource.siteName,
    operationalStatus: resource.operationalStatus,
    freshnessState: resource.freshnessState,
    lastSeenAt: resource.lastSeenAt,
    relationship: resource.relationship,
    confidence: resource.confidence,
    direction: resource.direction,
  };
}
