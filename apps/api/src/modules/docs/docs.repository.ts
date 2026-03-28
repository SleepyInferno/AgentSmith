import { Prisma, PrismaClient } from "@prisma/client";
import {
  documentMetadataAssignmentFixtures,
  documentRevisionFixtures,
  documentSystemLinkFixtures,
  documentationFixtureSystems,
  documentationFixtures,
} from "./docs.fixtures.js";
import {
  buildDocumentationSearchQuery,
  collectDocumentationFacets,
  getQueueReason,
  hasMetadataGap,
  hasRecentChange,
  isReviewOverdue,
  rankSeededDocumentationResult,
  type RankedDocumentationResult,
  type SearchableDocumentationRecord,
} from "./docs.search.js";
import type {
  DocumentHistoryEntry,
  DocumentKind,
  DocumentLinkedSystem,
  DocumentMetadataDimension,
  DocumentMetadataTag,
  DocumentReviewState,
  DocumentationDataMode,
  DocumentationDetail,
  DocumentationMetadataCatalog,
  DocumentationOverview,
  DocumentationOverviewCard,
  DocumentationQueueItem,
  DocumentationSearchFilters,
  DocumentationSearchResponse,
} from "./docs.types.js";

type DocsDateValue = Date | string | null;

type LiveSystemRecord = {
  id: string;
  name: string;
  category: string | null;
  ownerTeam: string | null;
  criticality: string | null;
};

type DocumentationMetadataReviewInput = {
  categoryLabels: string[];
  siteLabels: string[];
  ownerLabels: string[];
  systemIds: string[];
  reviewDueAt: string | null;
  reviewSummary: string;
  actorLabel: string;
};

type DocumentationMetadataReviewResult = {
  documentId: string;
  changedFields: string[];
  historyEntryId: string;
  auditAction: "docs.metadata.reviewed";
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
};

type DocumentationMetadataReviewSnapshot = {
  categoryLabels: string[];
  siteLabels: string[];
  ownerLabels: string[];
  systemIds: string[];
  reviewDueAt: string | null;
  reviewState: DocumentReviewState;
};

type LiveDocumentRecord = {
  id: string;
  sourceSystem: string;
  sourceId: string;
  title: string;
  kind: DocumentKind;
  category: string | null;
  owner: string | null;
  summary: string | null;
  contentText: string;
  searchText: string;
  reviewState: DocumentReviewState;
  reviewDueAt: DocsDateValue;
  lastReviewedAt: DocsDateValue;
  sourceUpdatedAt: DocsDateValue;
  contentUpdatedAt: DocsDateValue;
  createdAt: DocsDateValue;
  updatedAt: DocsDateValue;
  metadataAssignments: Array<{
    dimension: DocumentMetadataDimension;
    valueKey: string;
    valueLabel: string;
  }>;
  systemLinks: Array<{
    systemId: string;
    relationshipLabel: string;
    system: LiveSystemRecord | null;
  }>;
  revisions: Array<{
    id: string;
    revisionType: DocumentHistoryEntry["revisionType"];
    summary: string;
    changedFields: string[];
    actorLabel: string | null;
    reviewState: DocumentReviewState;
    reviewDueAt: DocsDateValue;
    createdAt: DocsDateValue;
  }>;
};

type DocsTransactionClient = {
  document: {
    findMany: (args?: unknown) => Promise<LiveDocumentRecord[]>;
    findUnique: (args: unknown) => Promise<LiveDocumentRecord | null>;
    update: (args: unknown) => Promise<LiveDocumentRecord | null>;
  };
  documentMetadataAssignment: {
    deleteMany: (args: unknown) => Promise<unknown>;
    createMany: (args: unknown) => Promise<unknown>;
  };
  documentSystemLink: {
    deleteMany: (args: unknown) => Promise<unknown>;
    createMany: (args: unknown) => Promise<unknown>;
  };
  documentRevision: {
    create: (args: unknown) => Promise<{ id: string }>;
  };
  system: {
    findMany: (args?: unknown) => Promise<LiveSystemRecord[]>;
  };
  auditEvent: {
    create: (args: unknown) => Promise<unknown>;
  };
  $queryRaw: <T = unknown>(query: unknown) => Promise<T>;
};

type DocsPrismaClient = DocsTransactionClient & {
  $transaction: <T>(callback: (tx: DocsTransactionClient) => Promise<T>) => Promise<T>;
};

