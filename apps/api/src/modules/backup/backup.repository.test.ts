import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { BackupRepository } from "./backup.repository.js";

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function createPrismaMock(options?: {
  policies?: Array<Record<string, unknown>>;
  evidence?: Array<Record<string, unknown>>;
  restoreTests?: Array<Record<string, unknown>>;
}) {
  const policies =
    options?.policies ??
    [
      {
        id: "policy-finance-sql",
        systemId: "sys-finance-sql",
        coverageMode: "required",
        backupFreshnessHours: 24,
        restoreTestMaxAgeDays: 14,
        gracePeriodHours: 4,
        providerScope: [{ providerKey: "azure_backup", workloadKinds: ["virtual_machine"] }],
        exclusionReason: null,
        notes: "Finance SQL requires daily backup with fortnightly restore validation.",
        createdAt: new Date(),
        updatedAt: new Date(),
        system: {
          id: "sys-finance-sql",
          sourceSystem: "cmdb",
          sourceId: "sys-finance-sql",
          name: "Finance SQL",
          category: "database",
          ownerTeam: "Finance IT",
          criticality: "tier_0",
        },
      },
      {
        id: "policy-domain-controller",
        systemId: "sys-domain-controller",
        coverageMode: "required",
        backupFreshnessHours: 24,
        restoreTestMaxAgeDays: 30,
        gracePeriodHours: 2,
        providerScope: [{ providerKey: "azure_backup", workloadKinds: ["server"] }],
        exclusionReason: null,
        notes: "Domain controllers must always have an assigned protected backup scope.",
        createdAt: new Date(),
        updatedAt: new Date(),
        system: {
          id: "sys-domain-controller",
          sourceSystem: "cmdb",
          sourceId: "sys-domain-controller",
          name: "Primary Domain Controller",
          category: "identity",
          ownerTeam: "Infrastructure",
          criticality: "tier_0",
        },
      },
      {
        id: "policy-sharepoint-tenant",
        systemId: "sys-sharepoint-tenant",
        coverageMode: "required",
        backupFreshnessHours: 24,
        restoreTestMaxAgeDays: 30,
        gracePeriodHours: 6,
        providerScope: [{ providerKey: "m365_backup", workloadKinds: ["m365_exchange", "m365_sharepoint"] }],
        exclusionReason: null,
        notes: "M365 collaboration workloads must prove both workload inclusion and recoverability.",
        createdAt: new Date(),
        updatedAt: new Date(),
        system: {
          id: "sys-sharepoint-tenant",
          sourceSystem: "cmdb",
          sourceId: "sys-sharepoint-tenant",
          name: "Microsoft 365 Collaboration",
          category: "m365",
          ownerTeam: "Productivity",
          criticality: "tier_1",
        },
      },
      {
        id: "policy-helpdesk-files",
        systemId: "sys-helpdesk-files",
        coverageMode: "required",
        backupFreshnessHours: 12,
        restoreTestMaxAgeDays: 30,
        gracePeriodHours: 2,
        providerScope: [{ providerKey: "veeam", workloadKinds: ["server"] }],
        exclusionReason: null,
        notes: "Helpdesk file services need twice-daily protection because of ticket attachment churn.",
        createdAt: new Date(),
        updatedAt: new Date(),
        system: {
          id: "sys-helpdesk-files",
          sourceSystem: "cmdb",
          sourceId: "sys-helpdesk-files",
          name: "Helpdesk Files",
          category: "file_service",
          ownerTeam: "Service Desk",
          criticality: "tier_1",
        },
      },
      {
        id: "policy-branch-nas",
        systemId: "sys-branch-nas",
        coverageMode: "required",
        backupFreshnessHours: 24,
        restoreTestMaxAgeDays: 45,
        gracePeriodHours: 6,
        providerScope: [{ providerKey: "veeam", workloadKinds: ["server"] }],
        exclusionReason: null,
        notes: "Branch NAS remains in-scope even when the provider connector cannot supply fresh telemetry.",
        createdAt: new Date(),
        updatedAt: new Date(),
        system: {
          id: "sys-branch-nas",
          sourceSystem: "cmdb",
          sourceId: "sys-branch-nas",
          name: "Branch NAS",
          category: "storage",
          ownerTeam: "Field IT",
          criticality: "tier_2",
        },
      },
      {
        id: "policy-lab-jumpbox",
        systemId: "sys-lab-jumpbox",
        coverageMode: "excluded",
        backupFreshnessHours: null,
        restoreTestMaxAgeDays: null,
        gracePeriodHours: null,
        providerScope: [{ providerKey: "veeam", workloadKinds: ["endpoint_image"] }],
        exclusionReason: "Disposable lab workload",
        notes: "The lab jumpbox is rebuilt from code and intentionally excluded from backup obligations.",
        createdAt: new Date(),
        updatedAt: new Date(),
        system: {
          id: "sys-lab-jumpbox",
          sourceSystem: "cmdb",
          sourceId: "sys-lab-jumpbox",
          name: "Lab Jumpbox",
          category: "lab",
          ownerTeam: "Engineering",
          criticality: "tier_3",
        },
      },
    ];

  const evidence =
    options?.evidence ??
    [
      {
        id: "evidence-finance-sql",
        systemId: "sys-finance-sql",
        providerKey: "azure_backup",
        workloadKind: "virtual_machine",
        sourceSystem: "azure_backup",
        sourceId: "azure-backup-finance-sql",
        coverageState: "protected",
        lastSuccessfulBackupAt: hoursAgo(1),
        lastFailedBackupAt: null,
        backupFreshnessState: "current",
        connectorFreshnessState: "current",
        lastObservedAt: hoursAgo(1),
        metadata: { recoveryVault: "prod-sql-vault" },
      },
      {
        id: "evidence-sharepoint-exchange",
        systemId: "sys-sharepoint-tenant",
        providerKey: "m365_backup",
        workloadKind: "m365_exchange",
        sourceSystem: "m365_backup",
        sourceId: "m365-backup-exchange",
        coverageState: "protected",
        lastSuccessfulBackupAt: hoursAgo(2),
        lastFailedBackupAt: null,
        backupFreshnessState: "current",
        connectorFreshnessState: "current",
        lastObservedAt: hoursAgo(2),
        metadata: { mailboxScope: "all_shared_and_user_mailboxes" },
      },
      {
        id: "evidence-sharepoint-sites",
        systemId: "sys-sharepoint-tenant",
        providerKey: "m365_backup",
        workloadKind: "m365_sharepoint",
        sourceSystem: "m365_backup",
        sourceId: "m365-backup-sharepoint",
        coverageState: "partial",
        lastSuccessfulBackupAt: hoursAgo(2),
        lastFailedBackupAt: daysAgo(3),
        backupFreshnessState: "current",
        connectorFreshnessState: "current",
        lastObservedAt: hoursAgo(2),
        metadata: { protectedSiteCount: 18, expectedSiteCount: 24 },
      },
      {
        id: "evidence-helpdesk-files",
        systemId: "sys-helpdesk-files",
        providerKey: "veeam",
        workloadKind: "server",
        sourceSystem: "veeam",
        sourceId: "veeam-helpdesk-files",
        coverageState: "protected",
        lastSuccessfulBackupAt: daysAgo(3),
        lastFailedBackupAt: daysAgo(1),
        backupFreshnessState: "stale",
        connectorFreshnessState: "current",
        lastObservedAt: hoursAgo(4),
        metadata: { repository: "helpdesk-tier1" },
      },
      {
        id: "evidence-branch-nas",
        systemId: "sys-branch-nas",
        providerKey: "veeam",
        workloadKind: "server",
        sourceSystem: "veeam",
        sourceId: "veeam-branch-nas",
        coverageState: "unknown",
        lastSuccessfulBackupAt: null,
        lastFailedBackupAt: null,
        backupFreshnessState: "unknown",
        connectorFreshnessState: "unknown",
        lastObservedAt: null,
        metadata: { lastConnectorStatus: "timeout" },
      },
    ];

  const restoreTests =
    options?.restoreTests ??
    [
      {
        id: "restore-finance-sql",
        systemId: "sys-finance-sql",
        backupEvidenceId: "evidence-finance-sql",
        evidenceSource: "provider_sync",
        outcome: "success",
        testedAt: daysAgo(3),
        recoveryPointAt: daysAgo(3),
        ticketRef: "BACK-1001",
        notes: "Quarterly SQL recovery validation completed within SLA.",
        metadata: null,
      },
      {
        id: "restore-sharepoint-exchange",
        systemId: "sys-sharepoint-tenant",
        backupEvidenceId: "evidence-sharepoint-exchange",
        evidenceSource: "provider_sync",
        outcome: "success",
        testedAt: daysAgo(1),
        recoveryPointAt: daysAgo(1),
        ticketRef: "BACK-1008",
        notes: "Mailbox restore sample completed for the latest tenant copy.",
        metadata: null,
      },
      {
        id: "restore-sharepoint-sites",
        systemId: "sys-sharepoint-tenant",
        backupEvidenceId: "evidence-sharepoint-sites",
        evidenceSource: "provider_sync",
        outcome: "success",
        testedAt: daysAgo(120),
        recoveryPointAt: daysAgo(120),
        ticketRef: "BACK-0822",
        notes: "Last successful SharePoint restore drill predates the current policy window.",
        metadata: null,
      },
      {
        id: "restore-helpdesk-files",
        systemId: "sys-helpdesk-files",
        backupEvidenceId: "evidence-helpdesk-files",
        evidenceSource: "provider_sync",
        outcome: "success",
        testedAt: daysAgo(7),
        recoveryPointAt: daysAgo(7),
        ticketRef: "BACK-0993",
        notes: "File restore test succeeded before the backup chain started missing freshness.",
        metadata: null,
      },
      {
        id: "restore-branch-nas-attested",
        systemId: "sys-branch-nas",
        backupEvidenceId: null,
        evidenceSource: "operator_attested",
        outcome: "partial",
        testedAt: daysAgo(9),
        recoveryPointAt: daysAgo(10),
        ticketRef: "BACK-0976",
        notes: "Operator-attested branch restore succeeded while provider telemetry was unavailable.",
        metadata: null,
      },
    ];

  return {
    backupCoveragePolicy: {
      findMany: async () => policies,
    },
    backupEvidence: {
      findMany: async () => evidence,
    },
    backupRestoreTest: {
      findMany: async () => restoreTests,
    },
  } as unknown as PrismaClient;
}

