import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { DocsRepository } from "../modules/docs/docs.repository.js";
import {
  documentKinds,
  documentReviewStates,
  type DocumentationDetail,
  type DocumentationOverview,
  type DocumentationQueueItem,
  type DocumentationSearchFilters,
  type DocumentationSearchResponse,
} from "../modules/docs/docs.types.js";

export type DocsRoutesDependencies = {
  docsRepository: Pick<DocsRepository, "getOverview" | "searchDocuments" | "getDocumentDetail" | "submitMetadataReview">;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type DocsRoutesOptions = FastifyPluginOptions & DocsRoutesDependencies;

type MetadataReviewBody = {
  categoryLabels?: unknown;
  siteLabels?: unknown;
  ownerLabels?: unknown;
  systemIds?: unknown;
  reviewDueAt?: unknown;
  reviewSummary?: unknown;
  actorLabel?: unknown;
};

export async function registerDocsRoutes(app: FastifyInstance, options: DocsRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/docs/overview", routeOptions, async () => {
    const overview = await options.docsRepository.getOverview();

    return mapOverviewResponse(overview);
  });

  app.get<{
    Querystring: {
      q?: string;
      kind?: string;
      category?: string;
      site?: string;
      owner?: string;
      systemId?: string;
      reviewState?: string;
      staleOnly?: string;
    };
  }>("/api/docs/search", routeOptions, async (request) => {
    const response = await options.docsRepository.searchDocuments(parseSearchFilters(request.query));

    return mapSearchResponse(response);
  });

  app.get<{ Params: { documentId: string } }>("/api/docs/:documentId", routeOptions, async (request, reply) => {
    const detail = await options.docsRepository.getDocumentDetail(request.params.documentId);

    if (!detail) {
      reply.code(404);
      return {
        message: "Documentation record not found",
      };
    }

    return mapDetailResponse(detail);
  });

  app.post<{ Params: { documentId: string }; Body: MetadataReviewBody }>(
    "/api/docs/:documentId/metadata-review",
    routeOptions,
    async (request, reply) => {
      const parsedBody = parseMetadataReviewBody(request.body);

      if (!parsedBody.ok) {
        reply.code(400);
        return {
          message: parsedBody.message,
        };
      }

      const result = await options.docsRepository.submitMetadataReview(request.params.documentId, parsedBody.value);

      if (!result) {
        reply.code(404);
        return {
          message: "Documentation record not found",
        };
      }

      return {
        documentId: result.documentId,
        changedFields: result.changedFields,
        historyEntryId: result.historyEntryId,
        auditAction: result.auditAction,
        reviewDueAt: result.reviewDueAt,
        lastReviewedAt: result.lastReviewedAt,
      };
    },
  );
}

