import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { BackupConfidenceBreakdown } from "../../components/backup/BackupConfidenceBreakdown";
import { BackupEvidenceTimeline } from "../../components/backup/BackupEvidenceTimeline";
import { BackupSourceHealthCard } from "../../components/backup/BackupSourceHealthCard";
import { getBackupSystemDetail, type BackupProviderEvidence, type BackupSystemDetail } from "../../lib/backup";

const trustBoundaryCopy = "Read-only evidence view - no backup jobs, restores, or exceptions can be executed here.";
const duplicateMatchMessage = "Duplicate match needs review";
const missingCoverageMessage = "Expected backup coverage is missing for this system";
const overdueRestoreMessage = "Backup evidence is current but restore proof is overdue";
const unknownTelemetryMessage = "Provider telemetry is unavailable, so confidence is unknown";
const excludedCoverageMessage = "This system is intentionally excluded from backup policy";

export function BackupDetailPage() {
  const { systemId = "" } = useParams();
  const detailQuery = useQuery({
    queryKey: ["backup-system-detail", systemId],
    queryFn: () => getBackupSystemDetail(systemId),
    enabled: systemId.length > 0,
  });

  if (detailQuery.isPending) {
    return <div style={panelStyle}>Loading backup detail...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div style={panelStyle}>Unable to load the selected backup system.</div>;
  }

  const detail = detailQuery.data;
  const providerEvidence = detail.providerEvidence;
  const operatorAttestedProofPresent = detail.restoreProofs.some((proof) => proof.evidenceSource === "operator_attested");
  const stateBadges = buildDetailStateBadges(detail, operatorAttestedProofPresent);

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Backup Detail" />
      <article
        style={{
          ...panelStyle,
          background: "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p style={eyebrowStyle}>Backup detail</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>{detail.systemName}</h2>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 780 }}>{detail.summary}</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/backup" style={ghostLinkStyle}>
              Back to overview
            </Link>
            <Link to="/backup/inventory" style={primaryLinkStyle}>
              Open protected-system inventory
            </Link>
          </div>
        </div>

        {detail.dataMode === "seeded_example" ? (
          <div style={seededBannerStyle}>Example backup data is shown until a live backup source is connected</div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <StatusChip label="confidenceState" value={detail.confidenceState} tone={toneForConfidence(detail.confidenceState)} />
          <StatusChip label="coverageState" value={detail.coverageState} tone={toneForCoverage(detail.coverageState)} />
          <StatusChip
            label="matchingConfidence"
            value={detail.matchingConfidence}
            tone={toneForMatchingConfidence(detail.matchingConfidence)}
          />
          <StatusChip label="backupFreshnessState" value={detail.backupFreshnessState} tone={toneForFreshness(detail.backupFreshnessState)} />
          <StatusChip label="restoreFreshnessState" value={detail.restoreFreshnessState} tone={toneForFreshness(detail.restoreFreshnessState)} />
          <StatusChip label="evidenceSource" value={detail.evidenceSource ?? "unknown"} tone={toneForEvidenceSource(detail.evidenceSource)} />
        </div>

        {stateBadges.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            {stateBadges.map((badge) => (
              <span key={badge} style={{ ...stateBadgeStyle, ...toneForStateBadge(badge) }}>
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        <div style={trustNoteStyle}>
          <strong style={{ color: "#0f172a" }}>{trustBoundaryCopy}</strong>
          <span style={{ color: "#475569", lineHeight: 1.6 }}>
            Matching confidence and evidence provenance stay visible before the operator decides what to review next.
          </span>
        </div>

        <div style={{ ...calloutStyle, ...toneForCallout(detail) }}>{getStateMessage(detail)}</div>
      </article>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(300px, 0.95fr)",
          gap: 20,
        }}
      >
        <article style={panelStyle}>
          <p style={eyebrowStyle}>Confidence breakdown</p>
          <h3 style={{ marginTop: 10 }}>Confidence breakdown</h3>
          <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
            Coverage, freshness thresholds, and restore-test recency are explained here so the current confidenceState never looks like an opaque status pill.
          </p>
          <BackupConfidenceBreakdown detail={detail} />
        </article>

        <article style={panelStyle}>
          <p style={eyebrowStyle}>Policy window</p>
          <h3 style={{ marginTop: 10 }}>Policy window</h3>
          <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
            Provider scope and review thresholds come from the server-owned policy summary for this system.
          </p>
          <div style={definitionGridStyle}>
            <DefinitionItem label="Provider scope" value={detail.policyWindow.providerScope} />
            <DefinitionItem label="Backup freshness target" value={detail.policyWindow.backupFreshnessTarget} />
            <DefinitionItem label="Restore proof target" value={detail.policyWindow.restoreProofTarget} />
            <DefinitionItem label="Grace window" value={detail.policyWindow.graceWindow} />
            <DefinitionItem label="Last successful backup" value={formatDateTime(detail.lastSuccessfulBackupAt)} />
            <DefinitionItem label="Last restore test" value={formatDateTime(detail.lastRestoreTestAt)} />
          </div>
        </article>
      </section>

      <article style={panelStyle}>
        <p style={eyebrowStyle}>Coverage evidence</p>
        <h3 style={{ marginTop: 10 }}>Coverage evidence</h3>
        <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
          Provider-backed workload evidence explains what is covered, what is stale, and which telemetry the system currently depends on.
        </p>
        {providerEvidence.length === 0 ? (
          <div style={emptyStateStyle}>
            No provider evidence was returned for this system. Review the policy window and source health to understand whether this is expected.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {providerEvidence.map((item) => (
              <CoverageEvidenceCard key={item.evidenceId} item={item} />
            ))}
          </div>
        )}
      </article>

      <article style={panelStyle}>
        <p style={eyebrowStyle}>Restore proof</p>
        <h3 style={{ marginTop: 10 }}>Restore proof</h3>
        <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
          The timeline shows the latest successful backup, the last failed backup, the latest restore proof, and any operator-attested evidence in chronological order.
        </p>
        <BackupEvidenceTimeline entries={detail.timeline} />
      </article>

      <section style={{ display: "grid", gap: 16 }}>
        <article style={panelStyle}>
          <p style={eyebrowStyle}>Source health</p>
          <h3 style={{ marginTop: 10 }}>Source health</h3>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            Provider freshness, connector freshness, evidence source, and the read-only trust boundary are disclosed here before any operator decides what to review next.
          </p>
        </article>

        {detail.sourceHealth.length === 0 ? (
          <div style={emptyStateStyle}>No provider source-health rows were returned for this system.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {detail.sourceHealth.map((source) => (
              <BackupSourceHealthCard
                key={source.providerKey}
                source={source}
                evidenceSources={getEvidenceSources(detail, source.providerKey)}
                isReadOnly={detail.isReadOnly}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function getStateMessage(detail: BackupSystemDetail) {
  if (detail.matchingConfidence === "duplicate") {
    return duplicateMatchMessage;
  }

  if (detail.coverageState === "excluded") {
    return excludedCoverageMessage;
  }

  if (detail.coverageState === "missing") {
    return missingCoverageMessage;
  }

  if (detail.confidenceState === "unknown") {
    return unknownTelemetryMessage;
  }

  if (detail.backupFreshnessState === "current" && detail.restoreFreshnessState === "stale") {
    return overdueRestoreMessage;
  }

  return detail.summary;
}

function buildDetailStateBadges(detail: BackupSystemDetail, operatorAttestedProofPresent: boolean) {
  const badges = new Set<string>();

  if (detail.coverageState === "excluded") {
    badges.add("Excluded by policy");
  }

  if (detail.matchingConfidence === "duplicate") {
    badges.add("Duplicate match needs review");
  }

  if (detail.confidenceState === "unknown" || detail.sourceHealth.some((source) => source.state !== "current")) {
    badges.add("Telemetry unknown");
  }

  if (operatorAttestedProofPresent || detail.evidenceSource === "operator_attested") {
    badges.add("Operator-attested proof");
  }

  return [...badges];
}

function toneForStateBadge(badge: string) {
  if (badge === "Excluded by policy") {
    return { color: "#334155", background: "#e2e8f0" };
  }

  if (badge === "Duplicate match needs review") {
    return { color: "#9a3412", background: "#ffedd5" };
  }

  if (badge === "Telemetry unknown") {
    return { color: "#1d4ed8", background: "#dbeafe" };
  }

  return { color: "#0369a1", background: "#e0f2fe" };
}

function getEvidenceSources(detail: BackupSystemDetail, providerKey: string) {
  const sources = new Set<string>();
  const providerEvidenceIds = new Set(
    detail.providerEvidence.filter((item) => item.providerKey === providerKey).map((item) => item.evidenceId),
  );

  if (providerEvidenceIds.size > 0) {
    sources.add("provider_sync");
  }

  for (const proof of detail.restoreProofs) {
    if (proof.backupEvidenceId === null || providerEvidenceIds.has(proof.backupEvidenceId)) {
      sources.add(proof.evidenceSource);
    }
  }

  return [...sources];
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

function toneForConfidence(value: string) {
  switch (value) {
    case "high_risk":
      return { color: "#991b1b", background: "#fee2e2" };
    case "watch":
      return { color: "#9a3412", background: "#ffedd5" };
    case "unknown":
      return { color: "#1d4ed8", background: "#dbeafe" };
    case "healthy":
    default:
      return { color: "#166534", background: "#dcfce7" };
  }
}

function toneForMatchingConfidence(value: string) {
  switch (value) {
    case "duplicate":
      return { color: "#9a3412", background: "#ffedd5" };
    case "unknown":
      return { color: "#1d4ed8", background: "#dbeafe" };
    case "confirmed":
    default:
      return { color: "#166534", background: "#dcfce7" };
  }
}

function toneForCoverage(value: string) {
  switch (value) {
    case "missing":
      return { color: "#991b1b", background: "#fee2e2" };
    case "partial":
      return { color: "#9a3412", background: "#ffedd5" };
    case "excluded":
      return { color: "#334155", background: "#e2e8f0" };
    case "unknown":
      return { color: "#1d4ed8", background: "#dbeafe" };
    case "protected":
    default:
      return { color: "#0f766e", background: "#ccfbf1" };
  }
}

function toneForEvidenceSource(value: string | null) {
  if (value === "operator_attested") {
    return { color: "#0369a1", background: "#e0f2fe" };
  }

  if (value === "provider_sync") {
    return { color: "#0f766e", background: "#ccfbf1" };
  }

  return { color: "#334155", background: "#e2e8f0" };
}

function toneForFreshness(value: string) {
  switch (value) {
    case "stale":
      return { color: "#9a3412", background: "#ffedd5" };
    case "missing":
      return { color: "#991b1b", background: "#fee2e2" };
    case "unknown":
      return { color: "#1d4ed8", background: "#dbeafe" };
    case "current":
    default:
      return { color: "#166534", background: "#dcfce7" };
  }
}

function toneForCallout(detail: BackupSystemDetail) {
  if (detail.coverageState === "excluded") {
    return { color: "#334155", background: "#e2e8f0", borderColor: "rgba(148, 163, 184, 0.4)" };
  }

  if (detail.coverageState === "missing" || detail.confidenceState === "high_risk") {
    return { color: "#991b1b", background: "#fee2e2", borderColor: "rgba(239, 68, 68, 0.28)" };
  }

  if (detail.confidenceState === "unknown") {
    return { color: "#1d4ed8", background: "#dbeafe", borderColor: "rgba(59, 130, 246, 0.28)" };
  }

  if (detail.restoreFreshnessState === "stale" || detail.backupFreshnessState === "stale") {
    return { color: "#9a3412", background: "#ffedd5", borderColor: "rgba(249, 115, 22, 0.28)" };
  }

  return { color: "#166534", background: "#dcfce7", borderColor: "rgba(34, 197, 94, 0.28)" };
}

function StatusChip(props: { label: string; value: string; tone: { color: string; background: string } }) {
  return (
    <span style={{ ...chipStyle, ...props.tone }}>
      {props.label}: {formatState(props.value)}
    </span>
  );
}

function DefinitionItem(props: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "#f8fafc",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        display: "grid",
        gap: 6,
      }}
    >
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#0f172a", lineHeight: 1.5 }}>{props.value}</strong>
    </div>
  );
}

function CoverageEvidenceCard(props: { item: BackupProviderEvidence }) {
  return (
    <article
      style={{
        padding: 18,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ display: "block", color: "#0f172a", fontSize: "1rem" }}>
            {props.item.providerKey} | {props.item.workloadKind}
          </strong>
          <span style={{ color: "#475569", lineHeight: 1.5 }}>{props.item.summary}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ ...chipStyle, ...toneForCoverage(props.item.coverageState) }}>
            {formatState(props.item.coverageState)}
          </span>
          <span style={{ ...chipStyle, ...toneForFreshness(props.item.connectorFreshnessState) }}>
            {formatState(props.item.connectorFreshnessState)}
          </span>
        </div>
      </div>

      <div style={definitionGridStyle}>
        <DefinitionItem label="lastSuccessfulBackupAt" value={formatDateTime(props.item.lastSuccessfulBackupAt)} />
        <DefinitionItem label="lastFailedBackupAt" value={formatDateTime(props.item.lastFailedBackupAt)} />
        <DefinitionItem label="lastObservedAt" value={formatDateTime(props.item.lastObservedAt)} />
        <DefinitionItem label="sourceSystem" value={props.item.sourceSystem} />
      </div>
    </article>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#0369a1",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
};

const definitionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const chipStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const calloutStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  border: "1px solid",
  fontWeight: 700,
  lineHeight: 1.6,
};

const trustNoteStyle = {
  marginTop: 16,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 8,
};

const stateBadgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#0f172a",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 600,
};

const ghostLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 600,
};

const seededBannerStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid rgba(245, 158, 11, 0.35)",
  fontWeight: 600,
};

const emptyStateStyle = {
  padding: 18,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  color: "#475569",
  lineHeight: 1.6,
};
