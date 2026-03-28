import type {
  DocumentKind,
  DocumentLinkedSystem,
  DocumentMetadataTag,
  DocumentReviewState,
  DocumentationQueueReason,
  DocumentationSearchFacets,
  DocumentationSearchFilters,
  DocumentationSearchReason,
} from "./docs.types.js";

export type SearchableDocumentationRecord = {
  documentId: string;
  title: string;
  kind: DocumentKind;
  summary: string | null;
  contentText: string;
  searchText: string;
  reviewState: DocumentReviewState;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  metadataTags: DocumentMetadataTag[];
  linkedSystems: DocumentLinkedSystem[];
  suggestedNextStep: string;
};

export type DocumentationSearchQuery = {
  filters: DocumentationSearchFilters;
  normalizedQuery: string | null;
  queryTokens: string[];
};

export type RankedDocumentationResult = {
  matchedExcerpt: string | null;
  reasons: DocumentationSearchReason[];
  relevanceScore: number;
};

type RankOptions = {
  sqlScore?: number | null;
  sqlExcerpt?: string | null;
};

type FacetCountMap = Map<string, { label: string; count: number }>;

export function buildDocumentationSearchQuery(filters: DocumentationSearchFilters = {}): DocumentationSearchQuery {
  const normalizedQuery = normalizeFilterValue(filters.q) ?? null;

  return {
    filters: {
      q: normalizedQuery ?? undefined,
      kind: filters.kind,
      category: normalizeFilterValue(filters.category),
      site: normalizeFilterValue(filters.site),
      owner: normalizeFilterValue(filters.owner),
      systemId: normalizeFilterValue(filters.systemId),
      reviewState: filters.reviewState,
      staleOnly: filters.staleOnly === true ? true : undefined,
    },
    normalizedQuery,
    queryTokens: normalizedQuery ? normalizedQuery.toLowerCase().split(/\s+/).filter(Boolean) : [],
  };
}

export function rankSeededDocumentationResult(
  record: SearchableDocumentationRecord,
  query: DocumentationSearchQuery,
  options: RankOptions = {},
): RankedDocumentationResult | null {
  if (!matchesFilterSet(record, query.filters)) {
    return null;
  }

  const reasons: DocumentationSearchReason[] = [];
  let relevanceScore = 0;

  if (query.normalizedQuery) {
    const queryLower = query.normalizedQuery.toLowerCase();
    const titleLower = record.title.toLowerCase();
    const summaryLower = (record.summary ?? "").toLowerCase();
    const contentLower = record.contentText.toLowerCase();
    const searchLower = record.searchText.toLowerCase();
    const metadataLower = record.metadataTags.map((tag) => `${tag.valueLabel} ${tag.valueKey}`.toLowerCase()).join(" ");
    const linkedSystemLower = record.linkedSystems
      .map((system) => `${system.systemName} ${system.relationshipLabel} ${system.systemId}`.toLowerCase())
      .join(" ");

    const titlePhraseMatch = titleLower.includes(queryLower);
    const contentPhraseMatch =
      summaryLower.includes(queryLower) || contentLower.includes(queryLower) || searchLower.includes(queryLower);
    const metadataPhraseMatch = metadataLower.includes(queryLower);
    const linkedSystemPhraseMatch = linkedSystemLower.includes(queryLower);

    const titleTokenHits = countTokenHits(titleLower, query.queryTokens);
    const contentTokenHits =
      countTokenHits(summaryLower, query.queryTokens) +
      countTokenHits(contentLower, query.queryTokens) +
      countTokenHits(searchLower, query.queryTokens);
    const metadataTokenHits = countTokenHits(metadataLower, query.queryTokens);
    const linkedSystemTokenHits = countTokenHits(linkedSystemLower, query.queryTokens);

    if (!titlePhraseMatch && !contentPhraseMatch && !metadataPhraseMatch && !linkedSystemPhraseMatch) {
      const totalTokenHits = titleTokenHits + contentTokenHits + metadataTokenHits + linkedSystemTokenHits;
      if (totalTokenHits === 0) {
        return null;
      }
    }

    if (titlePhraseMatch || titleTokenHits > 0) {
      relevanceScore += titlePhraseMatch ? 90 : 0;
      relevanceScore += titleTokenHits * 18;
      reasons.push({
        code: "title_match",
        label: "Title match",
        summary: "Search terms matched the document title.",
      });
    }

    if (contentPhraseMatch || contentTokenHits > 0) {
      relevanceScore += contentPhraseMatch ? 65 : 0;
      relevanceScore += contentTokenHits * 8;
      reasons.push({
        code: "content_match",
        label: "Content match",
        summary: "Search terms matched the document content.",
      });
    }

    if (metadataPhraseMatch || metadataTokenHits > 0) {
      relevanceScore += metadataPhraseMatch ? 28 : 0;
      relevanceScore += metadataTokenHits * 6;
      reasons.push({
        code: "metadata_match",
        label: "Metadata match",
        summary: "Structured metadata matched the current search.",
      });
    }

    if (linkedSystemPhraseMatch || linkedSystemTokenHits > 0) {
      relevanceScore += linkedSystemPhraseMatch ? 30 : 0;
      relevanceScore += linkedSystemTokenHits * 8;
      reasons.push({
        code: "system_match",
        label: "Linked system match",
        summary: "A linked system matched the current search.",
      });
    }
  }

  if (hasMetadataFilter(query.filters) && matchesMetadataFilters(record, query.filters)) {
    relevanceScore += 24;
    reasons.push({
      code: "metadata_match",
      label: "Metadata match",
      summary: "Structured metadata matched the active filters.",
    });
  }

  if (query.filters.systemId && record.linkedSystems.some((system) => system.systemId === query.filters.systemId)) {
    relevanceScore += 24;
    reasons.push({
      code: "system_match",
      label: "Linked system match",
      summary: "A linked system matched the active filters.",
    });
  }

  if (isReviewOverdue(record)) {
    relevanceScore += 12;
    reasons.push({
      code: "review_overdue",
      label: "Review overdue",
      summary: "Review due date has passed.",
    });
  }

  if (hasRecentChange(record)) {
    relevanceScore += 10;
    reasons.push({
      code: "recent_change",
      label: "Updated since last review",
      summary: "Content changed after the last review.",
    });
  }

  if (relevanceScore === 0) {
    relevanceScore = 1;
  }

  if (options.sqlScore && options.sqlScore > 0) {
    relevanceScore += options.sqlScore * 100;
  }

  return {
    matchedExcerpt: options.sqlExcerpt ?? buildMatchedExcerpt(record, query),
    reasons: dedupeReasons(reasons),
    relevanceScore: Number.parseFloat(relevanceScore.toFixed(3)),
  };
}

