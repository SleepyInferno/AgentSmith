import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { AssetHealthRepository } from "../modules/assets/asset-health.repository.js";
import type { AssetDetail, AssetInventoryRow, AssetQueueItem } from "../modules/assets/asset-health.types.js";

export type AssetRoutesDependencies = {
  assetHealthRepository: Pick<AssetHealthRepository, "listQueue" | "listInventory" | "getDeviceDetail">;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type AssetRoutesOptions = FastifyPluginOptions & AssetRoutesDependencies;

export async function registerAssetRoutes(app: FastifyInstance, options: AssetRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/assets/queue", routeOptions, async () => {
    const items = await options.assetHealthRepository.listQueue(25);

    return {
      items: items.map(mapQueueItemResponse),
    };
  });

  app.get("/api/assets/devices", routeOptions, async () => {
    const items = await options.assetHealthRepository.listInventory();

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
  };
}
