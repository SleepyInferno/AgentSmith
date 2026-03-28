export const backupDataModes = ["live", "seeded_example"] as const;
export type BackupDataMode = (typeof backupDataModes)[number];

export const backupCoverageModes = ["required", "excluded"] as const;
export type BackupCoverageMode = (typeof backupCoverageModes)[number];

export const backupCoverageStates = ["protected", "missing", "partial", "excluded", "unknown"] as const;
export type BackupCoverageState = (typeof backupCoverageStates)[number];

export const backupRestoreStates = ["current", "stale", "missing", "unknown"] as const;
export type BackupRestoreState = (typeof backupRestoreStates)[number];

export const backupConfidenceStates = ["healthy", "watch", "high_risk", "unknown"] as const;
export type BackupConfidenceState = (typeof backupConfidenceStates)[number];

export const backupEvidenceSources = ["provider_sync", "operator_attested"] as const;
export type BackupEvidenceSource = (typeof backupEvidenceSources)[number];

export const backupRestoreOutcomes = ["success", "partial", "failure"] as const;
export type BackupRestoreOutcome = (typeof backupRestoreOutcomes)[number];

export type BackupOverviewCard = {
  key: "protected_systems" | "healthy" | "watch" | "high_risk" | "unknown" | "excluded";
  label: string;
  value: number;
  tone: "neutral" | BackupConfidenceState;
  summary: string;
};

export type BackupSourceHealth = {
  providerKey: string;
  providerLabel: string;
  connectorFreshnessState: BackupRestoreState;
  lastObservedAt: string | null;
  systemsObserved: number;
  workloadsObserved: number;
  summary: string;
  dataMode: BackupDataMode;
};

export type BackupFindingItem = {
  findingId: string;
  systemId: string;
  systemName: string;
  category: string | null;
  siteName: string | null;
  ownerTeam: string | null;
  criticality: string | null;
  coverageMode: BackupCoverageMode;
  coverageState: BackupCoverageState;
  confidenceState: BackupConfidenceState;
  providerKey: string | null;
  workloadKind: string | null;
  backupFreshnessState: BackupRestoreState;
  restoreFreshnessState: BackupRestoreState;
  summary: string;
  suggestedNextStep: string;
  queueRank: number;
  lastSuccessfulBackupAt: string | null;
  lastRestoreTestedAt: string | null;
  dataMode: BackupDataMode;
};

export type BackupInventoryRow = {
  systemId: string;
  systemName: string;
  sourceSystem: string;
  sourceId: string;
  category: string | null;
  siteName: string | null;
  ownerTeam: string | null;
  criticality: string | null;
  coverageMode: BackupCoverageMode;
  coverageState: BackupCoverageState;
  confidenceState: BackupConfidenceState;
  providerKey: string | null;
  workloadKind: string | null;
  backupFreshnessState: BackupRestoreState;
  restoreFreshnessState: BackupRestoreState;
  lastSuccessfulBackupAt: string | null;
  lastRestoreTestedAt: string | null;
  restoreEvidenceSource: BackupEvidenceSource | null;
  summary: string;
  suggestedNextStep: string | null;
  dataMode: BackupDataMode;
};

export type BackupInventoryFilters = {
  search?: string;
  siteName?: string;
  category?: string;
  coverageMode?: BackupCoverageMode;
  coverageState?: BackupCoverageState;
  confidenceState?: BackupConfidenceState;
  providerKey?: string;
  workloadKind?: string;
  criticality?: string;
  staleOnly?: boolean;
};

export type BackupOverview = {
  dataMode: BackupDataMode;
  generatedAt: string | null;
  summary: string;
  cards: BackupOverviewCard[];
  findings: BackupFindingItem[];
  sourceHealth: BackupSourceHealth[];
};

export type BackupProviderEvidence = {
  evidenceId: string;
  providerKey: string;
  workloadKind: string;
  sourceSystem: string;
  sourceId: string;
  coverageState: BackupCoverageState;
  backupFreshnessState: BackupRestoreState;
  connectorFreshnessState: BackupRestoreState;
  confidenceState: BackupConfidenceState;
  lastSuccessfulBackupAt: string | null;
  lastFailedBackupAt: string | null;
  lastObservedAt: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
};

export type BackupRestoreProof = {
  restoreTestId: string;
  backupEvidenceId: string | null;
  evidenceSource: BackupEvidenceSource;
  outcome: BackupRestoreOutcome;
  testedAt: string;
  recoveryPointAt: string | null;
  ticketRef: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

export type BackupSystemDetail = {
  dataMode: BackupDataMode;
  system: BackupInventoryRow;
  scopeSummary: string;
  suggestedNextStep: string | null;
  sourceHealth: BackupSourceHealth[];
  providerEvidence: BackupProviderEvidence[];
  restoreProofs: BackupRestoreProof[];
};
