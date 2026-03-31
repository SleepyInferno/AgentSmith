import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { AssetHealthRepository } from "../modules/assets/asset-health.repository.js";
import {
  assetInventorySortFields,
  assetRiskSignalCodes,
  type AssetDetail,
  type AssetInventoryFilters,
  type AssetInventoryRow,
  type AssetQueueItem,
} from "../modules/assets/asset-health.types.js";

export type AssetRoutesDependencies = {
  assetHealthRepository: Pick<AssetHealthRepository, "listQueue" | "listInventory" | "getDeviceDetail">;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type AssetRoutesOptions = FastifyPluginOptions & AssetRoutesDependencies;

export async function registerAssetRoutes(app: FastifyInstance, options: AssetRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get<{ Querystring: { limit?: string } }>("/api/assets/queue", routeOptions, async (request) => {
    const limit = parseQueueLimit(request.query.limit);
    const items = await options.assetHealthRepository.listQueue(limit);

    return {
      items: items.map(mapQueueItemResponse),
    };
  });

  app.get<{
    Querystring: {
      search?: string;
      ownerId?: string;
      department?: string;
      site?: string;
      riskLevel?: string;
      riskSignal?: string;
      encryptionStatus?: string;
      antivirusStatus?: string;
      patchStatus?: string;
      staleOnly?: string;
      sortField?: string;
      sortDirection?: string;
    };
  }>("/api/assets/devices", routeOptions, async (request) => {
    const items = await options.assetHealthRepository.listInventory(parseInventoryFilters(request.query));

    return {
      items: items.map(mapInventoryRowResponse),
    };
  });

  app.get<{ Params: { deviceId: string } }>("/api/assets/devices/:deviceId", routeOptions, async (request, reply) => {
    const detail = await options.assetHealthRepository.getDeviceDetail(request.params.deviceId);

    if (!detail) {
      reply.code(404);
      return {
        message: "Device not found",
      };
    }

    return mapAssetDetailResponse(detail);
  });
}

function parseQueueLimit(limit?: string): number {
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
  ownerId?: string;
  department?: string;
  site?: string;
  riskLevel?: string;
  riskSignal?: string;
  encryptionStatus?: string;
  antivirusStatus?: string;
  patchStatus?: string;
  staleOnly?: string;
  sortField?: string;
  sortDirection?: string;
}): AssetInventoryFilters {
  const filters: AssetInventoryFilters = {};
  const search = normalizeQueryValue(query.search);
  const ownerId = normalizeQueryValue(query.ownerId);
  const department = normalizeQueryValue(query.department);
  const site = normalizeQueryValue(query.site);
  const riskLevel = normalizeQueryValue(query.riskLevel);
  const riskSignal = parseRiskSignal(query.riskSignal);
  const encryptionStatus = normalizeQueryValue(query.encryptionStatus);
  const antivirusStatus = normalizeQueryValue(query.antivirusStatus);
  const patchStatus = normalizeQueryValue(query.patchStatus);
  const sortField = parseSortField(query.sortField);
  const sortDirection = query.sortDirection === "asc" || query.sortDirection === "desc" ? query.sortDirection : undefined;

  if (search) {
    filters.search = search;
  }

  if (ownerId) {
    filters.ownerId = ownerId;
  }

  if (department) {
    filters.department = department;
  }

  if (site) {
    filters.site = site;
  }

  if (riskLevel) {
    filters.riskLevel = riskLevel;
  }

  if (riskSignal) {
    filters.riskSignal = riskSignal;
  }

  if (encryptionStatus) {
    filters.encryptionStatus = encryptionStatus;
  }

  if (antivirusStatus) {
    filters.antivirusStatus = antivirusStatus;
  }

  if (patchStatus) {
    filters.patchStatus = patchStatus;
  }

  if (query.staleOnly === "true") {
    filters.staleOnly = true;
  }

  if (sortField) {
    filters.sortField = sortField;
  }

  if (sortDirection) {
    filters.sortDirection = sortDirection;
  }

  return filters;
}

function normalizeQueryValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseRiskSignal(value?: string) {
  return value && assetRiskSignalCodes.includes(value as (typeof assetRiskSignalCodes)[number])
    ? (value as (typeof assetRiskSignalCodes)[number])
    : undefined;
}

function parseSortField(value?: string) {
  return value && assetInventorySortFields.includes(value as (typeof assetInventorySortFields)[number])
    ? (value as (typeof assetInventorySortFields)[number])
    : undefined;
}

function mapQueueItemResponse(item: AssetQueueItem) {
  return {
    deviceId: item.id,
    deviceName: item.name,
    riskScore: item.riskScore,
    riskLevel: item.riskLevel,
    queueRank: item.queueRank,
    summary: item.summary,
    signals: item.signals,
    sourceFreshnessState: item.freshnessState,
  };
}

function mapInventoryRowResponse(item: AssetInventoryRow) {
  return {
    deviceId: item.id,
    deviceName: item.name,
    ownerDisplayName: item.ownerName,
    department: item.department,
    site: item.site,
    operatingSystem: item.operatingSystem,
    encryptionStatus: item.encryptionStatus,
    antivirusStatus: item.antivirusStatus,
    patchStatus: item.patchStatus,
    lastCheckInAt: item.lastCheckInAt,
    riskScore: item.riskScore,
    riskLevel: item.riskLevel,
    summary: item.summary,
    signals: item.signals,
    sourceFreshnessState: item.freshnessState,
    complianceState: item.complianceState,
  };
}

function mapAssetDetailResponse(detail: AssetDetail) {
  return {
    ...mapInventoryRowResponse(detail),
    ownerEmail: detail.ownerEmail,
    diskFreePercent: detail.diskFreePercent,
    deviceAgeDays: detail.deviceAgeDays,
    supportStatus: detail.supportStatus,
    serialNumber: detail.serialNumber,
    complianceState: detail.complianceState,
    sourceSystem: detail.sourceSystem,
    sourceId: detail.sourceId,
    calculatedAt: detail.calculatedAt,
    queueRank: detail.queueRank,
    complianceAssignments: detail.complianceAssignments,
  };
}
