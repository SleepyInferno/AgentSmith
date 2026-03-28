import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type {
  BackupConfidenceState,
  BackupCoverageState,
  BackupDataMode,
  BackupFindingItem,
  BackupInventoryFilters,
  BackupInventoryRow,
  BackupOverview,
  BackupSourceHealth,
  BackupSystemDetail,
} from "../modules/backup/backup.types.js";
import { buildServer } from "../server.js";

const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  ENTRA_TENANT_ID: "tenant-id",
  ENTRA_CLIENT_ID: "client-id",
  ENTRA_CLIENT_SECRET: "client-secret",
  ENTRA_REDIRECT_URI: "http://localhost:3001/auth/callback",
  SESSION_SECRET: "session-secret",
};

function makeSourceHealth(
  dataMode: BackupDataMode,
  overrides: Partial<BackupSourceHealth> = {},
): BackupSourceHealth {
  return {
    providerKey: "veeam",
    providerLabel: "Veeam",
    connectorFreshnessState: "unknown",
    lastObservedAt: null,
    systemsObserved: 2,
    workloadsObserved: 1,
    summary: "Backup telemetry is unavailable from the configured provider",
    dataMode,
    ...overrides,
  };
}

function makeFindingItem(
  dataMode: BackupDataMode,
  overrides: Partial<BackupFindingItem> = {},
): BackupFindingItem {
  return {
    findingId: "finding-sharepoint-restore-proof",
    systemId: "sys-sharepoint-tenant",
    systemName: "Microsoft 365 Collaboration",
    category: "m365",
    siteName: null,
    ownerTeam: "Productivity",
    criticality: "tier_1",
    coverageMode: "required",
    coverageState: "partial",
    confidenceState: "high_risk",
    providerKey: "m365_backup",
    workloadKind: "m365_sharepoint",
    backupFreshnessState: "current",
    restoreFreshnessState: "stale",
    summary: "Backup is recent but restore proof is stale",
    suggestedNextStep: "Schedule a restore test",
    queueRank: 1,
    lastSuccessfulBackupAt: "2026-03-27T03:10:00.000Z",
    lastRestoreTestedAt: "2025-12-15T15:00:00.000Z",
    dataMode,
    ...overrides,
  };
}

function makeInventoryRow(
  dataMode: BackupDataMode,
  overrides: Partial<BackupInventoryRow> = {},
): BackupInventoryRow {
  return {
    systemId: "sys-helpdesk-files",
    systemName: "Helpdesk Files",
    sourceSystem: dataMode,
    sourceId: "sys-helpdesk-files",
    category: "file_service",
    siteName: "HQ",
    ownerTeam: "Service Desk",
    criticality: "tier_1",
    coverageMode: "required",
    coverageState: "protected",
    confidenceState: "high_risk",
    providerKey: "veeam",
    workloadKind: "server",
    backupFreshnessState: "stale",
    restoreFreshnessState: "current",
    lastSuccessfulBackupAt: "2026-03-24T00:30:00.000Z",
    lastRestoreTestedAt: "2026-03-20T11:00:00.000Z",
    restoreEvidenceSource: "provider_sync",
    summary: "backup evidence is stale",
    suggestedNextStep: "Review the last successful backup job",
    dataMode,
    ...overrides,
  };
}

function makeOverview(dataMode: BackupDataMode): BackupOverview {
  return {
    dataMode,
    generatedAt: "2026-03-27T04:00:00.000Z",
    summary: "6 protected systems in scope; 3 require immediate review and 1 has unknown telemetry.",
    cards: [
      {
        key: "high_risk",
        label: "High risk",
        value: 3,
        tone: "high_risk",
        summary: "Systems require backup or restore-proof intervention.",
      },
    ],
    findings: [makeFindingItem(dataMode)],
    sourceHealth: [
      makeSourceHealth(dataMode),
      makeSourceHealth(dataMode, {
        providerKey: "m365_backup",
        providerLabel: "Microsoft 365 Backup",
        connectorFreshnessState: "current",
        lastObservedAt: "2026-03-27T03:20:00.000Z",
        systemsObserved: 1,
        workloadsObserved: 2,
        summary: "Backup telemetry is current for this provider",
      }),
    ],
  };
}

