import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { BackupRepository } from "../modules/backup/backup.repository.js";
import {
  backupConfidenceStates,
  backupCoverageStates,
  type BackupFindingItem,
  type BackupInventoryFilters,
  type BackupInventoryRow,
  type BackupOverview,
  type BackupSourceHealth,
  type BackupSystemDetail,
} from "../modules/backup/backup.types.js";

export type BackupRoutesDependencies = {
  backupRepository: Pick<BackupRepository, "getOverview" | "listFindings" | "listInventory" | "getSystemDetail">;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type BackupRoutesOptions = FastifyPluginOptions & BackupRoutesDependencies;

export async function registerBackupRoutes(app: FastifyInstance, options: BackupRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/backup/overview", routeOptions, async () => {
    const overview = await options.backupRepository.getOverview();

    return mapOverviewResponse(overview);
  });

  app.get<{ Querystring: { limit?: string } }>("/api/backup/findings", routeOptions, async (request) => {
    const limit = parseFindingsLimit(request.query.limit);
    const [items, overview] = await Promise.all([
      options.backupRepository.listFindings(limit),
      options.backupRepository.getOverview(),
    ]);
    const sourceHealthByProviderKey = new Map(overview.sourceHealth.map((item) => [item.providerKey, item]));

    return {
      dataMode: items[0]?.dataMode ?? overview.dataMode,
      isReadOnly: true,
      items: items.map((item) => mapFindingItemResponse(item, sourceHealthByProviderKey.get(item.providerKey ?? ""))),
    };
  });

  app.get<{
    Querystring: {
      search?: string;
      confidenceState?: string;
      coverageState?: string;
      providerKey?: string;
      siteName?: string;
      category?: string;
      staleOnly?: string;
    };
  }>("/api/backup/systems", routeOptions, async (request) => {
    const filters = parseInventoryFilters(request.query);
    const [items, overview] = await Promise.all([
      options.backupRepository.listInventory(filters),
      options.backupRepository.getOverview(),
    ]);
    const sourceHealthByProviderKey = new Map(overview.sourceHealth.map((item) => [item.providerKey, item]));

    return {
      dataMode: items[0]?.dataMode ?? overview.dataMode,
      isReadOnly: true,
      items: items.map((item) => mapInventoryRowResponse(item, sourceHealthByProviderKey.get(item.providerKey ?? ""))),
    };
  });

  app.get<{ Params: { systemId: string } }>("/api/backup/systems/:systemId", routeOptions, async (request, reply) => {
    const detail = await options.backupRepository.getSystemDetail(request.params.systemId);

    if (!detail) {
      reply.code(404);
      return {
        message: "Backup system not found",
      };
    }

    return mapBackupDetailResponse(detail);
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
  confidenceState?: string;
  coverageState?: string;
  providerKey?: string;
  siteName?: string;
  category?: string;
  staleOnly?: string;
}): BackupInventoryFilters {
  const filters: BackupInventoryFilters = {};
  const search = normalizeQueryValue(query.search);
  const confidenceState = parseConfidenceState(query.confidenceState);
  const coverageState = parseCoverageState(query.coverageState);
  const providerKey = normalizeQueryValue(query.providerKey);
  const siteName = normalizeQueryValue(query.siteName);
  const category = normalizeQueryValue(query.category);

  if (search) {
    filters.search = search;
  }

  if (confidenceState) {
    filters.confidenceState = confidenceState;
  }

  if (coverageState) {
    filters.coverageState = coverageState;
  }

  if (providerKey) {
    filters.providerKey = providerKey;
  }

  if (siteName) {
    filters.siteName = siteName;
  }

  if (category) {
    filters.category = category;
  }

  if (query.staleOnly === "true") {
    filters.staleOnly = true;
  }

  return filters;
}

function normalizeQueryValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseConfidenceState(value?: string) {
  return value && backupConfidenceStates.includes(value as (typeof backupConfidenceStates)[number])
    ? (value as (typeof backupConfidenceStates)[number])
    : undefined;
}

function parseCoverageState(value?: string) {
  return value && backupCoverageStates.includes(value as (typeof backupCoverageStates)[number])
    ? (value as (typeof backupCoverageStates)[number])
    : undefined;
}