type DocumentationRecord = SearchableDocumentationRecord & {
  dataMode: DocumentationDataMode;
  history: DocumentHistoryEntry[];
};

type DocumentationDataset = {
  dataMode: DocumentationDataMode;
  generatedAt: string | null;
  documents: DocumentationRecord[];
  metadataCatalog: DocumentationMetadataCatalog;
};

type LiveSearchRow = {
  documentId: string;
  relevanceScore: number;
  matchedExcerpt: string | null;
};

const documentationWriteBoundary = "metadata_review_only" as const;
const metadataReviewAuditAction = "docs.metadata.reviewed" as const;

const queuePriority: Record<DocumentationQueueItem["focusReason"]["code"], number> = {
  review_overdue: 0,
  metadata_incomplete: 1,
  recent_change: 2,
};

export class DocsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverview(): Promise<DocumentationOverview> {
    const dataset = await this.loadDataset();
    const queue = buildDocumentationQueue(dataset.documents);

    return {
      dataMode: dataset.dataMode,
      generatedAt: dataset.generatedAt,
      summary: buildOverviewSummary(dataset.documents, queue),
      writeBoundary: documentationWriteBoundary,
      cards: buildOverviewCards(dataset.documents),
      queue,
    };
  }

  async searchDocuments(filters: DocumentationSearchFilters = {}): Promise<DocumentationSearchResponse> {
    const dataset = await this.loadDataset();
    const searchQuery = buildDocumentationSearchQuery(filters);
    const shouldUseLiveSearch = dataset.dataMode === "live" && Boolean(searchQuery.normalizedQuery);
    const liveRanks = shouldUseLiveSearch ? await this.runLiveSearch(searchQuery.normalizedQuery ?? "") : new Map();
    const fallbackRanks =
      shouldUseLiveSearch && shouldUseFallbackSearch(searchQuery.normalizedQuery ?? "", liveRanks.size)
        ? await this.runLiveFallbackSearch(searchQuery.normalizedQuery ?? "")
        : new Map();

    const results = dataset.documents
      .map((document) => {
        const liveRank = liveRanks.get(document.documentId) ?? fallbackRanks.get(document.documentId);
        const rankedResult = rankSeededDocumentationResult(document, searchQuery, liveRank);

        if (!rankedResult) {
          return null;
        }

        return mapSearchResult(document, rankedResult);
      })
      .filter((result): result is DocumentationSearchResponse["results"][number] => Boolean(result))
      .sort((left, right) => right.relevanceScore - left.relevanceScore || left.title.localeCompare(right.title));

    return {
      dataMode: dataset.dataMode,
      generatedAt: dataset.generatedAt,
      summary: buildSearchSummary(results.length, dataset.dataMode),
      writeBoundary: documentationWriteBoundary,
      filters: searchQuery.filters,
      facets: collectDocumentationFacets(results),
      results,
      total: results.length,
    };
  }

  async getDocumentDetail(documentId: string): Promise<DocumentationDetail | null> {
    const dataset = await this.loadDataset();
    const document = dataset.documents.find((item) => item.documentId === documentId);

    if (!document) {
      return null;
    }

    return {
      dataMode: dataset.dataMode,
      writeBoundary: documentationWriteBoundary,
      documentId: document.documentId,
      title: document.title,
      kind: document.kind,
      summary: document.summary,
      contentText: document.contentText,
      reviewState: document.reviewState,
      reviewDueAt: document.reviewDueAt,
      lastReviewedAt: document.lastReviewedAt,
      sourceUpdatedAt: document.sourceUpdatedAt,
      contentUpdatedAt: document.contentUpdatedAt,
      metadataTags: document.metadataTags,
      linkedSystems: document.linkedSystems,
      history: document.history,
      metadataCatalog: dataset.metadataCatalog,
      suggestedNextStep: document.suggestedNextStep,
    };
  }

  async submitMetadataReview(
    documentId: string,
    input: DocumentationMetadataReviewInput,
  ): Promise<DocumentationMetadataReviewResult | null> {
    const prisma = this.prisma as unknown as DocsPrismaClient;

    return prisma.$transaction(async (tx) => {
      const existingDocument = await tx.document.findUnique({
        where: {
          id: documentId,
        },
        include: {
          metadataAssignments: true,
          systemLinks: {
            include: {
              system: true,
            },
          },
          revisions: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!existingDocument) {
        return null;
      }

      const categoryLabels = normalizeLabelList(input.categoryLabels);
      const siteLabels = normalizeLabelList(input.siteLabels);
      const ownerLabels = normalizeLabelList(input.ownerLabels);
      const requestedSystemIds = normalizeIdList(input.systemIds);
      const linkedSystems = requestedSystemIds.length
        ? await tx.system.findMany({
            where: {
              id: {
                in: requestedSystemIds,
              },
            },
          })
        : [];
      const reviewDueAt = parseOptionalDate(input.reviewDueAt);
      const lastReviewedAt = new Date();
      const reviewState = deriveReviewState(reviewDueAt, lastReviewedAt);
      const beforeSnapshot = buildMetadataReviewSnapshot(existingDocument);
      const afterSnapshot: DocumentationMetadataReviewSnapshot = {
        categoryLabels,
        siteLabels,
        ownerLabels,
        systemIds: linkedSystems.map((system) => system.id).sort((left, right) => left.localeCompare(right)),
        reviewDueAt: reviewDueAt?.toISOString() ?? null,
        reviewState,
      };
      const changedFields = collectMetadataReviewChangedFields(beforeSnapshot, afterSnapshot, input);
      const existingRelationshipLabels = new Map(
        existingDocument.systemLinks.map((link) => [link.systemId, link.relationshipLabel]),
      );
      const metadataAssignments = [
        ...buildMetadataAssignments(documentId, "category", categoryLabels, lastReviewedAt),
        ...buildMetadataAssignments(documentId, "site", siteLabels, lastReviewedAt),
        ...buildMetadataAssignments(documentId, "owner", ownerLabels, lastReviewedAt),
      ];

      await tx.documentMetadataAssignment.deleteMany({
        where: {
          documentId,
        },
      });

      if (metadataAssignments.length > 0) {
        await tx.documentMetadataAssignment.createMany({
          data: metadataAssignments,
        });
      }

      await tx.documentSystemLink.deleteMany({
        where: {
          documentId,
        },
      });

      if (linkedSystems.length > 0) {
        await tx.documentSystemLink.createMany({
          data: linkedSystems.map((system) => ({
            documentId,
            systemId: system.id,
            relationshipLabel: existingRelationshipLabels.get(system.id) ?? "linked system",
            createdAt: lastReviewedAt,
            updatedAt: lastReviewedAt,
          })),
        });
      }

      await tx.document.update({
        where: {
          id: documentId,
        },
        data: {
          category: categoryLabels[0] ?? null,
          owner: ownerLabels[0] ?? null,
          searchText: buildDocumentSearchText(existingDocument, {
            categoryLabels,
            siteLabels,
            ownerLabels,
            systems: linkedSystems,
          }),
          reviewState,
          reviewDueAt,
          lastReviewedAt,
          updatedAt: lastReviewedAt,
        },
      });

      const historyEntry = await tx.documentRevision.create({
        data: {
          documentId,
          revisionType: "metadata_review",
          summary: input.reviewSummary,
          changedFields,
          actorLabel: input.actorLabel,
          reviewState,
          reviewDueAt,
          createdAt: lastReviewedAt,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: null,
          action: metadataReviewAuditAction,
          targetType: "Document",
          targetId: documentId,
          result: "success",
          metadata: {
            reviewSummary: input.reviewSummary,
            actorLabel: input.actorLabel,
            changedFields,
            before: beforeSnapshot,
            after: afterSnapshot,
          },
        },
      });

      return {
        documentId,
        changedFields,
        historyEntryId: historyEntry.id,
        auditAction: metadataReviewAuditAction,
        reviewDueAt: afterSnapshot.reviewDueAt,
        lastReviewedAt: lastReviewedAt.toISOString(),
      };
    });
  }

  private async loadDataset(): Promise<DocumentationDataset> {
    const prisma = this.prisma as unknown as DocsPrismaClient;

    try {
      const documents = await prisma.document.findMany({
        include: {
          metadataAssignments: true,
          systemLinks: {
            include: {
              system: true,
            },
          },
          revisions: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          title: "asc",
        },
      });

      if (documents.length === 0) {
        return buildSeededDataset();
      }

      const systems = await prisma.system.findMany({
        orderBy: {
          name: "asc",
        },
      });

      return buildLiveDataset(documents, systems);
    } catch (error) {
      if (isMissingDocumentationTableError(error)) {
        return buildSeededDataset();
      }

      throw error;
    }
  }

  private async runLiveSearch(query: string): Promise<Map<string, { sqlScore: number; sqlExcerpt: string | null }>> {
    const prisma = this.prisma as unknown as DocsPrismaClient;
    const rankedRows = await prisma.$queryRaw<LiveSearchRow[]>(Prisma.sql`
      WITH ranked_documents AS (
        SELECT
          d."id" AS "documentId",
          ts_rank_cd(
            setweight(to_tsvector('english', coalesce(d."title", '')), 'A') ||
            setweight(to_tsvector('english', coalesce(d."summary", '')), 'B') ||
            setweight(to_tsvector('english', coalesce(d."contentText", '')), 'C') ||
            setweight(to_tsvector('english', coalesce(d."searchText", '')), 'B'),
            websearch_to_tsquery('english', ${query})
          ) AS "relevanceScore",
          ts_headline(
            'english',
            coalesce(nullif(d."contentText", ''), coalesce(d."summary", d."title")),
            websearch_to_tsquery('english', ${query}),
            'MaxFragments=2, MaxWords=18, MinWords=6'
          ) AS "matchedExcerpt"
        FROM "Document" d
        WHERE
          setweight(to_tsvector('english', coalesce(d."title", '')), 'A') ||
          setweight(to_tsvector('english', coalesce(d."summary", '')), 'B') ||
          setweight(to_tsvector('english', coalesce(d."contentText", '')), 'C') ||
          setweight(to_tsvector('english', coalesce(d."searchText", '')), 'B')
          @@ websearch_to_tsquery('english', ${query})
      )
      SELECT "documentId", "relevanceScore", "matchedExcerpt"
      FROM ranked_documents
      WHERE "relevanceScore" > 0
    `);

    return new Map(
      rankedRows.map((row) => [
        row.documentId,
        {
          sqlScore: Number(row.relevanceScore),
          sqlExcerpt: row.matchedExcerpt,
        },
      ]),
    );
  }

  private async runLiveFallbackSearch(query: string): Promise<Map<string, { sqlScore: number; sqlExcerpt: string | null }>> {
    const prisma = this.prisma as unknown as DocsPrismaClient;
    const rankedRows = await prisma.$queryRaw<LiveSearchRow[]>(Prisma.sql`
      SELECT DISTINCT
        d."id" AS "documentId",
        (
          GREATEST(
            similarity(lower(coalesce(d."title", '')), lower(${query})),
            similarity(lower(coalesce(d."searchText", '')), lower(${query}))
          ) * 100
        ) +
        CASE
          WHEN lower(coalesce(d."title", '')) LIKE '%' || lower(${query}) || '%' THEN 40
          WHEN lower(coalesce(d."searchText", '')) LIKE '%' || lower(${query}) || '%' THEN 24
          ELSE 0
        END AS "relevanceScore",
        coalesce(nullif(d."summary", ''), d."title") AS "matchedExcerpt"
      FROM "Document" d
      LEFT JOIN "DocumentMetadataAssignment" dma ON dma."documentId" = d."id"
      LEFT JOIN "DocumentSystemLink" dsl ON dsl."documentId" = d."id"
      LEFT JOIN "System" s ON s."id" = dsl."systemId"
      WHERE
        lower(coalesce(d."title", '')) LIKE '%' || lower(${query}) || '%'
        OR lower(coalesce(d."searchText", '')) LIKE '%' || lower(${query}) || '%'
        OR similarity(lower(coalesce(d."title", '')), lower(${query})) >= 0.1
        OR similarity(lower(coalesce(d."searchText", '')), lower(${query})) >= 0.1
        OR lower(coalesce(dma."valueLabel", '')) LIKE '%' || lower(${query}) || '%'
        OR lower(coalesce(dma."valueKey", '')) LIKE '%' || lower(${query}) || '%'
        OR lower(coalesce(s."name", '')) LIKE '%' || lower(${query}) || '%'
        OR lower(coalesce(dsl."relationshipLabel", '')) LIKE '%' || lower(${query}) || '%'
      ORDER BY "relevanceScore" DESC, d."title" ASC
    `);

    return new Map(
      rankedRows.map((row) => [
        row.documentId,
        {
          sqlScore: Number(row.relevanceScore),
          sqlExcerpt: row.matchedExcerpt,
        },
      ]),
    );
  }
}

function buildSeededDataset(): DocumentationDataset {
  const systemsById = new Map(
    documentationFixtureSystems.map((system) => [
      system.id,
      {
        systemId: system.id,
        systemName: system.name,
        category: system.category,
        ownerTeam: system.ownerTeam,
        criticality: system.criticality,
      },
    ]),
  );

  const metadataAssignmentsByDocumentId = groupBy(documentMetadataAssignmentFixtures, (assignment) => assignment.documentId);
  const systemLinksByDocumentId = groupBy(documentSystemLinkFixtures, (link) => link.documentId);
  const revisionsByDocumentId = groupBy(documentRevisionFixtures, (revision) => revision.documentId);

  const documents = documentationFixtures.map((document) => {
    const metadataTags = (metadataAssignmentsByDocumentId.get(document.id) ?? []).map((assignment) => ({
      dimension: assignment.dimension,
      valueKey: assignment.valueKey,
      valueLabel: assignment.valueLabel,
    }));
    const linkedSystems = (systemLinksByDocumentId.get(document.id) ?? []).map((link) => {
      const system = systemsById.get(link.systemId);

      return {
        systemId: link.systemId,
        systemName: system?.systemName ?? link.systemId,
        relationshipLabel: link.relationshipLabel,
        category: system?.category ?? null,
        ownerTeam: system?.ownerTeam ?? null,
        criticality: system?.criticality ?? null,
      };
    });
    const history = (revisionsByDocumentId.get(document.id) ?? [])
      .map((revision, index) => ({
        revisionId: `${document.id}-revision-${index + 1}`,
        revisionType: revision.revisionType,
        summary: revision.summary,
        changedFields: [...revision.changedFields],
        actorLabel: revision.actorLabel,
        reviewState: revision.reviewState,
        reviewDueAt: revision.reviewDueAt,
        createdAt: revision.createdAt,
      }))
      .sort((left, right) => compareIsoDates(right.createdAt, left.createdAt));

    return {
      documentId: document.id,
      title: document.title,
      kind: document.kind,
      summary: document.summary,
      contentText: document.contentText,
      searchText: document.searchText,
      reviewState: document.reviewState,
      reviewDueAt: document.reviewDueAt,
      lastReviewedAt: document.lastReviewedAt,
      sourceUpdatedAt: document.sourceUpdatedAt,
      contentUpdatedAt: document.contentUpdatedAt,
      metadataTags,
      linkedSystems,
      suggestedNextStep: document.suggestedNextStep,
      dataMode: document.dataMode,
      history,
    } satisfies DocumentationRecord;
  });

  return {
    dataMode: "seeded_example",
    generatedAt: computeGeneratedAt(documents),
    documents,
    metadataCatalog: buildMetadataCatalog(documents, documentationFixtureSystems),
  };
}

function buildLiveDataset(documents: LiveDocumentRecord[], systems: LiveSystemRecord[]): DocumentationDataset {
  const normalizedDocuments = documents.map((document) => ({
    documentId: document.id,
    title: document.title,
    kind: document.kind,
    summary: document.summary,
    contentText: document.contentText,
    searchText: document.searchText,
    reviewState: document.reviewState,
    reviewDueAt: toIsoString(document.reviewDueAt),
    lastReviewedAt: toIsoString(document.lastReviewedAt),
    sourceUpdatedAt: toIsoString(document.sourceUpdatedAt),
    contentUpdatedAt: toIsoString(document.contentUpdatedAt),
    metadataTags: document.metadataAssignments.map((assignment) => ({
      dimension: assignment.dimension,
      valueKey: assignment.valueKey,
      valueLabel: assignment.valueLabel,
    })),
    linkedSystems: document.systemLinks.map((link) => ({
      systemId: link.systemId,
      systemName: link.system?.name ?? link.systemId,
      relationshipLabel: link.relationshipLabel,
      category: link.system?.category ?? null,
      ownerTeam: link.system?.ownerTeam ?? null,
      criticality: link.system?.criticality ?? null,
    })),
    suggestedNextStep: buildSuggestedNextStep({
      metadataTags: document.metadataAssignments.map((assignment) => ({
        dimension: assignment.dimension,
        valueKey: assignment.valueKey,
        valueLabel: assignment.valueLabel,
      })),
      reviewState: document.reviewState,
      reviewDueAt: toIsoString(document.reviewDueAt),
      lastReviewedAt: toIsoString(document.lastReviewedAt),
      sourceUpdatedAt: toIsoString(document.sourceUpdatedAt),
      contentUpdatedAt: toIsoString(document.contentUpdatedAt),
    }),
    dataMode: "live" as const,
    history: document.revisions
      .map((revision) => ({
        revisionId: revision.id,
        revisionType: revision.revisionType,
        summary: revision.summary,
        changedFields: [...revision.changedFields],
        actorLabel: revision.actorLabel,
        reviewState: revision.reviewState,
        reviewDueAt: toIsoString(revision.reviewDueAt),
        createdAt: toRequiredIsoString(revision.createdAt),
      }))
      .sort((left, right) => compareIsoDates(right.createdAt, left.createdAt)),
  }));

  return {
    dataMode: "live",
    generatedAt: computeGeneratedAt(normalizedDocuments),
    documents: normalizedDocuments,
    metadataCatalog: buildMetadataCatalog(normalizedDocuments, systems),
  };
}

function buildMetadataAssignments(
  documentId: string,
  dimension: DocumentMetadataDimension,
  labels: string[],
  timestamp: Date,
) {
  return labels.map((label) => ({
    documentId,
    dimension,
    valueKey: `${dimension}-${slugifyLabel(label)}`,
    valueLabel: label,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function buildMetadataReviewSnapshot(document: LiveDocumentRecord): DocumentationMetadataReviewSnapshot {
  return {
    categoryLabels: collectMetadataLabels(document.metadataAssignments, "category"),
    siteLabels: collectMetadataLabels(document.metadataAssignments, "site"),
    ownerLabels: collectMetadataLabels(document.metadataAssignments, "owner"),
    systemIds: document.systemLinks.map((link) => link.systemId).sort((left, right) => left.localeCompare(right)),
    reviewDueAt: toIsoString(document.reviewDueAt),
    reviewState: document.reviewState,
  };
}

function collectMetadataReviewChangedFields(
  before: DocumentationMetadataReviewSnapshot,
  after: DocumentationMetadataReviewSnapshot,
  input: DocumentationMetadataReviewInput,
) {
  const changedFields = new Set<string>();

  if (input.categoryLabels.length > 0 || !sameStringArray(before.categoryLabels, after.categoryLabels)) {
    changedFields.add("categoryLabels");
  }

  if (input.siteLabels.length > 0 || !sameStringArray(before.siteLabels, after.siteLabels)) {
    changedFields.add("siteLabels");
  }

  if (input.ownerLabels.length > 0 || !sameStringArray(before.ownerLabels, after.ownerLabels)) {
    changedFields.add("ownerLabels");
  }

  if (input.systemIds.length > 0 || !sameStringArray(before.systemIds, after.systemIds)) {
    changedFields.add("systemIds");
  }

  if (input.reviewDueAt !== null || before.reviewDueAt !== after.reviewDueAt) {
    changedFields.add("reviewDueAt");
  }

  return [...changedFields];
}

function buildDocumentationQueue(documents: DocumentationRecord[]): DocumentationQueueItem[] {
  return documents
    .map((document) => ({
      document,
      focusReason: getQueueReason(document),
    }))
    .filter((item): item is { document: DocumentationRecord; focusReason: DocumentationQueueItem["focusReason"] } =>
      Boolean(item.focusReason),
    )
    .sort((left, right) => {
      const priorityDelta = queuePriority[left.focusReason.code] - queuePriority[right.focusReason.code];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const reviewDelta = compareNullableIsoDates(left.document.reviewDueAt, right.document.reviewDueAt);
      if (reviewDelta !== 0) {
        return reviewDelta;
      }

      const changeDelta = compareNullableIsoDates(right.document.contentUpdatedAt, left.document.contentUpdatedAt);
      if (changeDelta !== 0) {
        return changeDelta;
      }

      return left.document.title.localeCompare(right.document.title);
    })
    .map((item, index) => ({
      queueId: `docs-queue-${item.document.documentId}`,
      documentId: item.document.documentId,
      title: item.document.title,
      kind: item.document.kind,
      reviewState: item.document.reviewState,
      reviewDueAt: item.document.reviewDueAt,
      lastReviewedAt: item.document.lastReviewedAt,
      sourceUpdatedAt: item.document.sourceUpdatedAt,
      contentUpdatedAt: item.document.contentUpdatedAt,
      summary: item.focusReason.summary,
      focusReason: item.focusReason,
      suggestedNextStep: item.document.suggestedNextStep,
      queueRank: index + 1,
      metadataTags: item.document.metadataTags,
      linkedSystems: item.document.linkedSystems,
    }));
}

function buildOverviewCards(documents: DocumentationRecord[]): DocumentationOverviewCard[] {
  const overdueCount = documents.filter((document) => isReviewOverdue(document)).length;
  const metadataIncompleteCount = documents.filter((document) => hasMetadataGap(document)).length;
  const recentChangeCount = documents.filter((document) => hasRecentChange(document)).length;

  return [
    {
      key: "total_documents",
      label: "Documents",
      value: documents.length,
      tone: "neutral",
      summary: "Canonical documentation records tracked by the API.",
    },
    {
      key: "review_overdue",
      label: "Review overdue",
      value: overdueCount,
      tone: overdueCount > 0 ? "critical" : "neutral",
      summary: "Documents with review dates in the past.",
    },
    {
      key: "metadata_incomplete",
      label: "Metadata incomplete",
      value: metadataIncompleteCount,
      tone: metadataIncompleteCount > 0 ? "warning" : "neutral",
      summary: "Documents missing site, owner, or category metadata.",
    },
    {
      key: "recent_change",
      label: "Updated since last review",
      value: recentChangeCount,
      tone: recentChangeCount > 0 ? "warning" : "neutral",
      summary: "Documents changed after their most recent review.",
    },
  ];
}

function buildOverviewSummary(documents: DocumentationRecord[], queue: DocumentationQueueItem[]): string {
  const staleCount = documents.filter((document) => isReviewOverdue(document) || hasRecentChange(document)).length;
  return `${documents.length} documents tracked; ${queue.length} queued for review and ${staleCount} show stale knowledge signals.`;
}

function buildSearchSummary(total: number, dataMode: DocumentationDataMode): string {
  const modeSummary = dataMode === "seeded_example" ? "seeded example data" : "live documentation data";
  return `${total} document${total === 1 ? "" : "s"} matched the current filters from ${modeSummary}.`;
}

function mapSearchResult(
  document: DocumentationRecord,
  rankedResult: RankedDocumentationResult,
): DocumentationSearchResponse["results"][number] {
  return {
    documentId: document.documentId,
    title: document.title,
    kind: document.kind,
    summary: document.summary,
    reviewState: document.reviewState,
    reviewDueAt: document.reviewDueAt,
    lastReviewedAt: document.lastReviewedAt,
    sourceUpdatedAt: document.sourceUpdatedAt,
    contentUpdatedAt: document.contentUpdatedAt,
    matchedExcerpt: rankedResult.matchedExcerpt,
    relevanceScore: rankedResult.relevanceScore,
    reasons: rankedResult.reasons,
    metadataTags: document.metadataTags,
    linkedSystems: document.linkedSystems,
    suggestedNextStep: document.suggestedNextStep,
  };
}

function buildMetadataCatalog(
  documents: DocumentationRecord[],
  systems: Array<{
    id?: string;
    name?: string;
    category: string | null;
    ownerTeam: string | null;
    criticality: string | null;
    systemId?: string;
    systemName?: string;
  }>,
): DocumentationMetadataCatalog {
  const allTags = documents.flatMap((document) => document.metadataTags);

  return {
    sites: uniqueTags(allTags, "site"),
    owners: uniqueTags(allTags, "owner"),
    categories: uniqueTags(allTags, "category"),
    systems: [...new Map(
      systems.map((system) => [
        system.id ?? system.systemId ?? "",
        {
          systemId: system.id ?? system.systemId ?? "",
          systemName: system.name ?? system.systemName ?? "",
          category: system.category,
          ownerTeam: system.ownerTeam,
          criticality: system.criticality,
        },
      ]),
    ).values()]
      .filter((system) => system.systemId.length > 0)
      .sort((left, right) => left.systemName.localeCompare(right.systemName)),
  };
}

function uniqueTags(tags: DocumentMetadataTag[], dimension: DocumentMetadataDimension) {
  return [...new Map(
    tags
      .filter((tag) => tag.dimension === dimension)
      .map((tag) => [
        `${tag.dimension}:${tag.valueKey}`,
        {
          dimension: tag.dimension,
          valueKey: tag.valueKey,
          valueLabel: tag.valueLabel,
        },
      ]),
  ).values()].sort((left, right) => left.valueLabel.localeCompare(right.valueLabel));
}

function buildSuggestedNextStep(record: {
  metadataTags: DocumentMetadataTag[];
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
}): string {
  const searchableRecord = {
    documentId: "synthetic-document",
    title: "",
    kind: "sop" as const,
    summary: null,
    contentText: "",
    searchText: "",
    reviewState: record.reviewState,
    reviewDueAt: record.reviewDueAt,
    lastReviewedAt: record.lastReviewedAt,
    sourceUpdatedAt: record.sourceUpdatedAt,
    contentUpdatedAt: record.contentUpdatedAt,
    metadataTags: record.metadataTags,
    linkedSystems: [],
    suggestedNextStep: "",
  };

  if (isReviewOverdue(searchableRecord)) {
    return "Review this document and refresh the due date.";
  }

  if (hasMetadataGap(searchableRecord)) {
    return "Complete the missing site, owner, or category metadata.";
  }

  if (hasRecentChange(searchableRecord)) {
    return "Review the latest content changes before relying on this document.";
  }

  return "No immediate action required.";
}

function buildDocumentSearchText(
  document: LiveDocumentRecord,
  input: {
    categoryLabels: string[];
    siteLabels: string[];
    ownerLabels: string[];
    systems: LiveSystemRecord[];
  },
) {
  return uniqueStrings([
    document.searchText,
    document.title,
    document.summary ?? "",
    ...input.categoryLabels,
    ...input.siteLabels,
    ...input.ownerLabels,
    ...input.systems.flatMap((system) => [system.id, system.name, system.ownerTeam ?? "", system.category ?? ""]),
  ]).join(" ");
}

function computeGeneratedAt(documents: DocumentationRecord[]): string | null {
  const values = documents.flatMap((document) => [
    document.lastReviewedAt,
    document.sourceUpdatedAt,
    document.contentUpdatedAt,
    ...document.history.map((entry) => entry.createdAt),
  ]);

  return values.reduce<string | null>((latest, value) => {
    if (!value) {
      return latest;
    }

    if (!latest) {
      return value;
    }

    return compareIsoDates(value, latest) > 0 ? value : latest;
  }, null);
}

function toIsoString(value: DocsDateValue): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toRequiredIsoString(value: DocsDateValue): string {
  return toIsoString(value) ?? new Date(0).toISOString();
}

function compareIsoDates(left: string, right: string): number {
  return new Date(left).valueOf() - new Date(right).valueOf();
}

function compareNullableIsoDates(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return compareIsoDates(left, right);
}

function isMissingDocumentationTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";

  return code === "P2021" || /document(metadataassignment|systemlink|revision)?/i.test(message);
}

function collectMetadataLabels(
  assignments: Array<{ dimension: DocumentMetadataDimension; valueLabel: string }>,
  dimension: DocumentMetadataDimension,
) {
  return assignments
    .filter((assignment) => assignment.dimension === dimension)
    .map((assignment) => assignment.valueLabel)
    .sort((left, right) => left.localeCompare(right));
}

function deriveReviewState(reviewDueAt: Date | null, now: Date): DocumentReviewState {
  if (!reviewDueAt) {
    return "current";
  }

  const dayDelta = Math.ceil((reviewDueAt.valueOf() - now.valueOf()) / (1000 * 60 * 60 * 24));

  if (dayDelta < 0) {
    return "overdue";
  }

  if (dayDelta <= 14) {
    return "due_soon";
  }

  return "current";
}

function groupBy<T>(items: T[], keySelector: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keySelector(item);
    const existing = groups.get(key);

    if (existing) {
      existing.push(item);
      continue;
    }

    groups.set(key, [item]);
  }

  return groups;
}

function normalizeLabelList(values: string[]) {
  return uniqueStrings(values.map((value) => value.trim()).filter(Boolean));
}

function normalizeIdList(values: string[]) {
  return uniqueStrings(values.map((value) => value.trim()).filter(Boolean));
}

function parseOptionalDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function shouldUseFallbackSearch(query: string, liveResultCount: number) {
  return query.trim().length < 4 || liveResultCount === 0;
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function slugifyLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}
