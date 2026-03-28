import { apiGet } from "./api";

export type BackupDataMode = "live" | "seeded_example" | string;
export type BackupCoverageState = "protected" | "missing" | "partial" | "excluded" | "unknown" | string;
export type BackupConfidenceState = "healthy" | "watch" | "high_risk" | "unknown" | string;
export type BackupRestoreState = "current" | "stale" | "missing" | "unknown" | string;
export type BackupSourceHealthState = BackupRestoreState | "error" | string;
export type BackupMatchingConfidence = "confirmed" | "duplicate" | "unknown" | string;

export type BackupSourceHealth = {
  providerKey: string;
  providerLabel: string;
  state: BackupSourceHealthState;
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
  findings: BackupFinding[];
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
  matchingConfidence: BackupMatchingConfidence;
  lastSuccessfulBackupAt: string | null;
  lastRestoreTestAt: string | null;
  evidenceSource: string | null;
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

export type BackupPolicyWindow = {
  scopeSummary: string;
  providerScope: string;
  backupFreshnessTarget: string;
  restoreProofTarget: string;
  graceWindow: string;
  backupFreshnessHours: number | null;
  restoreProofDays: number | null;
  graceWindowHours: number | null;
  isExcluded: boolean;
};

export type BackupTimelineEntry = {
  id: string;
  type: "successful_backup" | "failed_backup" | "restore_proof" | "operator_attested";
  occurredAt: string;
  title: string;
  summary: string;
  providerKey: string | null;
  workloadKind: string | null;
  evidenceSource: string | null;
  outcome: string | null;
  ticketRef: string | null;
  recoveryPointAt: string | null;
};

type BackupSystemDetailResponse = {
  dataMode: BackupDataMode;
  systemId: string;
  systemName: string;
  category: string | null;
  siteName: string | null;
  providerKey: string | null;
  coverageState: BackupCoverageState;
  confidenceState: BackupConfidenceState;
  matchingConfidence: BackupMatchingConfidence;
  lastSuccessfulBackupAt: string | null;
  lastRestoreTestAt: string | null;
  evidenceSource: string | null;
  summary: string;
  suggestedNextStep: string | null;
  sourceHealth: BackupSourceHealth[];
  isReadOnly: boolean;
  scopeSummary: string;
  providerEvidence: BackupProviderEvidence[];
  restoreProofs: BackupRestoreProof[];
};

export type BackupSystemDetail = BackupSystemDetailResponse & {
  policyWindow: BackupPolicyWindow;
  timeline: BackupTimelineEntry[];
  backupFreshnessState: BackupRestoreState;
  restoreFreshnessState: BackupRestoreState;
};

export function getBackupOverview() {
  return apiGet<BackupOverviewResponse>("/api/backup/overview");
}

export function getBackupFindings() {
  return apiGet<BackupFindingsResponse>("/api/backup/findings");
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

  return apiGet<BackupInventoryResponse>(url);
}

export async function getBackupSystemDetail(systemId: string) {
  const detail = await apiGet<BackupSystemDetailResponse>(`/api/backup/systems/${systemId}`);
  const policyWindow = parsePolicyWindow(detail.scopeSummary);

  return {
    ...detail,
    policyWindow,
    timeline: buildBackupTimeline(detail),
    backupFreshnessState: deriveBackupFreshnessState(detail, policyWindow),
    restoreFreshnessState: deriveRestoreFreshnessState(detail, policyWindow),
  } satisfies BackupSystemDetail;
}

function parsePolicyWindow(scopeSummary: string): BackupPolicyWindow {
  if (scopeSummary.toLowerCase().includes("excluded from backup policy")) {
    return {
      scopeSummary,
      providerScope: "Excluded from backup policy",
      backupFreshnessTarget: "Not applicable",
      restoreProofTarget: "Not applicable",
      graceWindow: "Not applicable",
      backupFreshnessHours: null,
      restoreProofDays: null,
      graceWindowHours: null,
      isExcluded: true,
    };
  }

  const [providerScopePart, policyWindowPart] = scopeSummary.split("Policy window:");
  const [backupFreshnessTarget = "Unknown", restoreProofTarget = "Unknown", graceWindow = "Unknown"] =
    (policyWindowPart ?? "")
      .split(",")
      .map((part) => sanitizePolicyWindowPart(part));

  return {
    scopeSummary,
    providerScope: sanitizeProviderScope(providerScopePart),
    backupFreshnessTarget,
    restoreProofTarget,
    graceWindow,
    backupFreshnessHours: parseDurationValue(backupFreshnessTarget, "h"),
    restoreProofDays: parseDurationValue(restoreProofTarget, "d"),
    graceWindowHours: parseDurationValue(graceWindow, "h"),
    isExcluded: false,
  };
}

function buildBackupTimeline(detail: BackupSystemDetailResponse): BackupTimelineEntry[] {
  const entries = new Map<string, BackupTimelineEntry>();
  const latestSuccessfulEvidence = detail.providerEvidence
    .filter((item) => item.lastSuccessfulBackupAt)
    .sort((left, right) => compareDateValues(right.lastSuccessfulBackupAt, left.lastSuccessfulBackupAt))[0];
  const latestFailedEvidence = detail.providerEvidence
    .filter((item) => item.lastFailedBackupAt)
    .sort((left, right) => compareDateValues(right.lastFailedBackupAt, left.lastFailedBackupAt))[0];
  const latestRestoreProof = detail.restoreProofs
    .slice()
    .sort((left, right) => compareDateValues(right.testedAt, left.testedAt))[0];

  if (latestSuccessfulEvidence?.lastSuccessfulBackupAt) {
    entries.set(`success-${latestSuccessfulEvidence.evidenceId}`, {
      id: `success-${latestSuccessfulEvidence.evidenceId}`,
      type: "successful_backup",
      occurredAt: latestSuccessfulEvidence.lastSuccessfulBackupAt,
      title: "Latest successful backup",
      summary: latestSuccessfulEvidence.summary,
      providerKey: latestSuccessfulEvidence.providerKey,
      workloadKind: latestSuccessfulEvidence.workloadKind,
      evidenceSource: "provider_sync",
      outcome: null,
      ticketRef: null,
      recoveryPointAt: null,
    });
  }

  if (latestFailedEvidence?.lastFailedBackupAt) {
    entries.set(`failure-${latestFailedEvidence.evidenceId}`, {
      id: `failure-${latestFailedEvidence.evidenceId}`,
      type: "failed_backup",
      occurredAt: latestFailedEvidence.lastFailedBackupAt,
      title: "Last failed backup",
      summary: latestFailedEvidence.summary,
      providerKey: latestFailedEvidence.providerKey,
      workloadKind: latestFailedEvidence.workloadKind,
      evidenceSource: "provider_sync",
      outcome: "failure",
      ticketRef: null,
      recoveryPointAt: null,
    });
  }

  if (latestRestoreProof) {
    entries.set(latestRestoreProof.restoreTestId, mapRestoreProofToTimelineEntry(latestRestoreProof, true));
  }

  for (const proof of detail.restoreProofs.filter((item) => item.evidenceSource === "operator_attested")) {
    if (entries.has(proof.restoreTestId)) {
      continue;
    }

    entries.set(proof.restoreTestId, mapRestoreProofToTimelineEntry(proof, false));
  }

  return [...entries.values()].sort((left, right) => compareDateValues(right.occurredAt, left.occurredAt));
}

function mapRestoreProofToTimelineEntry(
  proof: BackupRestoreProof,
  isLatestRestoreProof: boolean,
): BackupTimelineEntry {
  return {
    id: proof.restoreTestId,
    type: proof.evidenceSource === "operator_attested" ? "operator_attested" : "restore_proof",
    occurredAt: proof.testedAt,
    title:
      proof.evidenceSource === "operator_attested"
        ? isLatestRestoreProof
          ? "Latest operator-attested restore proof"
          : "Operator-attested restore proof"
        : "Latest restore proof",
    summary: proof.notes ?? "Restore-proof evidence recorded for this system.",
    providerKey: null,
    workloadKind: null,
    evidenceSource: proof.evidenceSource,
    outcome: proof.outcome,
    ticketRef: proof.ticketRef,
    recoveryPointAt: proof.recoveryPointAt,
  };
}

function deriveBackupFreshnessState(
  detail: BackupSystemDetailResponse,
  policyWindow: BackupPolicyWindow,
): BackupRestoreState {
  if (policyWindow.isExcluded || detail.coverageState === "excluded") {
    return "unknown";
  }

  if (detail.coverageState === "missing") {
    return "missing";
  }

  if (!detail.lastSuccessfulBackupAt) {
    return detail.confidenceState === "unknown" ? "unknown" : "missing";
  }

  if (policyWindow.backupFreshnessHours === null) {
    return "current";
  }

  const ageHours = getAgeInHours(detail.lastSuccessfulBackupAt);
  if (ageHours === null) {
    return "unknown";
  }

  return ageHours <= policyWindow.backupFreshnessHours ? "current" : "stale";
}

function deriveRestoreFreshnessState(
  detail: BackupSystemDetailResponse,
  policyWindow: BackupPolicyWindow,
): BackupRestoreState {
  if (policyWindow.isExcluded || detail.coverageState === "excluded") {
    return "unknown";
  }

  if (!detail.lastRestoreTestAt) {
    return detail.confidenceState === "unknown" ? "unknown" : "missing";
  }

  if (policyWindow.restoreProofDays === null) {
    return "current";
  }

  const ageDays = getAgeInDays(detail.lastRestoreTestAt);
  if (ageDays === null) {
    return "unknown";
  }

  return ageDays <= policyWindow.restoreProofDays ? "current" : "stale";
}

function sanitizeProviderScope(value: string | undefined) {
  return sanitizePolicyWindowPart(value ?? "No provider scope assigned");
}

function sanitizePolicyWindowPart(value: string) {
  return value.trim().replace(/\.$/, "") || "Unknown";
}

function parseDurationValue(value: string, unit: "h" | "d") {
  const match = value.match(new RegExp(`(\\d+)${unit}`));
  return match ? Number.parseInt(match[1] ?? "", 10) : null;
}

function compareDateValues(left: string | null, right: string | null) {
  if (left === right) {
    return 0;
  }

  if (!left) {
    return -1;
  }

  if (!right) {
    return 1;
  }

  return new Date(left).valueOf() - new Date(right).valueOf();
}

function getAgeInHours(value: string | null) {
  if (!value) {
    return null;
  }

  return (Date.now() - new Date(value).valueOf()) / (1000 * 60 * 60);
}

function getAgeInDays(value: string | null) {
  if (!value) {
    return null;
  }

  return (Date.now() - new Date(value).valueOf()) / (1000 * 60 * 60 * 24);
}
