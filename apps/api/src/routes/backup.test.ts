import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type {
  BackupConfidenceState,
  BackupCoverageState,
  BackupDataMode,
  BackupEvidenceSource,
  BackupFindingItem,
  BackupInventoryFilters,
  BackupInventoryRow,
  BackupMatchingConfidence,
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
  const state = overrides.state ?? "error";
  const connectorFreshnessState =
    overrides.connectorFreshnessState ??
    (state === "current" ? "current" : state === "stale" ? "stale" : "unknown");
  const summary =
    overrides.summary ??
    (state === "current"
      ? "Backup telemetry is current for this provider"
      : state === "stale"
        ? "Backup telemetry is stale or incomplete"
        : state === "missing"
          ? "No backup telemetry has been observed for this provider yet"
          : state === "error"
            ? "Backup provider outage or connector failure requires investigation"
            : "Backup telemetry is unavailable from the configured provider");

  return {
    providerKey: "veeam",
    providerLabel: "Veeam",
    state,
    connectorFreshnessState,
    lastObservedAt: null,
    systemsObserved: 2,
    workloadsObserved: 1,
    summary,
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
    matchingConfidence: "confirmed",
    providerKey: "m365_backup",
    workloadKind: "m365_sharepoint",
    backupFreshnessState: "current",
    restoreFreshnessState: "stale",
    evidenceSource: "provider_sync",
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
    matchingConfidence: "confirmed",
    providerKey: "veeam",
    workloadKind: "server",
    backupFreshnessState: "stale",
    restoreFreshnessState: "current",
    lastSuccessfulBackupAt: "2026-03-24T00:30:00.000Z",
    lastRestoreTestedAt: "2026-03-20T11:00:00.000Z",
    evidenceSource: "provider_sync",
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
    summary: "7 protected systems in scope; 4 require immediate review and 2 have unknown telemetry.",
    cards: [
      {
        key: "high_risk",
        label: "High risk",
        value: 4,
        tone: "high_risk",
        summary: "Systems require backup or restore-proof intervention.",
      },
    ],
    findings: [
      makeFindingItem(dataMode),
      makeFindingItem(dataMode, {
        findingId: "finding-exec-duplicate",
        systemId: "sys-exec-laptop",
        systemName: "Executive Laptop",
        category: "endpoint",
        confidenceState: "unknown",
        matchingConfidence: "duplicate",
        providerKey: "veeam",
        workloadKind: "endpoint_image",
        restoreFreshnessState: "current",
        evidenceSource: "provider_sync",
        summary: "Duplicate match needs review",
        suggestedNextStep: "Review duplicate backup-to-system match",
        queueRank: 2,
        lastSuccessfulBackupAt: "2026-03-27T01:45:00.000Z",
        lastRestoreTestedAt: "2026-03-25T12:00:00.000Z",
      }),
      makeFindingItem(dataMode, {
        findingId: "finding-telemetry-unknown",
        systemId: "sys-branch-nas",
        systemName: "Branch NAS",
        category: "storage",
        confidenceState: "unknown",
        coverageState: "unknown",
        matchingConfidence: "confirmed",
        providerKey: "veeam",
        workloadKind: "server",
        backupFreshnessState: "unknown",
        restoreFreshnessState: "current",
        evidenceSource: "operator_attested",
        summary: "Telemetry unknown",
        suggestedNextStep: "Investigate provider telemetry freshness",
        queueRank: 3,
        lastSuccessfulBackupAt: null,
        lastRestoreTestedAt: "2026-03-18T13:15:00.000Z",
      }),
    ],
    sourceHealth: [
      makeSourceHealth(dataMode),
      makeSourceHealth(dataMode, {
        providerKey: "m365_backup",
        providerLabel: "Microsoft 365 Backup",
        state: "current",
        connectorFreshnessState: "current",
        lastObservedAt: "2026-03-27T03:20:00.000Z",
        systemsObserved: 1,
        workloadsObserved: 2,
      }),
    ],
  };
}