export function buildMatchedExcerpt(record: SearchableDocumentationRecord, query: DocumentationSearchQuery): string | null {
  if (!query.queryTokens.length) {
    return record.summary ?? record.contentText.slice(0, 180) ?? null;
  }

  const sourceText = record.contentText || record.summary || record.title;
  const sourceLower = sourceText.toLowerCase();
  const matchedToken = query.queryTokens.find((token) => sourceLower.includes(token));

  if (!matchedToken) {
    return record.summary ?? record.title;
  }

  const matchIndex = sourceLower.indexOf(matchedToken);
  const start = Math.max(matchIndex - 48, 0);
  const end = Math.min(matchIndex + 112, sourceText.length);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < sourceText.length ? "..." : "";

  return `${prefix}${sourceText.slice(start, end).trim()}${suffix}`;
}

export function collectDocumentationFacets(
  results: Array<{
    kind: DocumentKind;
    reviewState: DocumentReviewState;
    metadataTags: DocumentMetadataTag[];
    linkedSystems: DocumentLinkedSystem[];
  }>,
): DocumentationSearchFacets {
  const kinds = new Map<string, { label: string; count: number }>();
  const reviewStates = new Map<string, { label: string; count: number }>();
  const sites = new Map<string, { label: string; count: number }>();
  const owners = new Map<string, { label: string; count: number }>();
  const categories = new Map<string, { label: string; count: number }>();
  const systems = new Map<string, { label: string; count: number }>();

  for (const result of results) {
    incrementFacetCount(kinds, result.kind, result.kind);
    incrementFacetCount(reviewStates, result.reviewState, result.reviewState);

    for (const tag of result.metadataTags) {
      if (tag.dimension === "site") {
        incrementFacetCount(sites, tag.valueLabel, tag.valueLabel);
      }

      if (tag.dimension === "owner") {
        incrementFacetCount(owners, tag.valueLabel, tag.valueLabel);
      }

      if (tag.dimension === "category") {
        incrementFacetCount(categories, tag.valueLabel, tag.valueLabel);
      }
    }

    for (const system of result.linkedSystems) {
      incrementFacetCount(systems, system.systemId, system.systemName);
    }
  }

  return {
    kinds: mapFacetCounts(kinds),
    reviewStates: mapFacetCounts(reviewStates),
    sites: mapFacetCounts(sites),
    owners: mapFacetCounts(owners),
    categories: mapFacetCounts(categories),
    systems: mapFacetCounts(systems),
  };
}

