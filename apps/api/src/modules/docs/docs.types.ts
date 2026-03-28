export const documentationDataModes = ["live", "seeded_example"] as const;
export type DocumentationDataMode = (typeof documentationDataModes)[number];

export const documentationWriteBoundaries = ["metadata_review_only"] as const;
export type DocumentationWriteBoundary = (typeof documentationWriteBoundaries)[number];

export const documentKinds = [
  "sop",
  "vendor_note",
  "contact",
  "infrastructure_note",
  "recovery_procedure",
] as const;
export type DocumentKind = (typeof documentKinds)[number];

export const documentReviewStates = ["current", "due_soon", "overdue", "unreviewed"] as const;
export type DocumentReviewState = (typeof documentReviewStates)[number];

export const documentMetadataDimensions = ["site", "owner", "category"] as const;
export type DocumentMetadataDimension = (typeof documentMetadataDimensions)[number];

export const documentRevisionTypes = ["source_sync", "metadata_review", "review_completed"] as const;
export type DocumentRevisionType = (typeof documentRevisionTypes)[number];

export type DocumentMetadataTag = {
  dimension: DocumentMetadataDimension;
  valueKey: string;
  valueLabel: string;
};

export type DocumentLinkedSystem = {
  systemId: string;
  systemName: string;
  relationshipLabel: string;
  category: string | null;
  ownerTeam: string | null;
  criticality: string | null;
};

export type DocumentationSearchReason = {
  code: "title_match" | "content_match" | "metadata_match" | "system_match" | "review_overdue" | "recent_change";
  label: string;
  summary: string;
};

export type DocumentationQueueReason = {
  code: "review_overdue" | "metadata_incomplete" | "recent_change";
  label: "Review overdue" | "Metadata incomplete" | "Updated since last review";
  summary: string;
};

export type DocumentationOverviewCard = {
  key: "total_documents" | "review_overdue" | "metadata_incomplete" | "recent_change";
  label: string;
  value: number;
  tone: "neutral" | "warning" | "critical";
  summary: string;
};

export type DocumentationQueueItem = {
  queueId: string;
  documentId: string;
  title: string;
  kind: DocumentKind;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  summary: string;
  focusReason: DocumentationQueueReason;
  suggestedNextStep: string;
  queueRank: number;
  metadataTags: DocumentMetadataTag[];
  linkedSystems: DocumentLinkedSystem[];
};

export type DocumentationOverview = {
  dataMode: DocumentationDataMode;
  generatedAt: string | null;
  summary: string;
  writeBoundary: DocumentationWriteBoundary;
  cards: DocumentationOverviewCard[];
  queue: DocumentationQueueItem[];
};

export type DocumentationFacetOption = {
  value: string;
  label: string;
  count: number;
};

export type DocumentationSearchFacets = {
  kinds: DocumentationFacetOption[];
  reviewStates: DocumentationFacetOption[];
  sites: DocumentationFacetOption[];
  owners: DocumentationFacetOption[];
  categories: DocumentationFacetOption[];
  systems: DocumentationFacetOption[];
};

export type DocumentationSearchFilters = {
  q?: string;
  kind?: DocumentKind;
  category?: string;
  site?: string;
  owner?: string;
  systemId?: string;
  reviewState?: DocumentReviewState;
  staleOnly?: boolean;
};

export type DocumentationSearchResult = {
  documentId: string;
  title: string;
  kind: DocumentKind;
  summary: string | null;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  matchedExcerpt: string | null;
  relevanceScore: number;
  reasons: DocumentationSearchReason[];
  metadataTags: DocumentMetadataTag[];
  linkedSystems: DocumentLinkedSystem[];
  suggestedNextStep: string;
};

export type DocumentationSearchResponse = {
  dataMode: DocumentationDataMode;
  generatedAt: string | null;
  summary: string;
  writeBoundary: DocumentationWriteBoundary;
  filters: DocumentationSearchFilters;
  facets: DocumentationSearchFacets;
  results: DocumentationSearchResult[];
  total: number;
};

export type DocumentHistoryEntry = {
  revisionId: string;
  revisionType: DocumentRevisionType;
  summary: string;
  changedFields: string[];
  actorLabel: string | null;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  createdAt: string;
};

export type DocumentationMetadataCatalog = {
  sites: DocumentMetadataTag[];
  owners: DocumentMetadataTag[];
  categories: DocumentMetadataTag[];
  systems: Array<{
    systemId: string;
    systemName: string;
    category: string | null;
    ownerTeam: string | null;
    criticality: string | null;
  }>;
};

export type DocumentationDetail = {
  dataMode: DocumentationDataMode;
  writeBoundary: DocumentationWriteBoundary;
  documentId: string;
  title: string;
  kind: DocumentKind;
  summary: string | null;
  contentText: string;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  metadataTags: DocumentMetadataTag[];
  linkedSystems: DocumentLinkedSystem[];
  history: DocumentHistoryEntry[];
  metadataCatalog: DocumentationMetadataCatalog;
  suggestedNextStep: string | null;
};

export type DocumentationMetadataReviewInput = {
  documentId: string;
  reviewBoundary: DocumentationWriteBoundary;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  metadataTags: DocumentMetadataTag[];
  linkedSystems: Array<{
    systemId: string;
    relationshipLabel: string;
  }>;
  changeSummary: string;
};

export type DocumentationMetadataReviewResult = {
  documentId: string;
  reviewBoundary: DocumentationWriteBoundary;
  summary: string;
  changedFields: string[];
  historyEntry: DocumentHistoryEntry;
  detail: DocumentationDetail;
};
