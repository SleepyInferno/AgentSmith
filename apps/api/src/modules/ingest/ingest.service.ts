import { createHash } from 'node:crypto';
import { readFile, copyFile, mkdir } from 'node:fs/promises';
import { basename, join, resolve as resolvePath } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { decryptCredential } from '../../lib/credential-crypto.js';
import { parseFile } from './ingest.parsers.js';
import { chunkText } from './ingest.chunker.js';
import type { ClassifyResult } from './ingest.types.js';

export type IngestDeps = {
  prisma: PrismaClient;
  systemKey: Buffer;
};

const VALID_KINDS = new Set([
  'sop',
  'vendor_note',
  'contact',
  'infrastructure_note',
  'recovery_procedure',
]);

/**
 * Process a single file through the full ingest pipeline:
 * parse → classify → embed → upsert Document → copy to output folder.
 *
 * Errors are caught and recorded on the IngestFile row; they do not propagate.
 */
export async function runIngestFile(
  filePath: string,
  runId: string,
  deps: IngestDeps
): Promise<void> {
  const absolutePath = resolvePath(filePath);

  // Step 1: Compute SHA-256 hash of the file
  let fileHash: string;
  try {
    const fileData = await readFile(absolutePath);
    fileHash = createHash('sha256').update(fileData).digest('hex');
  } catch (err) {
    // File unreadable — record failure without creating an IngestFile row
    // (we can't create one without a valid hash)
    console.error(`[ingest] Cannot read file ${absolutePath}:`, (err as Error).message);
    await deps.prisma.ingestRun.update({
      where: { id: runId },
      data: { failedCount: { increment: 1 } },
    });
    return;
  }

  // Step 2: Hash dedup — skip if already done with same hash
  const existingDone = await deps.prisma.ingestFile.findFirst({
    where: { filePath: absolutePath, fileHash, status: 'done' },
  });
  if (existingDone) {
    return;
  }

  // Check if there is an existing record with a different hash (re-ingest case)
  const existingAny = await deps.prisma.ingestFile.findFirst({
    where: { filePath: absolutePath },
    orderBy: { createdAt: 'desc' },
  });
  const existingDocId = existingAny?.documentId ?? null;

  // Step 3: Create IngestFile row with status "processing"
  const ingestFileRow = await deps.prisma.ingestFile.create({
    data: {
      filePath: absolutePath,
      fileHash,
      status: 'processing',
      runId,
    },
  });

  try {
    // Step 4: Check OpenAI credential
    const credRow = await deps.prisma.integrationCredential.findUnique({
      where: { key: 'openai' },
    });
    if (!credRow) {
      await deps.prisma.ingestFile.update({
        where: { id: ingestFileRow.id },
        data: { status: 'failed', errorMessage: 'OpenAI not configured' },
      });
      await deps.prisma.ingestRun.update({
        where: { id: runId },
        data: { failedCount: { increment: 1 } },
      });
      return;
    }

    // Step 5: Decrypt API key
    const decrypted = decryptCredential(
      deps.systemKey,
      credRow.encryptedValue,
      credRow.iv,
      credRow.authTag
    );
    const { apiKey, model } = JSON.parse(decrypted) as { apiKey: string; model: string };

    const openai = new OpenAI({ apiKey });

    // Step 6: Parse file
    const parsed = await parseFile(absolutePath);

    // Step 7: Classify via OpenAI structured output
    const contentPreview = parsed.text.slice(0, 20000); // ~4000 tokens at ~5 chars/token
    const classifySchema = {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['sop', 'vendor_note', 'contact', 'infrastructure_note', 'recovery_procedure'],
        },
        title: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['kind', 'title', 'summary'],
      additionalProperties: false,
    };

    let classifyResult: ClassifyResult | null = null;

    try {
      const completion = await openai.chat.completions.create({
        model,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'document_classification',
            strict: true,
            schema: classifySchema,
          },
        } as Parameters<typeof openai.chat.completions.create>[0]['response_format'],
        messages: [
          {
            role: 'system',
            content:
              'You are a document classifier for an IT operations system. Classify the document into exactly one kind. Extract a concise title and 2-3 sentence summary.',
          },
          {
            role: 'user',
            content: `File: ${basename(absolutePath)}\n\nContent (first 4000 tokens):\n${contentPreview}`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? '{}';
      classifyResult = JSON.parse(raw) as ClassifyResult;
    } catch {
      // Retry with json_object if structured output fails (older models)
      const completion = await openai.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a document classifier for an IT operations system. Respond with JSON containing: kind (one of: sop, vendor_note, contact, infrastructure_note, recovery_procedure), title (string), summary (string).',
          },
          {
            role: 'user',
            content: `File: ${basename(absolutePath)}\n\nContent (first 4000 tokens):\n${contentPreview}`,
          },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? '{}';
      classifyResult = JSON.parse(raw) as ClassifyResult;
    }

    // Validate kind, default to infrastructure_note if unknown
    const kind = VALID_KINDS.has(classifyResult?.kind ?? '')
      ? (classifyResult!.kind as ClassifyResult['kind'])
      : 'infrastructure_note';
    const title = classifyResult?.title ?? basename(absolutePath);
    const summary = classifyResult?.summary ?? '';

    // Step 8: Upsert Document
    const doc = await deps.prisma.document.upsert({
      where: {
        sourceSystem_sourceId: {
          sourceSystem: 'ingest',
          sourceId: absolutePath,
        },
      },
      create: {
        sourceSystem: 'ingest',
        sourceId: absolutePath,
        title,
        kind,
        summary,
        contentText: parsed.text,
        sourceUpdatedAt: new Date(),
        contentUpdatedAt: new Date(),
      },
      update: {
        title,
        kind,
        summary,
        contentText: parsed.text,
        sourceUpdatedAt: new Date(),
        contentUpdatedAt: new Date(),
      },
    });

    // Step 9: Delete stale embeddings
    await deps.prisma.documentEmbedding.deleteMany({
      where: { documentId: doc.id },
    });

    // Step 10: Chunk text and create embeddings
    const chunks = chunkText(parsed.text);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: chunk,
      });
      const vector = embeddingResponse.data[0].embedding;
      const vectorString = `[${vector.join(',')}]`;
      const embeddingId = randomUUID();

      await deps.prisma.$executeRaw`
        INSERT INTO "DocumentEmbedding" ("id", "documentId", "chunkIndex", "chunkText", "embedding", "createdAt")
        VALUES (${embeddingId}, ${doc.id}, ${i}, ${chunk}, ${vectorString}::vector, NOW())
      `;
    }

    // Step 11: Copy file to output folder
    const outputSettingRow = await deps.prisma.appSetting.findUnique({
      where: { key: 'ingest.outputFolder' },
    });
    if (outputSettingRow?.value) {
      const destDir = join(outputSettingRow.value, kind);
      await mkdir(destDir, { recursive: true });
      await copyFile(absolutePath, join(destDir, basename(absolutePath)));
    }

    // Step 12: Mark IngestFile as done
    await deps.prisma.ingestFile.update({
      where: { id: ingestFileRow.id },
      data: { status: 'done', documentId: doc.id },
    });
    await deps.prisma.ingestRun.update({
      where: { id: runId },
      data: { doneCount: { increment: 1 } },
    });

    // If this was a re-ingest (different hash), existingDocId was the old one
    // The upsert already updated it, so no extra cleanup needed.
    void existingDocId;
  } catch (err) {
    // Step 13: Error handling — record failure
    const errorMessage = (err as Error).message ?? 'Unknown error';
    try {
      await deps.prisma.ingestFile.update({
        where: { id: ingestFileRow.id },
        data: { status: 'failed', errorMessage },
      });
      await deps.prisma.ingestRun.update({
        where: { id: runId },
        data: { failedCount: { increment: 1 } },
      });
    } catch {
      // Best-effort status update
    }
  }
}