export function getQueueReason(record: SearchableDocumentationRecord): DocumentationQueueReason | null {
  if (isReviewOverdue(record)) {
    return {
      code: "review_overdue",
      label: "Review overdue",
      summary: "Review due date has passed",
    };
  }

  if (hasMetadataGap(record)) {
    return {
      code: "metadata_incomplete",
      label: "Metadata incomplete",
      summary: "Document metadata is incomplete for operational search",
    };
  }

  if (hasRecentChange(record)) {
    return {
      code: "recent_change",
      label: "Updated since last review",
      summary: "Content changed after the last review",
    };
  }

  return null;
}

export function hasMetadataGap(record: SearchableDocumentationRecord): boolean {
  const dimensions = new Set(record.metadataTags.map((tag) => tag.dimension));
  return !dimensions.has("site") || !dimensions.has("owner") || !dimensions.has("category");
}

export function hasRecentChange(record: SearchableDocumentationRecord): boolean {
  if (!record.lastReviewedAt) {
    return record.reviewState === "unreviewed";
  }

  const lastReviewedAt = new Date(record.lastReviewedAt).valueOf();
  const updatedCandidates = [record.sourceUpdatedAt, record.contentUpdatedAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).valueOf());

  return updatedCandidates.some((value) => value > lastReviewedAt);
}

export function isReviewOverdue(record: SearchableDocumentationRecord): boolean {
  if (record.reviewState === "overdue") {
    return true;
  }

  if (!record.reviewDueAt) {
    return false;
  }

  return new Date(record.reviewDueAt).valueOf() < Date.now();
}

function matchesFilterSet(record: SearchableDocumentationRecord, filters: DocumentationSearchFilters): boolean {
  if (filters.kind && record.kind !== filters.kind) {
    return false;
  }

  if (filters.reviewState && record.reviewState !== filters.reviewState) {
    return false;
  }

  if (filters.category && !hasMetadataValue(record, "category", filters.category)) {
    return false;
  }

  if (filters.site && !hasMetadataValue(record, "site", filters.site)) {
    return false;
  }

  if (filters.owner && !hasMetadataValue(record, "owner", filters.owner)) {
    return false;
  }

  if (filters.systemId && !record.linkedSystems.some((system) => system.systemId === filters.systemId)) {
    return false;
  }

  if (filters.staleOnly && !isStaleRecord(record)) {
    return false;
  }

  return true;
}

function matchesMetadataFilters(record: SearchableDocumentationRecord, filters: DocumentationSearchFilters): boolean {
  if (filters.kind && record.kind !== filters.kind) {
    return false;
  }

  if (filters.reviewState && record.reviewState !== filters.reviewState) {
    return false;
  }

  if (filters.category && !hasMetadataValue(record, "category", filters.category)) {
    return false;
  }

  if (filters.site && !hasMetadataValue(record, "site", filters.site)) {
    return false;
  }

  if (filters.owner && !hasMetadataValue(record, "owner", filters.owner)) {
    return false;
  }

  return Boolean(filters.kind || filters.reviewState || filters.category || filters.site || filters.owner);
}

function hasMetadataFilter(filters: DocumentationSearchFilters): boolean {
  return Boolean(filters.kind || filters.reviewState || filters.category || filters.site || filters.owner);
}

function hasMetadataValue(
  record: SearchableDocumentationRecord,
  dimension: DocumentMetadataTag["dimension"],
  expectedValue: string,
): boolean {
  const normalizedExpectedValue = expectedValue.toLowerCase();

  return record.metadataTags.some(
    (tag) =>
      tag.dimension === dimension &&
      (tag.valueLabel.toLowerCase() === normalizedExpectedValue || tag.valueKey.toLowerCase() === normalizedExpectedValue),
  );
}

function isStaleRecord(record: SearchableDocumentationRecord): boolean {
  return isReviewOverdue(record) || hasRecentChange(record) || record.reviewState === "due_soon" || record.reviewState === "unreviewed";
}

function countTokenHits(text: string, tokens: string[]): number {
  return tokens.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
}

function dedupeReasons(reasons: DocumentationSearchReason[]): DocumentationSearchReason[] {
  const seenCodes = new Set<DocumentationSearchReason["code"]>();

  return reasons.filter((reason) => {
    if (seenCodes.has(reason.code)) {
      return false;
    }

    seenCodes.add(reason.code);
    return true;
  });
}

function normalizeFilterValue(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function incrementFacetCount(counts: FacetCountMap, value: string, label: string) {
  const existing = counts.get(value);

  if (existing) {
    existing.count += 1;
    return;
  }

  counts.set(value, { label, count: 1 });
}

function mapFacetCounts(counts: FacetCountMap) {
  return [...counts.entries()]
    .map(([value, facet]) => ({
      value,
      label: facet.label,
      count: facet.count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}
