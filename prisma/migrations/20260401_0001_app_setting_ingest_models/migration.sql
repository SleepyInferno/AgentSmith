-- Migration: 20260401_0001_app_setting_ingest_models
-- Adds AppSetting, IngestRun, and IngestFile tables for the document ingest pipeline
-- Also adds DocumentEmbedding table for pgvector embeddings (Phase 10 infrastructure)

-- AppSetting: generic key-value store for application configuration
CREATE TABLE "AppSetting" (
    "key"       TEXT        NOT NULL,
    "value"     TEXT        NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- IngestRun: tracks each document ingest run (triggered by watcher or manually)
CREATE TABLE "IngestRun" (
    "id"          TEXT        NOT NULL,
    "triggeredBy" TEXT        NOT NULL,
    "status"      TEXT        NOT NULL DEFAULT 'running',
    "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "fileCount"   INTEGER     NOT NULL DEFAULT 0,
    "doneCount"   INTEGER     NOT NULL DEFAULT 0,
    "failedCount" INTEGER     NOT NULL DEFAULT 0,

    CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
);

-- IngestFile: per-file ingest tracking linked to a run and optionally to a Document
CREATE TABLE "IngestFile" (
    "id"           TEXT        NOT NULL,
    "filePath"     TEXT        NOT NULL,
    "fileHash"     TEXT        NOT NULL,
    "status"       TEXT        NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "documentId"   TEXT,
    "runId"        TEXT        NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestFile_fileHash_idx" ON "IngestFile"("fileHash");
CREATE INDEX "IngestFile_runId_idx" ON "IngestFile"("runId");

ALTER TABLE "IngestFile"
    ADD CONSTRAINT "IngestFile_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IngestFile"
    ADD CONSTRAINT "IngestFile_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "IngestRun"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- DocumentEmbedding: pgvector embeddings for document chunks (Phase 10 infrastructure)
CREATE TABLE "DocumentEmbedding" (
    "id"         TEXT        NOT NULL,
    "documentId" TEXT        NOT NULL,
    "chunkIndex" INTEGER     NOT NULL,
    "chunkText"  TEXT        NOT NULL,
    "embedding"  vector(1536),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentEmbedding_documentId_idx" ON "DocumentEmbedding"("documentId");

ALTER TABLE "DocumentEmbedding"
    ADD CONSTRAINT "DocumentEmbedding_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
