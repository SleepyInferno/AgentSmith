import chokidar, { type FSWatcher } from 'chokidar';
import { isSupportedFile } from './ingest.parsers.js';
import { enqueueFile } from './ingest.queue.js';
import type { IngestDeps } from './ingest.service.js';

/** Module-level singleton watcher */
let _watcher: FSWatcher | null = null;

/**
 * Initialize the file watcher if the source folder is configured.
 * Reads the configured source folder from the DB and starts watching it.
 * No-op if the source folder setting is missing.
 */
export async function initWatcher(deps: IngestDeps): Promise<void> {
  const setting = await deps.prisma.appSetting.findUnique({
    where: { key: 'ingest.sourceFolder' },
  });
  if (!setting?.value) return;
  await startWatcher(setting.value, deps);
}

/**
 * Restart the watcher with a new source folder path.
 * Marks any in-flight runs as failed, closes the existing watcher, and starts fresh.
 */
export async function restartWatcher(newPath: string, deps: IngestDeps): Promise<void> {
  // Mark any in-flight runs as failed (RESEARCH Pitfall 3)
  await deps.prisma.ingestRun.updateMany({
    where: { status: 'running' },
    data: { status: 'failed', completedAt: new Date() },
  });

  if (_watcher) {
    await _watcher.close();
    _watcher = null;
  }

  await startWatcher(newPath, deps);
}

/**
 * Close the watcher and clean up the singleton.
 * Should be called in the server onClose hook.
 */
export async function closeWatcher(): Promise<void> {
  if (_watcher) {
    await _watcher.close();
    _watcher = null;
  }
}

async function startWatcher(sourcePath: string, deps: IngestDeps): Promise<void> {
  // Create a watch-triggered run for this session
  const run = await deps.prisma.ingestRun.create({
    data: { triggeredBy: 'watch', status: 'running', fileCount: 0 },
  });

  _watcher = chokidar.watch(sourcePath, {
    persistent: true,
    ignoreInitial: false, // D-06: fire 'add' for pre-existing files on startup
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  _watcher
    .on('add', (filePath) => {
      if (isSupportedFile(filePath)) {
        enqueueFile(filePath, run.id, deps);
      }
    })
    .on('change', (filePath) => {
      if (isSupportedFile(filePath)) {
        enqueueFile(filePath, run.id, deps);
      }
    })
    .on('error', (err) => {
      console.error('[ingest-watcher] Error:', (err as Error).message);
    });
}
