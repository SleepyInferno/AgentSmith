import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isSupportedFile } from './ingest.parsers.js';
import { runIngestFile, type IngestDeps } from './ingest.service.js';

/**
 * Module-level sequential promise queue.
 * All file processing is chained onto this so it never runs in the HTTP path.
 */
let _queue: Promise<void> = Promise.resolve();

/**
 * Enqueue a single file for processing.
 * Returns immediately — processing happens off the HTTP path.
 */
export function enqueueFile(filePath: string, runId: string, deps: IngestDeps): void {
  _queue = _queue.then(() => runIngestFile(filePath, runId, deps)).catch(() => {});
}

/**
 * Trigger a manual ingest of all supported files in the configured source folder.
 * Returns the runId immediately; processing continues in the background queue.
 */
export async function runManualIngest(deps: IngestDeps): Promise<string> {
  const sourceFolder = await deps.prisma.appSetting.findUnique({
    where: { key: 'ingest.sourceFolder' },
  });
  if (!sourceFolder?.value) {
    throw new Error('Source folder not configured');
  }

  const run = await deps.prisma.ingestRun.create({
    data: { triggeredBy: 'manual', status: 'running', fileCount: 0 },
  });

  // Scan source folder for supported files
  const entries = await readdir(sourceFolder.value, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && isSupportedFile(e.name))
    .map((e) => join(sourceFolder.value, e.name));

  await deps.prisma.ingestRun.update({
    where: { id: run.id },
    data: { fileCount: files.length },
  });

  // Process all files sequentially, then finalize run status
  const processAll = async () => {
    for (const file of files) {
      await runIngestFile(file, run.id, deps);
    }
    // Finalize run
    const updatedRun = await deps.prisma.ingestRun.findUnique({ where: { id: run.id } });
    await deps.prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status:
          (updatedRun?.failedCount ?? 0) > 0 && (updatedRun?.doneCount ?? 0) === 0
            ? 'failed'
            : 'done',
        completedAt: new Date(),
      },
    });
  };

  // Fire and forget — never in HTTP path
  _queue = _queue.then(processAll).catch(() => {});

  return run.id;
}

/**
 * Create a watch-triggered IngestRun and return its ID.
 * Used by the watcher to associate file events with a run.
 */
export async function createWatchRun(deps: IngestDeps): Promise<string> {
  const run = await deps.prisma.ingestRun.create({
    data: { triggeredBy: 'watch', status: 'running', fileCount: 0 },
  });
  return run.id;
}