function mapOverviewResponse(overview: BackupOverview) {
  const sourceHealthByProviderKey = new Map(overview.sourceHealth.map((item) => [item.providerKey, item]));

  return {
    dataMode: overview.dataMode,
    generatedAt: overview.generatedAt,
    summary: overview.summary,
    cards: overview.cards,
    findings: overview.findings.map((item) => mapFindingItemResponse(item, sourceHealthByProviderKey.get(item.providerKey ?? ""))),
    sourceHealth: overview.sourceHealth.map(mapSourceHealthResponse),
    isReadOnly: true,
  };
}

function mapFindingItemResponse(item: BackupFindingItem, sourceHealth?: BackupSourceHealth) {
  return {
    dataMode: item.dataMode,
    findingId: item.findingId,
    systemId: item.systemId,
    systemName: item.systemName,
    category: item.category,
    siteName: item.siteName,
    providerKey: item.providerKey,
    coverageState: item.coverageState,
    confidenceState: item.confidenceState,
    matchingConfidence: item.matchingConfidence,
    lastSuccessfulBackupAt: item.lastSuccessfulBackupAt,
    lastRestoreTestAt: item.lastRestoreTestedAt,
    evidenceSource: item.evidenceSource,
    summary: item.summary,
    suggestedNextStep: item.suggestedNextStep,
    sourceHealth: sourceHealth ? mapSourceHealthResponse(sourceHealth) : null,
    isReadOnly: true,
    queueRank: item.queueRank,
    workloadKind: item.workloadKind,
  };
}

function mapInventoryRowResponse(item: BackupInventoryRow, sourceHealth?: BackupSourceHealth) {
  return {
    dataMode: item.dataMode,
    systemId: item.systemId,
    systemName: item.systemName,
    category: item.category,
    siteName: item.siteName,
    providerKey: item.providerKey,
    coverageState: item.coverageState,
    confidenceState: item.confidenceState,
    matchingConfidence: item.matchingConfidence,
    lastSuccessfulBackupAt: item.lastSuccessfulBackupAt,
    lastRestoreTestAt: item.lastRestoreTestedAt,
    evidenceSource: item.evidenceSource,
    summary: item.summary,
    suggestedNextStep: item.suggestedNextStep,
    sourceHealth: sourceHealth ? mapSourceHealthResponse(sourceHealth) : null,
    isReadOnly: true,
    workloadKind: item.workloadKind,
    backupFreshnessState: item.backupFreshnessState,
    restoreFreshnessState: item.restoreFreshnessState,
  };
}

function mapBackupDetailResponse(detail: BackupSystemDetail) {
  return {
    dataMode: detail.dataMode,
    systemId: detail.system.systemId,
    systemName: detail.system.systemName,
    category: detail.system.category,
    siteName: detail.system.siteName,
    providerKey: detail.system.providerKey,
    coverageState: detail.system.coverageState,
    confidenceState: detail.system.confidenceState,
    matchingConfidence: detail.system.matchingConfidence,
    lastSuccessfulBackupAt: detail.system.lastSuccessfulBackupAt,
    lastRestoreTestAt: detail.system.lastRestoreTestedAt,
    evidenceSource: detail.system.evidenceSource,
    summary: detail.system.summary,
    suggestedNextStep: detail.suggestedNextStep,
    sourceHealth: detail.sourceHealth.map(mapSourceHealthResponse),
    isReadOnly: true,
    scopeSummary: detail.scopeSummary,
    providerEvidence: detail.providerEvidence,
    restoreProofs: detail.restoreProofs,
  };
}

function mapSourceHealthResponse(sourceHealth: BackupSourceHealth) {
  return {
    providerKey: sourceHealth.providerKey,
    providerLabel: sourceHealth.providerLabel,
    state: sourceHealth.state,
    connectorFreshnessState: sourceHealth.connectorFreshnessState,
    lastObservedAt: sourceHealth.lastObservedAt,
    systemsObserved: sourceHealth.systemsObserved,
    workloadsObserved: sourceHealth.workloadsObserved,
    summary: sourceHealth.summary,
    dataMode: sourceHealth.dataMode,
  };
}
