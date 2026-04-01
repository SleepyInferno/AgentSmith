import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import type { AgentSmithAuthService, OperatorSession } from '../../plugins/auth.js';
import { registerIngestRoutes } from '../ingest.js';

// ── test constants ────────────────────────────────────────────────────────────
const TEST_RUN_ID = 'run-test-ingest-1';
const TEST_KEY = Buffer.alloc(32);

const operatorSession: OperatorSession = {
  sessionId: 'session-ingest-1',
  user: {
    id: 'user-ingest-1',
    email: 'admin@agentsmith.local',
    displayName: 'admin',
  },
  expiresAt: '2028-01-01T00:00:00.000Z',
};

function buildAuthService(authenticated: boolean): Pick<AgentSmithAuthService, 'getSession'> {
  return {
    async getSession() {
      return authenticated ? operatorSession : null;
    },
  };
}

type IngestRunRow = {
  id: string;
  triggeredBy: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  fileCount: number;
  doneCount: number;
  failedCount: number;
  files: IngestFileRow[];
};

type IngestFileRow = {
  id: string;
  filePath: string;
  fileHash: string;
  status: string;
  errorMessage: string | null;
  documentId: string | null;
  runId: string;
  createdAt: Date;
  updatedAt: Date;
};

function makeRun(overrides: Partial<IngestRunRow> = {}): IngestRunRow {
  return {
    id: TEST_RUN_ID,
    triggeredBy: 'manual',
    status: 'done',
    startedAt: new Date('2026-04-01T12:00:00Z'),
    completedAt: new Date('2026-04-01T12:01:00Z'),
    fileCount: 2,
    doneCount: 2,
    failedCount: 0,
    files: [],
    ...overrides,
  };
}

function makeFile(overrides: Partial<IngestFileRow> = {}): IngestFileRow {
  return {
    id: 'file-1',
    filePath: '/docs/test.md',
    fileHash: 'abc123',
    status: 'done',
    errorMessage: null,
    documentId: 'doc-1',
    runId: TEST_RUN_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Build a test Fastify instance with ingest routes registered
function buildApp(opts: {
  authenticated?: boolean;
  findFirstRunResult?: IngestRunRow | null;
  triggerManualIngest?: () => Promise<string>;
}): FastifyInstance {
  const {
    authenticated = true,
    findFirstRunResult = null,
    triggerManualIngest,
  } = opts;

  const mockPrisma = {
    ingestRun: {
      findFirst: async (_args: unknown) => findFirstRunResult,
    },
    ingestFile: {},
    appSetting: {},
    integrationCredential: {},
  };

  const app = Fastify({ logger: false });
  void app.register(registerIngestRoutes, {
    prisma: mockPrisma as Parameters<typeof registerIngestRoutes>[1]['prisma'],
    authService: buildAuthService(authenticated),
    systemKey: TEST_KEY,
    triggerManualIngest: triggerManualIngest ?? (async () => TEST_RUN_ID),
  });

  return app;
}

// ── POST /api/ingest/run ──────────────────────────────────────────────────────
describe('POST /api/ingest/run', () => {
  it('returns { runId } with 200 when authenticated', async () => {
    const app = buildApp({
      authenticated: true,
      triggerManualIngest: async () => TEST_RUN_ID,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/run',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { runId: string };
    assert.equal(body.runId, TEST_RUN_ID);
  });

  it('returns 401 without session', async () => {
    const app = buildApp({ authenticated: false });
    const res = await app.inject({
      method: 'POST',
      url: '/api/ingest/run',
    });
    assert.equal(res.statusCode, 401);
  });
});

// ── GET /api/ingest/status ────────────────────────────────────────────────────
describe('GET /api/ingest/status', () => {
  it('returns { run: null } when no IngestRun rows exist', async () => {
    const app = buildApp({ findFirstRunResult: null });
    const res = await app.inject({
      method: 'GET',
      url: '/api/ingest/status',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { run: null };
    assert.equal(body.run, null);
  });

  it('returns latest IngestRun with files array', async () => {
    const run = makeRun({ files: [makeFile()] });
    const app = buildApp({ findFirstRunResult: run });
    const res = await app.inject({
      method: 'GET',
      url: '/api/ingest/status',
    });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body) as { run: IngestRunRow };
    assert.equal(body.run?.id, TEST_RUN_ID);
    assert.equal(body.run?.files?.length, 1);
    assert.equal(body.run?.status, 'done');
  });

  it('returns 401 without session', async () => {
    const app = buildApp({ authenticated: false });
    const res = await app.inject({
      method: 'GET',
      url: '/api/ingest/status',
    });
    assert.equal(res.statusCode, 401);
  });
});
