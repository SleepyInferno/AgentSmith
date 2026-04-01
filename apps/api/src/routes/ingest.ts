import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { AgentSmithAuthService } from '../plugins/auth.js';
import { runManualIngest, type IngestDeps } from '../modules/ingest/ingest.queue.js';

export type IngestRoutesDependencies = {
  prisma: Pick<
    PrismaClient,
    'ingestRun' | 'ingestFile' | 'appSetting' | 'integrationCredential'
  >;
  authService: Pick<AgentSmithAuthService, 'getSession'>;
  systemKey: Buffer;
  /**
   * Override for testing — inject a mock manual ingest trigger.
   * Defaults to the real runManualIngest from ingest.queue.
   */
  triggerManualIngest?: (deps: IngestDeps) => Promise<string>;
};

type IngestRoutesOptions = FastifyPluginOptions & IngestRoutesDependencies;

/**
 * Register ingest API routes:
 * - POST /api/ingest/run  — trigger a manual ingest, returns { runId }
 * - GET  /api/ingest/status — returns latest IngestRun with IngestFile array
 */
export async function registerIngestRoutes(
  app: FastifyInstance,
  options: IngestRoutesOptions
): Promise<void> {
  const requireAuth: preHandlerHookHandler = async (request, reply) => {
    const session = await options.authService.getSession(request);
    if (!session) {
      reply.code(401);
      return reply.send({ message: 'Authentication required' });
    }
  };

  const ingestDeps: IngestDeps = {
    prisma: options.prisma as PrismaClient,
    systemKey: options.systemKey,
  };

  const triggerManualIngest = options.triggerManualIngest ?? runManualIngest;

  // POST /api/ingest/run — trigger manual ingest, returns runId immediately
  app.post('/api/ingest/run', { preHandler: [requireAuth] }, async (_request, _reply) => {
    const runId = await triggerManualIngest(ingestDeps);
    return { runId };
  });

  // GET /api/ingest/status — return latest IngestRun with files
  app.get('/api/ingest/status', { preHandler: [requireAuth] }, async (_request, _reply) => {
    const latestRun = await options.prisma.ingestRun.findFirst({
      orderBy: { startedAt: 'desc' },
      include: { files: true },
    });
    return { run: latestRun ?? null };
  });
}