function makeSharePointDetail(dataMode: BackupDataMode): BackupSystemDetail {
  return {
    dataMode,
    system: makeInventoryRow(dataMode, {
      systemId: "sys-sharepoint-tenant",
      systemName: "Microsoft 365 Collaboration",
      category: "m365",
      siteName: null,
      providerKey: "m365_backup",
      workloadKind: "m365_sharepoint",
      coverageState: "partial",
      confidenceState: "high_risk",
      matchingConfidence: "confirmed",
      backupFreshnessState: "current",
      restoreFreshnessState: "stale",
      lastSuccessfulBackupAt: "2026-03-27T03:10:00.000Z",
      lastRestoreTestedAt: "2025-12-15T15:00:00.000Z",
      evidenceSource: "provider_sync",
      restoreEvidenceSource: "provider_sync",
      summary: "Backup is recent but restore proof is stale",
      suggestedNextStep: "Schedule a restore test",
    }),
    scopeSummary:
      "Microsoft 365 Backup (m365_exchange, m365_sharepoint). Policy window: 24h backup freshness, 30d restore proof, 6h grace window.",
    suggestedNextStep: "Schedule a restore test",
    sourceHealth: [
      makeSourceHealth(dataMode, {
        providerKey: "m365_backup",
        providerLabel: "Microsoft 365 Backup",
        state: "current",
        connectorFreshnessState: "current",
        lastObservedAt: "2026-03-27T03:20:00.000Z",
        systemsObserved: 1,
        workloadsObserved: 2,
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

function makeBranchNasDetail(dataMode: BackupDataMode): BackupSystemDetail {
  return {
    dataMode,
    system: makeInventoryRow(dataMode, {
      systemId: "sys-branch-nas",
      systemName: "Branch NAS",
      category: "storage",
      siteName: "Branch",
      providerKey: "veeam",
      workloadKind: "server",
      coverageState: "unknown",
      confidenceState: "unknown",
      matchingConfidence: "confirmed",
      backupFreshnessState: "unknown",
      restoreFreshnessState: "current",
      lastSuccessfulBackupAt: null,
      lastRestoreTestedAt: "2026-03-18T13:15:00.000Z",
      evidenceSource: "operator_attested",
      restoreEvidenceSource: "operator_attested",
      summary: "Backup telemetry is unavailable from the configured provider",
      suggestedNextStep: "Investigate provider telemetry freshness",
    }),
    scopeSummary: "Veeam (server). Policy window: 24h backup freshness, 45d restore proof, 6h grace window.",
    suggestedNextStep: "Investigate provider telemetry freshness",
    sourceHealth: [
      makeSourceHealth(dataMode, {
        providerKey: "veeam",
        providerLabel: "Veeam",
        state: "error",
        connectorFreshnessState: "unknown",
      }),
    ],
    providerEvidence: [
      {
        evidenceId: "evidence-branch-nas",
        providerKey: "veeam",
        workloadKind: "server",
        sourceSystem: "veeam",
        sourceId: "veeam-branch-nas",
        coverageState: "unknown",
        backupFreshnessState: "unknown",
        connectorFreshnessState: "unknown",
        confidenceState: "unknown",
        lastSuccessfulBackupAt: null,
        lastFailedBackupAt: null,
        lastObservedAt: null,
        summary: "Telemetry unknown",
        metadata: { lastConnectorStatus: "provider_outage" },
      },
    ],
    restoreProofs: [
      {
        restoreTestId: "restore-branch-nas-attested",
        backupEvidenceId: null,
        evidenceSource: "operator_attested",
        outcome: "partial",
        testedAt: "2026-03-18T13:15:00.000Z",
        recoveryPointAt: "2026-03-17T23:00:00.000Z",
        ticketRef: "BACK-0976",
        notes: "Operator-attested proof recorded while provider telemetry was unavailable.",
        metadata: { attestedBy: "solo-admin" },
      },
    ],
  };
}

function makeRepository(dataMode: BackupDataMode = "seeded_example") {
  const overview = makeOverview(dataMode);
  const findings = overview.findings;
  const inventory = [
    makeInventoryRow(dataMode),
    makeInventoryRow(dataMode, {
      systemId: "sys-lab-jumpbox",
      systemName: "Lab Jumpbox",
      category: "lab",
      siteName: "Lab",
      coverageMode: "excluded",
      coverageState: "excluded",
      confidenceState: "watch",
      matchingConfidence: "unknown",
      providerKey: "veeam",
      workloadKind: "endpoint_image",
      backupFreshnessState: "unknown",
      restoreFreshnessState: "unknown",
      lastSuccessfulBackupAt: null,
      lastRestoreTestedAt: null,
      evidenceSource: null,
      restoreEvidenceSource: null,
      summary: "Excluded by policy: Disposable lab workload",
      suggestedNextStep: "System is intentionally excluded from backup policy",
    }),
    makeInventoryRow(dataMode, {
      systemId: "sys-exec-laptop",
      systemName: "Executive Laptop",
      category: "endpoint",
      siteName: "HQ",
      confidenceState: "unknown",
      matchingConfidence: "duplicate",
      providerKey: "veeam",
      workloadKind: "endpoint_image",
      backupFreshnessState: "current",
      restoreFreshnessState: "current",
      lastSuccessfulBackupAt: "2026-03-27T01:45:00.000Z",
      lastRestoreTestedAt: "2026-03-25T12:00:00.000Z",
      evidenceSource: "provider_sync",
      restoreEvidenceSource: "provider_sync",
      summary: "Duplicate match needs review",
      suggestedNextStep: "Review duplicate backup-to-system match",
    }),
  ];
  const details = new Map<string, BackupSystemDetail>([
    ["sys-sharepoint-tenant", makeSharePointDetail(dataMode)],
    ["sys-branch-nas", makeBranchNasDetail(dataMode)],
  ]);
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
        return details.get(systemId) ?? null;
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

test("GET /api/backup/overview returns read-only sourceHealth, matchingConfidence, and evidenceSource context", async (t) => {
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
    sourceHealth: Array<{ state: string }>;
    findings: Array<{
      systemId: string;
      matchingConfidence: BackupMatchingConfidence;
      evidenceSource: BackupEvidenceSource | null;
    }>;
  };

  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.isReadOnly, true);
  assert.equal(body.sourceHealth.some((source) => source.state === "error"), true);
  const duplicateFinding = body.findings.find((item) => item.systemId === "sys-exec-laptop");
  assert.equal(duplicateFinding?.matchingConfidence, "duplicate");
  assert.equal(duplicateFinding?.evidenceSource, "provider_sync");
  assert.equal("actionUrl" in body, false);
});

test("GET /api/backup/findings returns ranked finding rows with sourceHealth, duplicate confidence, and read-only flags", async (t) => {
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
    url: "/api/backup/findings?limit=3",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    items: Array<{
      systemId: string;
      matchingConfidence: BackupMatchingConfidence;
      confidenceState: BackupConfidenceState;
      evidenceSource: BackupEvidenceSource | null;
      isReadOnly: boolean;
      sourceHealth: { state: string } | null;
    }>;
  };

  assert.equal(backup.getLastLimit(), 3);
  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.items.some((item) => item.matchingConfidence === "duplicate"), true);
  assert.equal(body.items.some((item) => item.evidenceSource === "operator_attested"), true);
  assert.equal(body.items.every((item) => item.isReadOnly === true), true);
  assert.equal(body.items.some((item) => item.sourceHealth?.state === "error"), true);
  assert.equal("mutation" in (body.items[0] ?? {}), false);
});

test("GET /api/backup/systems parses server-driven filters and returns trust fields without mutation affordances", async (t) => {
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
      matchingConfidence: BackupMatchingConfidence;
      evidenceSource: BackupEvidenceSource | null;
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
  assert.equal(body.items[0]?.matchingConfidence, "confirmed");
  assert.equal(body.items[0]?.evidenceSource, "provider_sync");
  assert.equal(body.items[0]?.sourceHealth?.state, "error");
  assert.equal(body.items[0]?.isReadOnly, true);
  assert.equal("approve" in (body.items[0] ?? {}), false);
});

test("GET /api/backup/systems/:systemId returns operator-attested proof and stays read-only", async (t) => {
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
    url: "/api/backup/systems/sys-branch-nas",
  });

  assert.equal(detailResponse.statusCode, 200);
  const detailBody = detailResponse.json() as {
    dataMode: string;
    systemId: string;
    matchingConfidence: BackupMatchingConfidence;
    evidenceSource: BackupEvidenceSource | null;
    sourceHealth: Array<{ state: string }>;
    restoreProofs: Array<{ evidenceSource: BackupEvidenceSource | null; notes: string | null }>;
    isReadOnly: boolean;
  };

  assert.equal(detailBody.dataMode, "live");
  assert.equal(detailBody.systemId, "sys-branch-nas");
  assert.equal(detailBody.matchingConfidence, "confirmed");
  assert.equal(detailBody.evidenceSource, "operator_attested");
  assert.equal(detailBody.sourceHealth[0]?.state, "error");
  assert.equal(detailBody.restoreProofs.some((proof) => proof.evidenceSource === "operator_attested"), true);
  assert.equal(detailBody.restoreProofs.some((proof) => proof.notes?.includes("Operator-attested proof")), true);
  assert.equal(detailBody.isReadOnly, true);
  assert.equal("actionUrl" in detailBody, false);

  const missingResponse = await app.inject({
    method: "GET",
    url: "/api/backup/systems/missing-system",
  });

  assert.equal(missingResponse.statusCode, 404);
  assert.deepEqual(missingResponse.json(), {
    message: "Backup system not found",
  });
});
