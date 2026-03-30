-- Enable pgvector extension for vector similarity search (RAG pipeline, Phase 15)
CREATE EXTENSION IF NOT EXISTS vector;

-- DocumentEmbedding table: stores per-chunk text embeddings for RAG search.
-- embedding is vector(1536) matching text-embedding-3-small dimension.
-- documentId cascades on delete so embeddings are removed with their parent document.
CREATE TABLE "DocumentEmbedding" (
  "id"         TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "chunkText"  TEXT NOT NULL,
  "embedding"  vector(1536),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocumentEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentEmbedding_documentId_idx" ON "DocumentEmbedding"("documentId");

-- HNSW index for approximate nearest-neighbor cosine similarity search
CREATE INDEX "DocumentEmbedding_embedding_idx" ON "DocumentEmbedding" USING hnsw (embedding vector_cosine_ops);

-- Foreign key constraint to Document
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