function parseSearchFilters(query: {
  q?: string;
  kind?: string;
  category?: string;
  site?: string;
  owner?: string;
  systemId?: string;
  reviewState?: string;
  staleOnly?: string;
}): DocumentationSearchFilters {
  const filters: DocumentationSearchFilters = {};
  const q = normalizeQueryValue(query.q);
  const kind = parseDocumentKind(query.kind);
  const category = normalizeQueryValue(query.category);
  const site = normalizeQueryValue(query.site);
  const owner = normalizeQueryValue(query.owner);
  const systemId = normalizeQueryValue(query.systemId);
  const reviewState = parseReviewState(query.reviewState);

  if (q) {
    filters.q = q;
  }

  if (kind) {
    filters.kind = kind;
  }

  if (category) {
    filters.category = category;
  }

  if (site) {
    filters.site = site;
  }

  if (owner) {
    filters.owner = owner;
  }

  if (systemId) {
    filters.systemId = systemId;
  }

  if (reviewState) {
    filters.reviewState = reviewState;
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

function parseDocumentKind(value?: string) {
  return value && documentKinds.includes(value as (typeof documentKinds)[number])
    ? (value as (typeof documentKinds)[number])
    : undefined;
}

function parseReviewState(value?: string) {
  return value && documentReviewStates.includes(value as (typeof documentReviewStates)[number])
    ? (value as (typeof documentReviewStates)[number])
    : undefined;
}

function mapOverviewResponse(overview: DocumentationOverview) {
  return {
    dataMode: overview.dataMode,
    generatedAt: overview.generatedAt,
    summary: overview.summary,
    writeBoundary: overview.writeBoundary,
    cards: overview.cards.map((card) => ({
      key: card.key,
      label: card.label,
      value: card.value,
      tone: card.tone,
      summary: card.summary,
    })),
    queue: overview.queue.map(mapQueueItemResponse),
  };
}

function mapQueueItemResponse(item: DocumentationQueueItem) {
  return {
    queueId: item.queueId,
    documentId: item.documentId,
    title: item.title,
    kind: item.kind,
    reviewState: item.reviewState,
    reviewDueAt: item.reviewDueAt,
    lastReviewedAt: item.lastReviewedAt,
    sourceUpdatedAt: item.sourceUpdatedAt,
    contentUpdatedAt: item.contentUpdatedAt,
    summary: item.summary,
    focusReason: {
      code: item.focusReason.code,
      label: item.focusReason.label,
      summary: item.focusReason.summary,
    },
    suggestedNextStep: item.suggestedNextStep,
    queueRank: item.queueRank,
    metadataTags: item.metadataTags.map((tag) => ({
      dimension: tag.dimension,
      valueKey: tag.valueKey,
      valueLabel: tag.valueLabel,
    })),
    linkedSystems: item.linkedSystems.map((system) => ({
      systemId: system.systemId,
      systemName: system.systemName,
      relationshipLabel: system.relationshipLabel,
      category: system.category,
      ownerTeam: system.ownerTeam,
      criticality: system.criticality,
    })),
  };
}

function mapSearchResponse(response: DocumentationSearchResponse) {
  return {
    dataMode: response.dataMode,
    generatedAt: response.generatedAt,
    summary: response.summary,
    writeBoundary: response.writeBoundary,
    filters: response.filters,
    facets: response.facets,
    results: response.results.map((result) => ({
      documentId: result.documentId,
      title: result.title,
      kind: result.kind,
      summary: result.summary,
      reviewState: result.reviewState,
      reviewDueAt: result.reviewDueAt,
      lastReviewedAt: result.lastReviewedAt,
      sourceUpdatedAt: result.sourceUpdatedAt,
      contentUpdatedAt: result.contentUpdatedAt,
      matchedExcerpt: result.matchedExcerpt,
      relevanceScore: result.relevanceScore,
      reasons: result.reasons.map((reason) => ({
        code: reason.code,
        label: reason.label,
        summary: reason.summary,
      })),
      metadataTags: result.metadataTags.map((tag) => ({
        dimension: tag.dimension,
        valueKey: tag.valueKey,
        valueLabel: tag.valueLabel,
      })),
      linkedSystems: result.linkedSystems.map((system) => ({
        systemId: system.systemId,
        systemName: system.systemName,
        relationshipLabel: system.relationshipLabel,
        category: system.category,
        ownerTeam: system.ownerTeam,
        criticality: system.criticality,
      })),
      suggestedNextStep: result.suggestedNextStep,
    })),
    total: response.total,
  };
}

function mapDetailResponse(detail: DocumentationDetail) {
  return {
    dataMode: detail.dataMode,
    writeBoundary: detail.writeBoundary,
    documentId: detail.documentId,
    title: detail.title,
    kind: detail.kind,
    summary: detail.summary,
    contentText: detail.contentText,
    reviewState: detail.reviewState,
    reviewDueAt: detail.reviewDueAt,
    lastReviewedAt: detail.lastReviewedAt,
    sourceUpdatedAt: detail.sourceUpdatedAt,
    contentUpdatedAt: detail.contentUpdatedAt,
    metadataTags: detail.metadataTags.map((tag) => ({
      dimension: tag.dimension,
      valueKey: tag.valueKey,
      valueLabel: tag.valueLabel,
    })),
    linkedSystems: detail.linkedSystems.map((system) => ({
      systemId: system.systemId,
      systemName: system.systemName,
      relationshipLabel: system.relationshipLabel,
      category: system.category,
      ownerTeam: system.ownerTeam,
      criticality: system.criticality,
    })),
    history: detail.history.map((entry) => ({
      revisionId: entry.revisionId,
      revisionType: entry.revisionType,
      summary: entry.summary,
      changedFields: [...entry.changedFields],
      actorLabel: entry.actorLabel,
      reviewState: entry.reviewState,
      reviewDueAt: entry.reviewDueAt,
      createdAt: entry.createdAt,
    })),
    metadataCatalog: {
      sites: detail.metadataCatalog.sites.map((tag) => ({
        dimension: tag.dimension,
        valueKey: tag.valueKey,
        valueLabel: tag.valueLabel,
      })),
      owners: detail.metadataCatalog.owners.map((tag) => ({
        dimension: tag.dimension,
        valueKey: tag.valueKey,
        valueLabel: tag.valueLabel,
      })),
      categories: detail.metadataCatalog.categories.map((tag) => ({
        dimension: tag.dimension,
        valueKey: tag.valueKey,
        valueLabel: tag.valueLabel,
      })),
      systems: detail.metadataCatalog.systems.map((system) => ({
        systemId: system.systemId,
        systemName: system.systemName,
        category: system.category,
        ownerTeam: system.ownerTeam,
        criticality: system.criticality,
      })),
    },
    suggestedNextStep: detail.suggestedNextStep,
  };
}

function parseMetadataReviewBody(body: MetadataReviewBody | undefined):
  | {
      ok: true;
      value: {
        categoryLabels: string[];
        siteLabels: string[];
        ownerLabels: string[];
        systemIds: string[];
        reviewDueAt: string | null;
        reviewSummary: string;
        actorLabel: string;
      };
    }
  | { ok: false; message: string } {
  const reviewSummary = normalizeRequiredString(body?.reviewSummary);
  const actorLabel = normalizeRequiredString(body?.actorLabel);

  if (!reviewSummary || !actorLabel) {
    return {
      ok: false,
      message: "reviewSummary and actorLabel are required",
    };
  }

  const reviewDueAt = normalizeNullableDate(body?.reviewDueAt);

  if (body?.reviewDueAt !== undefined && body?.reviewDueAt !== null && reviewDueAt === null) {
    return {
      ok: false,
      message: "reviewDueAt must be a valid ISO date",
    };
  }

  return {
    ok: true,
    value: {
      categoryLabels: normalizeStringArray(body?.categoryLabels),
      siteLabels: normalizeStringArray(body?.siteLabels),
      ownerLabels: normalizeStringArray(body?.ownerLabels),
      systemIds: normalizeStringArray(body?.systemIds),
      reviewDueAt,
      reviewSummary,
      actorLabel,
    },
  };
}

function normalizeRequiredString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function normalizeNullableDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}