function makeDetail(dataMode: BackupDataMode): BackupSystemDetail {
  return {
    dataMode,
    system: makeInventoryRow(dataMode, {
      systemId: "sys-sharepoint-tenant",
      systemName: "Microsoft 365 Collaboration",
      category: "m365",
      providerKey: "m365_backup",
      workloadKind: "m365_sharepoint",
      coverageState: "partial",
      confidenceState: "high_risk",
      backupFreshnessState: "current",
      restoreFreshnessState: "stale",
      lastSuccessfulBackupAt: "2026-03-27T03:10:00.000Z",
      lastRestoreTestedAt: "2025-12-15T15:00:00.000Z",
      summary: "Backup is recent but restore proof is stale",
      suggestedNextStep: "Schedule a restore test",
    }),
    scopeSummary: "Microsoft 365 Backup (m365_exchange, m365_sharepoint). Policy window: 24h backup freshness, 30d restore proof, 6h grace window.",
    suggestedNextStep: "Schedule a restore test",
    sourceHealth: [
      makeSourceHealth(dataMode, {
        providerKey: "m365_backup",
        providerLabel: "Microsoft 365 Backup",
        connectorFreshnessState: "current",
        lastObservedAt: "2026-03-27T03:20:00.000Z",
        systemsObserved: 1,
        workloadsObserved: 2,
        summary: "Backup telemetry is current for this provider",
      }),
    ],
    providerEvidence: [
      {
        evidenceId: "evidence-sharepoint-sites",
        providerKey: "m365_backup",
        workloadKind: "m365_sharepoint",
        sourceSystem: "m365_backup",
        sourceId: "m365-backup-sharepoint",
        coverageState: "partial",
        backupFreshnessState: "current",
        connectorFreshnessState: "current",
        confidenceState: "high_risk",
        lastSuccessfulBackupAt: "2026-03-27T03:10:00.000Z",
        lastFailedBackupAt: "2026-03-24T01:02:00.000Z",
        lastObservedAt: "2026-03-27T03:20:00.000Z",
        summary: "Backup is recent but restore proof is stale",
        metadata: { protectedSiteCount: 18 },
      },
    ],
    restoreProofs: [
      {
        restoreTestId: "restore-sharepoint-sites",
        backupEvidenceId: "evidence-sharepoint-sites",
        evidenceSource: "provider_sync",
        outcome: "success",
        testedAt: "2025-12-15T15:00:00.000Z",
        recoveryPointAt: "2025-12-15T03:10:00.000Z",
        ticketRef: "BACK-0822",
        notes: "Last successful SharePoint restore drill predates the current policy window.",
        metadata: null,
      },
    ],
  };
}

function makeRepository(dataMode: BackupDataMode = "seeded_example") {
  const overview = makeOverview(dataMode);
  const findings = [
    makeFindingItem(dataMode),
    makeFindingItem(dataMode, {
      findingId: "finding-telemetry-unknown",
      systemId: "sys-branch-nas",
      systemName: "Branch NAS",
      category: "storage",
      confidenceState: "unknown",
      coverageState: "unknown",
      providerKey: "veeam",
      summary: "Backup telemetry is unavailable from the configured provider",
      suggestedNextStep: "Investigate provider telemetry freshness",
      lastSuccessfulBackupAt: null,
      lastRestoreTestedAt: "2026-03-18T13:15:00.000Z",
    }),
  ];
  const inventory = [
    makeInventoryRow(dataMode),
    makeInventoryRow(dataMode, {
      systemId: "sys-branch-nas",
      systemName: "Branch NAS",
      category: "storage",
      coverageState: "unknown",
      confidenceState: "unknown",
      providerKey: "veeam",
      summary: "Backup telemetry is unavailable from the configured provider",
      suggestedNextStep: "Investigate provider telemetry freshness",
      backupFreshnessState: "unknown",
      lastSuccessfulBackupAt: null,
    }),
  ];
  let lastLimit: number | null = null;
  let lastFilters: BackupInventoryFilters | undefined;

  return {
    repository: {
      async getOverview() {
        return overview;
      },
      async listFindings(limit = 10) {
        lastLimit = limit;
        return findings.slice(0, limit);
      },
      async listInventory(filters: BackupInventoryFilters = {}) {
        lastFilters = filters;
        return inventory.filter((row) => {
          if (filters.search && ![row.systemName, row.category, row.siteName].some((value) => value?.includes(filters.search!))) {
            return false;
          }
          if (filters.confidenceState && row.confidenceState !== filters.confidenceState) {
            return false;
          }
          if (filters.coverageState && row.coverageState !== filters.coverageState) {
            return false;
          }
          if (filters.providerKey && row.providerKey !== filters.providerKey) {
            return false;
          }
          if (filters.siteName && row.siteName !== filters.siteName) {
            return false;
          }
          if (filters.category && row.category !== filters.category) {
            return false;
          }
          if (filters.staleOnly && row.backupFreshnessState !== "stale" && row.restoreFreshnessState !== "stale") {
            return false;
          }
          return true;
        });
      },
      async getSystemDetail(systemId: string) {
        return systemId === "sys-sharepoint-tenant" ? makeDetail(dataMode) : null;
      },
    },
    getLastLimit() {
      return lastLimit;
    },
    getLastFilters() {
      return lastFilters;
    },
  };
}

