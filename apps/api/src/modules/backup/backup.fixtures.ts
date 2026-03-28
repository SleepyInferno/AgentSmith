import type {
  BackupConfidenceState,
  BackupCoverageMode,
  BackupCoverageState,
  BackupDataMode,
  BackupEvidenceSource,
  BackupMatchingConfidence,
  BackupRestoreOutcome,
  BackupRestoreState,
} from "./backup.types.js";
import type { BackupV1ProviderKey, BackupV1WorkloadKey } from "./backup.v1-scope.js";
import { azure_backup, m365_backup, veeam } from "./backup.v1-scope.js";

export type BackupFixtureSystem = {
  id: string;
  sourceSystem: string;
  sourceId: string;
  name: string;
  category: string | null;
  ownerTeam: string | null;
  criticality: string | null;
  dataMode: BackupDataMode;
};

export type BackupFixtureProviderScope = {
  providerKey: BackupV1ProviderKey;
  workloadKinds: BackupV1WorkloadKey[];
};

export type BackupFixturePolicy = {
  id: string;
  systemId: string;
  coverageMode: BackupCoverageMode;
  backupFreshnessHours: number | null;
  restoreTestMaxAgeDays: number | null;
  gracePeriodHours: number | null;
  providerScope: BackupFixtureProviderScope[] | null;
  exclusionReason: string | null;
  notes: string | null;
  confidenceState: BackupConfidenceState;
  summary: string | null;
  dataMode: BackupDataMode;
};

export type BackupFixtureEvidence = {
  id: string;
  systemId: string;
  providerKey: BackupV1ProviderKey;
  workloadKind: BackupV1WorkloadKey;
  matchingConfidence: BackupMatchingConfidence;
  sourceSystem: string;
  sourceId: string;
  coverageState: BackupCoverageState;
  lastSuccessfulBackupAt: string | null;
  lastFailedBackupAt: string | null;
  backupFreshnessState: BackupRestoreState;
  connectorFreshnessState: BackupRestoreState;
  lastObservedAt: string | null;
  restoreFreshnessState: BackupRestoreState;
  confidenceState: BackupConfidenceState;
  summary: string;
  suggestedNextStep: string;
  metadata: Record<string, unknown> | null;
  dataMode: BackupDataMode;
};

export type BackupFixtureRestoreTest = {
  id: string;
  systemId: string;
  backupEvidenceId: string | null;
  evidenceSource: BackupEvidenceSource;
  outcome: BackupRestoreOutcome;
  testedAt: string;
  recoveryPointAt: string | null;
  ticketRef: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  dataMode: BackupDataMode;
};

const seededSource = "seeded_example";
const seededDataMode: BackupDataMode = "seeded_example";

