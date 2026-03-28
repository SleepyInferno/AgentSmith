import type { BackupSystemDetail } from "../../lib/backup";

type BackupConfidenceBreakdownProps = {
  detail: BackupSystemDetail;
};

export function BackupConfidenceBreakdown({ detail }: BackupConfidenceBreakdownProps) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <DefinitionItem label="Coverage evidence" value={formatState(detail.coverageState)} />
      <DefinitionItem
        label="Freshness threshold"
        value={`${detail.policyWindow.backupFreshnessTarget} backup freshness${detail.policyWindow.graceWindow !== "Unknown" ? ` | ${detail.policyWindow.graceWindow} grace window` : ""}`}
      />
      <DefinitionItem
        label="Latest backup evidence"
        value={`${formatDateTime(detail.lastSuccessfulBackupAt)} (${formatState(detail.backupFreshnessState)})`}
      />
      <DefinitionItem
        label="Restore-test recency"
        value={`${formatDateTime(detail.lastRestoreTestAt)} (${formatState(detail.restoreFreshnessState)})`}
      />
      <DefinitionItem
        label={`Why ${detail.confidenceState} was assigned`}
        value={describeConfidence(detail)}
        emphasized
      />
      <DefinitionItem
        label="Suggested next step"
        value={detail.suggestedNextStep ?? "No follow-up was suggested for this system."}
      />
    </div>
  );
}

function describeConfidence(detail: BackupSystemDetail) {
  if (detail.coverageState === "excluded") {
    return "The current policy intentionally excludes this system, so the page records scope and evidence without expecting an active backup posture.";
  }

  if (detail.coverageState === "missing") {
    return "The policy expects backup coverage, but no matching provider evidence currently proves this system is protected.";
  }

  if (detail.confidenceState === "unknown") {
    return "Provider freshness or connector telemetry is unavailable, so the system cannot be classified as healthy or high-risk with confidence.";
  }

  if (detail.backupFreshnessState === "current" && detail.restoreFreshnessState === "stale") {
    return `Backups are within the ${detail.policyWindow.backupFreshnessTarget} target, but restore proof is older than the ${detail.policyWindow.restoreProofTarget} expectation.`;
  }

  if (detail.restoreFreshnessState === "missing") {
    return `Backup evidence is present, but no restore proof has been recorded against the ${detail.policyWindow.restoreProofTarget} policy window.`;
  }

  if (detail.backupFreshnessState === "stale") {
    return `The latest successful backup is older than the ${detail.policyWindow.backupFreshnessTarget} target, so the system remains outside the current backup window.`;
  }

  if (detail.coverageState === "partial") {
    return "Only part of the expected provider scope is currently covered, so the system stays on watch until every required workload reports current evidence.";
  }

  return "Coverage, backup freshness, and restore proof are all within the current policy window for this system.";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatState(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DefinitionItem(props: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: props.emphasized ? "#eef2ff" : "#f8fafc",
        border: "1px solid rgba(148, 163, 184, 0.16)",
        display: "grid",
        gap: 8,
      }}
    >
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#0f172a", lineHeight: 1.6, fontWeight: props.emphasized ? 700 : 600 }}>
        {props.value}
      </strong>
    </div>
  );
}

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};