test("GET /api/backup/overview returns seeded_example disclosure, source health, and read-only context", async (t) => {
  const backup = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    backupRoutes: {
      backupRepository: backup.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/backup/overview",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    isReadOnly: boolean;
    sourceHealth: Array<{ summary: string }>;
  };

  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.isReadOnly, true);
  assert.equal(
    body.sourceHealth.some((source) => source.summary === "Backup telemetry is unavailable from the configured provider"),
    true,
  );
});

test("GET /api/backup/findings returns ranked finding rows with sourceHealth and read-only flags", async (t) => {
  const backup = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    backupRoutes: {
      backupRepository: backup.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/backup/findings?limit=1",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    items: Array<{
      systemId: string;
      summary: string;
      suggestedNextStep: string;
      isReadOnly: boolean;
      sourceHealth: { providerLabel: string } | null;
    }>;
  };

  assert.equal(backup.getLastLimit(), 1);
  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.items[0]?.systemId, "sys-sharepoint-tenant");
  assert.equal(body.items[0]?.summary, "Backup is recent but restore proof is stale");
  assert.equal(body.items[0]?.suggestedNextStep, "Schedule a restore test");
  assert.equal(body.items[0]?.isReadOnly, true);
  assert.equal(body.items[0]?.sourceHealth?.providerLabel, "Microsoft 365 Backup");
});

test("GET /api/backup/systems parses server-driven filters and returns inventory rows", async (t) => {
  const backup = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    backupRoutes: {
      backupRepository: backup.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/backup/systems?search=Helpdesk&confidenceState=high_risk&coverageState=protected&providerKey=veeam&siteName=HQ&category=file_service&staleOnly=true",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    items: Array<{
      systemId: string;
      confidenceState: BackupConfidenceState;
      coverageState: BackupCoverageState;
      sourceHealth: { state: string } | null;
      isReadOnly: boolean;
    }>;
  };

  assert.deepEqual(backup.getLastFilters(), {
    search: "Helpdesk",
    confidenceState: "high_risk",
    coverageState: "protected",
    providerKey: "veeam",
    siteName: "HQ",
    category: "file_service",
    staleOnly: true,
  });
  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.items[0]?.systemId, "sys-helpdesk-files");
  assert.equal(body.items[0]?.confidenceState, "high_risk");
  assert.equal(body.items[0]?.coverageState, "protected");
  assert.equal(body.items[0]?.sourceHealth?.state, "unknown");
  assert.equal(body.items[0]?.isReadOnly, true);
});

test("GET /api/backup/systems/:systemId returns detail fields and 404 for missing systems", async (t) => {
  const backup = makeRepository("live");
  const { app } = buildServer({
    env: testEnv,
    backupRoutes: {
      backupRepository: backup.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const detailResponse = await app.inject({
    method: "GET",
    url: "/api/backup/systems/sys-sharepoint-tenant",
  });

  assert.equal(detailResponse.statusCode, 200);
  const detailBody = detailResponse.json() as {
    dataMode: string;
    systemId: string;
    summary: string;
    suggestedNextStep: string;
    sourceHealth: Array<{ state: string }>;
    isReadOnly: boolean;
  };

  assert.equal(detailBody.dataMode, "live");
  assert.equal(detailBody.systemId, "sys-sharepoint-tenant");
  assert.equal(detailBody.summary, "Backup is recent but restore proof is stale");
  assert.equal(detailBody.suggestedNextStep, "Schedule a restore test");
  assert.equal(detailBody.sourceHealth[0]?.state, "current");
  assert.equal(detailBody.isReadOnly, true);

  const missingResponse = await app.inject({
    method: "GET",
    url: "/api/backup/systems/missing-system",
  });

  assert.equal(missingResponse.statusCode, 404);
  assert.deepEqual(missingResponse.json(), {
    message: "Backup system not found",
  });
});