export const backupFixtureSystems: BackupFixtureSystem[] = [
  {
    id: "sys-finance-sql",
    sourceSystem: seededSource,
    sourceId: "sys-finance-sql",
    name: "Finance SQL",
    category: "database",
    ownerTeam: "Finance IT",
    criticality: "tier_0",
    dataMode: seededDataMode,
  },
  {
    id: "sys-domain-controller",
    sourceSystem: seededSource,
    sourceId: "sys-domain-controller",
    name: "Primary Domain Controller",
    category: "identity",
    ownerTeam: "Infrastructure",
    criticality: "tier_0",
    dataMode: seededDataMode,
  },
  {
    id: "sys-sharepoint-tenant",
    sourceSystem: seededSource,
    sourceId: "sys-sharepoint-tenant",
    name: "Microsoft 365 Collaboration",
    category: "m365",
    ownerTeam: "Productivity",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-helpdesk-files",
    sourceSystem: seededSource,
    sourceId: "sys-helpdesk-files",
    name: "Helpdesk Files",
    category: "file_service",
    ownerTeam: "Service Desk",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
  {
    id: "sys-branch-nas",
    sourceSystem: seededSource,
    sourceId: "sys-branch-nas",
    name: "Branch NAS",
    category: "storage",
    ownerTeam: "Field IT",
    criticality: "tier_2",
    dataMode: seededDataMode,
  },
  {
    id: "sys-lab-jumpbox",
    sourceSystem: seededSource,
    sourceId: "sys-lab-jumpbox",
    name: "Lab Jumpbox",
    category: "lab",
    ownerTeam: "Engineering",
    criticality: "tier_3",
    dataMode: seededDataMode,
  },
  {
    id: "sys-exec-laptop",
    sourceSystem: seededSource,
    sourceId: "sys-exec-laptop",
    name: "Executive Laptop",
    category: "endpoint",
    ownerTeam: "Executive Support",
    criticality: "tier_1",
    dataMode: seededDataMode,
  },
];

export const backupFixturePolicies: BackupFixturePolicy[] = [
  {
    id: "policy-finance-sql",
    systemId: "sys-finance-sql",
    coverageMode: "required",
    backupFreshnessHours: 24,
    restoreTestMaxAgeDays: 14,
    gracePeriodHours: 4,
    providerScope: [{ providerKey: azure_backup.providerKey, workloadKinds: ["virtual_machine"] }],
    exclusionReason: null,
    notes: "Finance SQL requires daily backup with fortnightly restore validation.",
    confidenceState: "healthy",
    summary: "Finance SQL is covered by Azure Backup and meets the restore-proof policy.",
    dataMode: seededDataMode,
  },
  {
    id: "policy-domain-controller",
    systemId: "sys-domain-controller",
    coverageMode: "required",
    backupFreshnessHours: 24,
    restoreTestMaxAgeDays: 30,
    gracePeriodHours: 2,
    providerScope: [{ providerKey: azure_backup.providerKey, workloadKinds: ["server"] }],
    exclusionReason: null,
    notes: "Domain controllers must always have an assigned protected backup scope.",
    confidenceState: "high_risk",
    summary: "Coverage missing for an expected protected system",
    dataMode: seededDataMode,
  },
  {
    id: "policy-sharepoint-tenant",
    systemId: "sys-sharepoint-tenant",
    coverageMode: "required",
    backupFreshnessHours: 24,
    restoreTestMaxAgeDays: 30,
    gracePeriodHours: 6,
    providerScope: [
      { providerKey: m365_backup.providerKey, workloadKinds: ["m365_exchange", "m365_sharepoint"] },
    ],
    exclusionReason: null,
    notes: "M365 collaboration workloads must prove both workload inclusion and recoverability.",
    confidenceState: "high_risk",
    summary: "SharePoint tenant coverage is partial and one workload lacks recent restore proof.",
    dataMode: seededDataMode,
  },
  {
    id: "policy-helpdesk-files",
    systemId: "sys-helpdesk-files",
    coverageMode: "required",
    backupFreshnessHours: 12,
    restoreTestMaxAgeDays: 30,
    gracePeriodHours: 2,
    providerScope: [{ providerKey: veeam.providerKey, workloadKinds: ["server"] }],
    exclusionReason: null,
    notes: "Helpdesk file services need twice-daily protection because of ticket attachment churn.",
    confidenceState: "high_risk",
    summary: "Helpdesk Files has stale backup freshness despite an in-scope provider assignment.",
    dataMode: seededDataMode,
  },
  {
    id: "policy-branch-nas",
    systemId: "sys-branch-nas",
    coverageMode: "required",
    backupFreshnessHours: 24,
    restoreTestMaxAgeDays: 45,
    gracePeriodHours: 6,
    providerScope: [{ providerKey: veeam.providerKey, workloadKinds: ["server"] }],
    exclusionReason: null,
    notes: "Branch NAS remains in-scope even when the provider connector cannot supply fresh telemetry.",
    confidenceState: "unknown",
    summary: "Backup telemetry is unavailable from the configured provider",
    dataMode: seededDataMode,
  },
  {
    id: "policy-lab-jumpbox",
    systemId: "sys-lab-jumpbox",
    coverageMode: "excluded",
    backupFreshnessHours: null,
    restoreTestMaxAgeDays: null,
    gracePeriodHours: null,
    providerScope: [{ providerKey: veeam.providerKey, workloadKinds: ["endpoint_image"] }],
    exclusionReason: "Disposable lab workload",
    notes: "The lab jumpbox is rebuilt from code and intentionally excluded from backup obligations.",
    confidenceState: "watch",
    summary: "Excluded by policy: Disposable lab workload.",
    dataMode: seededDataMode,
  },
  {
    id: "policy-exec-laptop",
    systemId: "sys-exec-laptop",
    coverageMode: "required",
    backupFreshnessHours: 24,
    restoreTestMaxAgeDays: 14,
    gracePeriodHours: 4,
    providerScope: [{ providerKey: veeam.providerKey, workloadKinds: ["endpoint_image"] }],
    exclusionReason: null,
    notes: "Executive endpoint evidence must reconcile to a single protected backup identity before confidence can be trusted.",
    confidenceState: "unknown",
    summary: "Duplicate match needs review",
    dataMode: seededDataMode,
  },
];

export const backupFixtureEvidence: BackupFixtureEvidence[] = [
  {
    id: "evidence-finance-sql",
    systemId: "sys-finance-sql",
    providerKey: azure_backup.providerKey,
    workloadKind: "virtual_machine",
    matchingConfidence: "confirmed",
    sourceSystem: seededSource,
    sourceId: "azure-backup-finance-sql",
    coverageState: "protected",
    lastSuccessfulBackupAt: "2026-03-27T05:15:00.000Z",
    lastFailedBackupAt: null,
    backupFreshnessState: "current",
    connectorFreshnessState: "current",
    lastObservedAt: "2026-03-27T06:00:00.000Z",
    restoreFreshnessState: "current",
    confidenceState: "healthy",
    summary: "Finance SQL has recent backup evidence and a current restore test.",
    suggestedNextStep: "No action required.",
    metadata: { protectedItems: 3, recoveryVault: "prod-sql-vault" },
    dataMode: seededDataMode,
  },
  {
    id: "evidence-sharepoint-exchange",
    systemId: "sys-sharepoint-tenant",
    providerKey: m365_backup.providerKey,
    workloadKind: "m365_exchange",
    matchingConfidence: "confirmed",
    sourceSystem: seededSource,
    sourceId: "m365-backup-exchange",
    coverageState: "protected",
    lastSuccessfulBackupAt: "2026-03-27T03:05:00.000Z",
    lastFailedBackupAt: null,
    backupFreshnessState: "current",
    connectorFreshnessState: "current",
    lastObservedAt: "2026-03-27T03:20:00.000Z",
    restoreFreshnessState: "current",
    confidenceState: "healthy",
    summary: "Exchange backup coverage is complete and the latest restore proof is current.",
    suggestedNextStep: "Keep the next tenant restore check on schedule.",
    metadata: { mailboxScope: "all_shared_and_user_mailboxes" },
    dataMode: seededDataMode,
  },
  {
    id: "evidence-sharepoint-sites",
    systemId: "sys-sharepoint-tenant",
    providerKey: m365_backup.providerKey,
    workloadKind: "m365_sharepoint",
    matchingConfidence: "confirmed",
    sourceSystem: seededSource,
    sourceId: "m365-backup-sharepoint",
    coverageState: "partial",
    lastSuccessfulBackupAt: "2026-03-27T03:10:00.000Z",
    lastFailedBackupAt: "2026-03-24T01:02:00.000Z",
    backupFreshnessState: "current",
    connectorFreshnessState: "current",
    lastObservedAt: "2026-03-27T03:20:00.000Z",
    restoreFreshnessState: "stale",
    confidenceState: "high_risk",
    summary: "Backup is recent but restore proof is stale",
    suggestedNextStep: "Run and document a SharePoint restore drill for the partially protected tenant scope.",
    metadata: { protectedSiteCount: 18, expectedSiteCount: 24 },
    dataMode: seededDataMode,
  },
  {
    id: "evidence-helpdesk-files",
    systemId: "sys-helpdesk-files",
    providerKey: veeam.providerKey,
    workloadKind: "server",
    matchingConfidence: "confirmed",
    sourceSystem: seededSource,
    sourceId: "veeam-helpdesk-files",
    coverageState: "protected",
    lastSuccessfulBackupAt: "2026-03-24T00:30:00.000Z",
    lastFailedBackupAt: "2026-03-26T00:30:00.000Z",
    backupFreshnessState: "stale",
    connectorFreshnessState: "current",
    lastObservedAt: "2026-03-27T04:00:00.000Z",
    restoreFreshnessState: "current",
    confidenceState: "high_risk",
    summary: "Helpdesk Files is assigned to Veeam but the latest successful backup is stale.",
    suggestedNextStep: "Investigate the failed Veeam job chain and restore the expected backup cadence.",
    metadata: { repository: "helpdesk-tier1", retryCount: 2 },
    dataMode: seededDataMode,
  },
  {
    id: "evidence-branch-nas",
    systemId: "sys-branch-nas",
    providerKey: veeam.providerKey,
    workloadKind: "server",
    matchingConfidence: "confirmed",
    sourceSystem: seededSource,
    sourceId: "veeam-branch-nas",
    coverageState: "unknown",
    lastSuccessfulBackupAt: null,
    lastFailedBackupAt: null,
    backupFreshnessState: "unknown",
    connectorFreshnessState: "unknown",
    lastObservedAt: null,
    restoreFreshnessState: "current",
    confidenceState: "unknown",
    summary: "Backup telemetry is unavailable from the configured provider",
    suggestedNextStep: "Check the Veeam connector and confirm whether the NAS job still reports.",
    metadata: { lastConnectorStatus: "provider_outage", ticketRef: "OPS-421", displayState: "Telemetry unknown" },
    dataMode: seededDataMode,
  },
  {
    id: "evidence-exec-laptop-duplicate",
    systemId: "sys-exec-laptop",
    providerKey: veeam.providerKey,
    workloadKind: "endpoint_image",
    matchingConfidence: "duplicate",
    sourceSystem: seededSource,
    sourceId: "veeam-exec-laptop-duplicate",
    coverageState: "protected",
    lastSuccessfulBackupAt: "2026-03-27T01:45:00.000Z",
    lastFailedBackupAt: null,
    backupFreshnessState: "current",
    connectorFreshnessState: "current",
    lastObservedAt: "2026-03-27T02:00:00.000Z",
    restoreFreshnessState: "current",
    confidenceState: "unknown",
    summary: "Duplicate match needs review",
    suggestedNextStep: "Review duplicate backup-to-system match before trusting the coverage claim.",
    metadata: {
      duplicateCandidates: ["Executive Laptop", "Executive Laptop - Loaner"],
      matchStrategy: "hostname",
    },
    dataMode: seededDataMode,
  },
];

export const backupFixtureRestoreTests: BackupFixtureRestoreTest[] = [
  {
    id: "restore-finance-sql",
    systemId: "sys-finance-sql",
    backupEvidenceId: "evidence-finance-sql",
    evidenceSource: "provider_sync",
    outcome: "success",
    testedAt: "2026-03-21T14:00:00.000Z",
    recoveryPointAt: "2026-03-21T05:15:00.000Z",
    ticketRef: "BACK-1001",
    notes: "Quarterly SQL recovery validation completed within SLA.",
    metadata: { restoredDatabase: "FinanceArchive" },
    dataMode: seededDataMode,
  },
  {
    id: "restore-sharepoint-exchange",
    systemId: "sys-sharepoint-tenant",
    backupEvidenceId: "evidence-sharepoint-exchange",
    evidenceSource: "provider_sync",
    outcome: "success",
    testedAt: "2026-03-26T16:30:00.000Z",
    recoveryPointAt: "2026-03-26T03:05:00.000Z",
    ticketRef: "BACK-1008",
    notes: "Mailbox restore sample completed for the latest tenant copy.",
    metadata: { restoredMailbox: "shared-payroll@company.test" },
    dataMode: seededDataMode,
  },
  {
    id: "restore-sharepoint-sites",
    systemId: "sys-sharepoint-tenant",
    backupEvidenceId: "evidence-sharepoint-sites",
    evidenceSource: "provider_sync",
    outcome: "success",
    testedAt: "2025-12-15T15:00:00.000Z",
    recoveryPointAt: "2025-12-15T03:10:00.000Z",
    ticketRef: "BACK-0822",
    notes: "Last successful SharePoint restore drill predates the current policy window.",
    metadata: { restoredSite: "Projects/PMO" },
    dataMode: seededDataMode,
  },
  {
    id: "restore-helpdesk-files",
    systemId: "sys-helpdesk-files",
    backupEvidenceId: "evidence-helpdesk-files",
    evidenceSource: "provider_sync",
    outcome: "success",
    testedAt: "2026-03-20T11:00:00.000Z",
    recoveryPointAt: "2026-03-20T00:30:00.000Z",
    ticketRef: "BACK-0993",
    notes: "File restore test succeeded before the backup chain started missing its freshness target.",
    metadata: { restoredPath: "\\\\helpdesk-files\\tickets" },
    dataMode: seededDataMode,
  },
  {
    id: "restore-branch-nas-attested",
    systemId: "sys-branch-nas",
    backupEvidenceId: null,
    evidenceSource: "operator_attested",
    outcome: "partial",
    testedAt: "2026-03-18T13:15:00.000Z",
    recoveryPointAt: "2026-03-17T23:00:00.000Z",
    ticketRef: "BACK-0976",
    notes: "Operator-attested proof recorded while provider telemetry was unavailable.",
    metadata: { attestedBy: "solo-admin", restoredShare: "Operations" },
    dataMode: seededDataMode,
  },
  {
    id: "restore-exec-laptop",
    systemId: "sys-exec-laptop",
    backupEvidenceId: "evidence-exec-laptop-duplicate",
    evidenceSource: "provider_sync",
    outcome: "success",
    testedAt: "2026-03-25T12:00:00.000Z",
    recoveryPointAt: "2026-03-25T01:45:00.000Z",
    ticketRef: "BACK-1012",
    notes: "Restore proof exists, but the system match is still duplicated and needs review.",
    metadata: { restoredDevice: "Executive Laptop" },
    dataMode: seededDataMode,
  },
];
