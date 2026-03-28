import type {
  BackupConfidenceState,
  BackupCoverageMode,
  BackupCoverageState,
  BackupDataMode,
  BackupEvidenceSource,
  BackupFindingItem,
  BackupOverviewCard,
  BackupRestoreOutcome,
  BackupRestoreState,
} from "./backup.types.js";

export type BackupAssessmentRow = {
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
  latestRestoreOutcome: BackupRestoreOutcome | null;
  withinBackupGraceWindow: boolean;
  telemetryUnavailable: boolean;
};

const confidenceOrder: Record<BackupConfidenceState, number> = {
  high_risk: 0,
  unknown: 1,
  watch: 2,
  healthy: 3,
};

const criticalityOrder: Record<string, number> = {
  tier_0: 0,
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

export function buildBackupSuggestedNextStep(row: BackupAssessmentRow): string {
  if (row.coverageMode === "excluded" || row.coverageState === "excluded") {
    return "System is intentionally excluded from backup policy";
  }

  if (row.telemetryUnavailable || row.confidenceState === "unknown" || row.coverageState === "unknown") {
    return "Investigate provider telemetry freshness";
  }

  if (row.coverageState === "missing") {
    return "Confirm the system is enrolled in backup policy";
  }

  if (
    row.latestRestoreOutcome === "failure" ||
    row.restoreFreshnessState === "stale" ||
    row.restoreFreshnessState === "missing"
  ) {
    return "Schedule a restore test";
  }

  if (row.backupFreshnessState === "stale" || row.withinBackupGraceWindow) {
    return "Review the last successful backup job";
  }

  if (row.coverageState === "partial") {
    return "Confirm the system is enrolled in backup policy";
  }

  return row.suggestedNextStep ?? "No action required.";
}

export function buildBackupFindingQueue(rows: BackupAssessmentRow[]): BackupFindingItem[] {
  return rows
    .filter((row) => row.coverageMode !== "excluded" && row.coverageState !== "excluded" && row.confidenceState !== "healthy")
    .sort((left, right) => {
      const leftPriority = getQueuePriority(left);
      const rightPriority = getQueuePriority(right);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (confidenceOrder[left.confidenceState] !== confidenceOrder[right.confidenceState]) {
        return confidenceOrder[left.confidenceState] - confidenceOrder[right.confidenceState];
      }

      const leftCriticality = criticalityOrder[left.criticality ?? ""] ?? Number.MAX_SAFE_INTEGER;
      const rightCriticality = criticalityOrder[right.criticality ?? ""] ?? Number.MAX_SAFE_INTEGER;
      if (leftCriticality !== rightCriticality) {
        return leftCriticality - rightCriticality;
      }

      return left.systemName.localeCompare(right.systemName);
    })
    .map((row, index) => ({
      findingId: `finding-${row.systemId}`,
      systemId: row.systemId,
      systemName: row.systemName,
      category: row.category,
      siteName: row.siteName,
      ownerTeam: row.ownerTeam,
      criticality: row.criticality,
      coverageMode: row.coverageMode,
      coverageState: row.coverageState,
      confidenceState: row.confidenceState,
      providerKey: row.providerKey,
      workloadKind: row.workloadKind,
      backupFreshnessState: row.backupFreshnessState,
      restoreFreshnessState: row.restoreFreshnessState,
      summary: row.summary,
      suggestedNextStep: buildBackupSuggestedNextStep(row),
      queueRank: index + 1,
      lastSuccessfulBackupAt: row.lastSuccessfulBackupAt,
      lastRestoreTestedAt: row.lastRestoreTestedAt,
      dataMode: row.dataMode,
    }));
}

export function buildBackupOverviewCards(rows: BackupAssessmentRow[]): BackupOverviewCard[] {
  const protectedRows = rows.filter((row) => row.coverageMode === "required");
  const excludedCount = rows.filter((row) => row.coverageMode === "excluded").length;

  return [
    {
      key: "protected_systems",
      label: "Protected systems",
      value: protectedRows.length,
      tone: "neutral",
      summary: `${protectedRows.length} system${protectedRows.length === 1 ? "" : "s"} require backup coverage.`,
    },
    {
      key: "healthy",
      label: "Healthy",
      value: protectedRows.filter((row) => row.confidenceState === "healthy").length,
      tone: "healthy",
      summary: "Systems currently meet both backup and restore-proof policy.",
    },
    {
      key: "watch",
      label: "Watch",
      value: protectedRows.filter((row) => row.confidenceState === "watch").length,
      tone: "watch",
      summary: "Systems need review before they turn into confirmed risk.",
    },
    {
      key: "high_risk",
      label: "High risk",
      value: protectedRows.filter((row) => row.confidenceState === "high_risk").length,
      tone: "high_risk",
      summary: "Systems require backup or restore-proof intervention.",
    },
    {
      key: "unknown",
      label: "Unknown",
      value: protectedRows.filter((row) => row.confidenceState === "unknown").length,
      tone: "unknown",
      summary: "Systems lack trustworthy provider telemetry.",
    },
    {
      key: "excluded",
      label: "Excluded",
      value: excludedCount,
      tone: "neutral",
      summary: "Systems intentionally excluded from backup obligations.",
    },
  ];
}

function getQueuePriority(row: BackupAssessmentRow): number {
  if (row.coverageState === "missing") {
    return 0;
  }

  if (row.latestRestoreOutcome === "failure") {
    return 1;
  }

  if (row.restoreFreshnessState === "stale" || row.restoreFreshnessState === "missing") {
    return 2;
  }

  if (row.backupFreshnessState === "stale") {
    return 3;
  }

  if (row.telemetryUnavailable || row.coverageState === "unknown" || row.confidenceState === "unknown") {
    return 4;
  }

  if (row.coverageState === "partial") {
    return 5;
  }

  if (row.withinBackupGraceWindow || row.confidenceState === "watch") {
    return 6;
  }

  return 7;
}
