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

type DocsPrismaClient = {
  document: {
    findMany: (args?: unknown) => Promise<LiveDocumentRecord[]>;
  };
  system: {
    findMany: (args?: unknown) => Promise<LiveSystemRecord[]>;
  };
  $queryRaw: <T = unknown>(query: unknown) => Promise<T>;
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
    const liveRanks =
      dataset.dataMode === "live" && searchQuery.normalizedQuery ? await this.runLiveSearch(searchQuery.normalizedQuery) : new Map();

    const results = dataset.documents
      .map((document) => {
        const liveRank = liveRanks.get(document.documentId);
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
    documentId: "placeholder",
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
