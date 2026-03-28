export type BackupDataMode = "live" | "seeded_example" | string;
export type BackupCoverageState = "protected" | "missing" | "partial" | "excluded" | "unknown" | string;
export type BackupConfidenceState = "healthy" | "watch" | "high_risk" | "unknown" | string;
export type BackupRestoreState = "current" | "stale" | "missing" | "unknown" | string;

export type BackupSourceHealth = {
  providerKey: string;
  providerLabel: string;
  state: BackupRestoreState;
  connectorFreshnessState: BackupRestoreState;
  lastObservedAt: string | null;
  systemsObserved: number;
  workloadsObserved: number;
  summary: string;
  dataMode: BackupDataMode;
};

export type BackupOverviewCard = {
  key: string;
  label: string;
  value: number;
  tone: "neutral" | BackupConfidenceState;
  summary: string;
};

export type BackupOverviewResponse = {
  dataMode: BackupDataMode;
  generatedAt: string | null;
  summary: string;
  cards: BackupOverviewCard[];
  sourceHealth: BackupSourceHealth[];
  isReadOnly: boolean;
};

export type BackupReviewRow = {
  dataMode: BackupDataMode;
  systemId: string;
  systemName: string;
  category: string | null;
  siteName: string | null;
  providerKey: string | null;
  coverageState: BackupCoverageState;
  confidenceState: BackupConfidenceState;
  lastSuccessfulBackupAt: string | null;
  lastRestoreTestAt: string | null;
  summary: string;
  suggestedNextStep: string | null;
  sourceHealth: BackupSourceHealth | null;
  isReadOnly: boolean;
};

export type BackupFinding = BackupReviewRow & {
  findingId: string;
  queueRank: number;
  workloadKind: string | null;
};

export type BackupFindingsResponse = {
  dataMode: BackupDataMode;
  isReadOnly: boolean;
  items: BackupFinding[];
};

export type BackupInventoryParams = {
  search?: string;
  confidenceState?: string;
  coverageState?: string;
  providerKey?: string;
  siteName?: string;
  category?: string;
  staleOnly?: boolean;
};

export type BackupInventoryRow = BackupReviewRow & {
  workloadKind: string | null;
  backupFreshnessState: BackupRestoreState;
  restoreFreshnessState: BackupRestoreState;
};

export type BackupInventoryResponse = {
  dataMode: BackupDataMode;
  isReadOnly: boolean;
  items: BackupInventoryRow[];
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
  evidenceSource: string;
  outcome: string;
  testedAt: string;
  recoveryPointAt: string | null;
  ticketRef: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

export type BackupSystemDetail = {
  dataMode: BackupDataMode;
  systemId: string;
  systemName: string;
  category: string | null;
  siteName: string | null;
  providerKey: string | null;
  coverageState: BackupCoverageState;
  confidenceState: BackupConfidenceState;
  lastSuccessfulBackupAt: string | null;
  lastRestoreTestAt: string | null;
  summary: string;
  suggestedNextStep: string | null;
  sourceHealth: BackupSourceHealth[];
  isReadOnly: boolean;
  scopeSummary: string;
  providerEvidence: BackupProviderEvidence[];
  restoreProofs: BackupRestoreProof[];
};

async function apiRequest<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getBackupOverview() {
  return apiRequest<BackupOverviewResponse>("/api/backup/overview");
}

export function getBackupFindings() {
  return apiRequest<BackupFindingsResponse>("/api/backup/findings");
}

export function getBackupInventory(params: BackupInventoryParams = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  const url = query ? `/api/backup/systems?${query}` : "/api/backup/systems";

  return apiRequest<BackupInventoryResponse>(url);
}

export function getBackupSystemDetail(systemId: string) {
  return apiRequest<BackupSystemDetail>(`/api/backup/systems/${systemId}`);
}
