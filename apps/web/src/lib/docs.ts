export type DocumentationDataMode = "live" | "seeded_example" | string;
export type DocumentationWriteBoundary = "metadata_review_only" | string;

export type DocumentationReason = {
  code: string;
  label: string;
  summary: string;
};

export type DocumentationMetadataTag = {
  dimension: string;
  valueKey: string;
  valueLabel: string;
};

export type DocumentationLinkedSystem = {
  systemId: string;
  systemName: string;
  relationshipLabel: string;
  category: string | null;
  ownerTeam: string | null;
  criticality: string | null;
};

export type DocumentationHistoryEntry = {
  revisionId: string;
  revisionType: string;
  summary: string;
  changedFields: string[];
  actorLabel: string | null;
  reviewState: string;
  reviewDueAt: string | null;
  createdAt: string;
};

export type DocumentationOverviewCard = {
  key: string;
  label: string;
  value: number;
  tone: string;
  summary: string;
};

export type DocumentationReviewQueueRow = {
  queueId: string;
  documentId: string;
  title: string;
  kind: string;
  reviewState: string;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  summary: string;
  reasons: DocumentationReason[];
  suggestedNextStep: string;
  queueRank: number;
  metadataTags: DocumentationMetadataTag[];
  linkedSystems: DocumentationLinkedSystem[];
};

export type DocumentationOverviewResponse = {
  dataMode: DocumentationDataMode;
  generatedAt: string | null;
  summary: string;
  writeBoundary: DocumentationWriteBoundary;
  cards: DocumentationOverviewCard[];
  queue: DocumentationReviewQueueRow[];
};

export type DocumentationSearchParams = {
  q?: string;
  kind?: string;
  category?: string;
  site?: string;
  owner?: string;
  systemId?: string;
  reviewState?: string;
  staleOnly?: boolean;
};

export type DocumentationFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type DocumentationSearchRow = {
  documentId: string;
  title: string;
  kind: string;
  summary: string | null;
  reviewState: string;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  matchedExcerpt: string | null;
  relevanceScore: number;
  reasons: DocumentationReason[];
  metadataTags: DocumentationMetadataTag[];
  linkedSystems: DocumentationLinkedSystem[];
  suggestedNextStep: string;
  owner: string | null;
  site: string | null;
  category: string | null;
};

export type DocumentationSearchResponse = {
  dataMode: DocumentationDataMode;
  generatedAt: string | null;
  summary: string;
  writeBoundary: DocumentationWriteBoundary;
  filters: DocumentationSearchParams;
  facets: {
    kinds: DocumentationFacetOption[];
    reviewStates: DocumentationFacetOption[];
    sites: DocumentationFacetOption[];
    owners: DocumentationFacetOption[];
    categories: DocumentationFacetOption[];
    systems: DocumentationFacetOption[];
  };
  results: DocumentationSearchRow[];
  total: number;
};

export type DocumentationDetailResponse = {
  dataMode: DocumentationDataMode;
  writeBoundary: DocumentationWriteBoundary;
  documentId: string;
  title: string;
  kind: string;
  summary: string | null;
  contentText: string;
  reviewState: string;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  metadataTags: DocumentationMetadataTag[];
  linkedSystems: DocumentationLinkedSystem[];
  history: DocumentationHistoryEntry[];
  metadataCatalog: {
    sites: DocumentationMetadataTag[];
    owners: DocumentationMetadataTag[];
    categories: DocumentationMetadataTag[];
    systems: DocumentationLinkedSystem[];
  };
  suggestedNextStep: string | null;
};

type DocumentationOverviewApiResponse = {
  dataMode: DocumentationDataMode;
  generatedAt: string | null;
  summary: string;
  writeBoundary: DocumentationWriteBoundary;
  cards: DocumentationOverviewCard[];
  queue: Array<{
    queueId: string;
    documentId: string;
    title: string;
    kind: string;
    reviewState: string;
    reviewDueAt: string | null;
    lastReviewedAt: string | null;
    sourceUpdatedAt: string | null;
    contentUpdatedAt: string | null;
    summary: string;
    focusReason: DocumentationReason;
    suggestedNextStep: string;
    queueRank: number;
    metadataTags: DocumentationMetadataTag[];
    linkedSystems: DocumentationLinkedSystem[];
  }>;
};

type DocumentationSearchApiResponse = Omit<DocumentationSearchResponse, "results"> & {
  results: Array<Omit<DocumentationSearchRow, "owner" | "site" | "category">>;
};

const metadataDimensions = ["site", "owner", "category"] as const;

async function apiRequest<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildSearchUrl(params: DocumentationSearchParams = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `/api/docs/search?${query}` : "/api/docs/search";
}

function getMetadataValue(tags: DocumentationMetadataTag[], dimension: (typeof metadataDimensions)[number]) {
  const values = tags.filter((tag) => tag.dimension === dimension).map((tag) => tag.valueLabel);

  if (values.length === 0) {
    return null;
  }

  return values.join(", ");
}

export const docsQueryKeys = {
  overview: ["docs-overview"] as const,
  searchRoot: ["docs-search"] as const,
  search: (params: DocumentationSearchParams) => ["docs-search", params] as const,
  detail: (documentId: string) => ["docs-detail", documentId] as const,
};

export async function getDocumentationOverview() {
  const response = await apiRequest<DocumentationOverviewApiResponse>("/api/docs/overview");

  return {
    ...response,
    queue: response.queue.map((item) => ({
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
      reasons: [item.focusReason],
      suggestedNextStep: item.suggestedNextStep,
      queueRank: item.queueRank,
      metadataTags: item.metadataTags,
      linkedSystems: item.linkedSystems,
    })),
  } satisfies DocumentationOverviewResponse;
}

export async function searchDocumentation(params: DocumentationSearchParams = {}) {
  const response = await apiRequest<DocumentationSearchApiResponse>(buildSearchUrl(params));

  return {
    ...response,
    results: response.results.map((item) => ({
      ...item,
      owner: getMetadataValue(item.metadataTags, "owner"),
      site: getMetadataValue(item.metadataTags, "site"),
      category: getMetadataValue(item.metadataTags, "category"),
    })),
  } satisfies DocumentationSearchResponse;
}

export function getDocumentationDetail(documentId: string) {
  return apiRequest<DocumentationDetailResponse>(`/api/docs/${documentId}`);
}
