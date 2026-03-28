CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS document_title_trgm_idx
ON "Document"
USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS document_search_text_trgm_idx
ON "Document"
USING GIN ("searchText" gin_trgm_ops);
