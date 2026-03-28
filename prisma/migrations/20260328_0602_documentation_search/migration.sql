-- Weighted documentation search index for repository queries that use
-- websearch_to_tsquery('english', ...) and ts_rank_cd against the same vector.
CREATE INDEX IF NOT EXISTS document_search_vector_idx
ON "Document"
USING GIN (
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("summary", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("contentText", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("searchText", '')), 'B')
);