test("getOverview exposes missing coverage, stale restore, and unknown telemetry without treating fixtures as live", async () => {
  const repository = new BackupRepository(createPrismaMock());

  const overview = await repository.getOverview();

  assert.equal(overview.dataMode, "live");
  assert.equal(overview.findings.some((finding) => finding.summary === "Coverage missing for an expected protected system"), true);
  assert.equal(overview.findings.some((finding) => finding.suggestedNextStep === "Schedule a restore test"), true);
  assert.equal(
    overview.sourceHealth.some((source) => source.summary === "Backup telemetry is unavailable from the configured provider"),
    true,
  );
});

test("listInventory filters by confidence, coverage, provider, category, and staleOnly", async () => {
  const repository = new BackupRepository(createPrismaMock());

  const rows = await repository.listInventory({
    confidenceState: "high_risk",
    coverageState: "protected",
    providerKey: "veeam",
    category: "file_service",
    staleOnly: true,
  });

  assert.deepEqual(rows.map((row) => row.systemId), ["sys-helpdesk-files"]);
  assert.equal(rows[0]?.summary.includes("backup"), true);
});

test("getSystemDetail returns restore proofs, source health, and restore-test guidance", async () => {
  const repository = new BackupRepository(createPrismaMock());

  const detail = await repository.getSystemDetail("sys-sharepoint-tenant");

  assert.ok(detail);
  assert.equal(detail?.dataMode, "live");
  assert.equal(detail?.system.systemId, "sys-sharepoint-tenant");
  assert.equal(detail?.system.summary, "Backup is recent but restore proof is stale");
  assert.equal(detail?.suggestedNextStep, "Schedule a restore test");
  assert.equal(detail?.providerEvidence.length, 2);
  assert.equal(detail?.restoreProofs.length, 2);
});

test("repository falls back to seeded_example mode when backup tables are empty", async () => {
  const repository = new BackupRepository(
    createPrismaMock({
      policies: [],
      evidence: [],
      restoreTests: [],
    }),
  );

  const overview = await repository.getOverview();
  const findings = await repository.listFindings(3);
  const inventory = await repository.listInventory();
  const detail = await repository.getSystemDetail("sys-domain-controller");

  assert.equal(overview.dataMode, "seeded_example");
  assert.equal(findings[0]?.dataMode, "seeded_example");
  assert.equal(inventory[0]?.dataMode, "seeded_example");
  assert.equal(detail?.dataMode, "seeded_example");
  assert.equal(detail?.system.summary, "Coverage missing for an expected protected system");
});
