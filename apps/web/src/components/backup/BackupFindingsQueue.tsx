import { Link } from "react-router-dom";
import type { BackupFinding } from "../../lib/backup";

type BackupFindingsQueueProps = {
  items: BackupFinding[];
  emptyTitle?: string;
};

function toneForConfidence(confidenceState: string) {
  switch (confidenceState) {
    case "high_risk":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    case "watch":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.15)" };
    case "unknown":
      return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
    default:
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.12)" };
  }
}

function toneForCoverage(coverageState: string) {
  switch (coverageState) {
    case "missing":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    case "partial":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
    case "excluded":
      return { color: "#9eb79b", background: "rgba(129, 255, 164, 0.08)" };
    default:
      return { color: "#5eead4", background: "rgba(20, 184, 166, 0.15)" };
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatProvider(providerKey: string | null) {
  return providerKey ?? "Provider unknown";
}

function buildFindingBadges(item: BackupFinding) {
  const badges: string[] = [];

  if (item.matchingConfidence === "duplicate") {
    badges.push("Duplicate match needs review");
  }

  if (item.sourceHealth && item.sourceHealth.state !== "current" && item.confidenceState === "unknown") {
    badges.push("Telemetry unknown");
  }

  if (item.evidenceSource === "operator_attested") {
    badges.push("Operator-attested proof");
  }

  if (item.coverageState === "excluded") {
    badges.push("Excluded by policy");
  }

  return badges;
}

function toneForBadge(label: string) {
  if (label === "Duplicate match needs review") {
    return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
  }

  if (label === "Telemetry unknown") {
    return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
  }

  if (label === "Operator-attested proof") {
    return { color: "#89ff93", background: "rgba(59, 130, 246, 0.15)" };
  }

  return { color: "#9eb79b", background: "rgba(129, 255, 164, 0.08)" };
}

export function BackupFindingsQueue({ items, emptyTitle }: BackupFindingsQueueProps) {
  if (items.length === 0) {
    return (
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{emptyTitle ?? "No backup findings need review right now"}</h2>
        <p style={{ marginBottom: 0, color: "#9eb79b", lineHeight: 1.6 }}>
          The backup queue is clear. Open inventory if you want to review excluded scope, provider
          alignment, or the wider protected-system baseline.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => {
        const confidenceTone = toneForConfidence(item.confidenceState);
        const coverageTone = toneForCoverage(item.coverageState);
        const badges = buildFindingBadges(item);

        return (
          <Link
            key={item.findingId}
            to={`/backup/systems/${item.systemId}`}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              borderRadius: 24,
              padding: 20,
              background: "rgba(10, 17, 11, 0.97)",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              boxShadow: "0 12px 36px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 520px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ ...chipStyle, ...confidenceTone }}>{item.confidenceState}</span>
                  <span style={{ ...chipStyle, ...coverageTone }}>{item.coverageState}</span>
                  <span style={{ color: "#9eb79b", fontSize: 13 }}>Queue rank #{item.queueRank}</span>
                  <span style={{ color: "#9eb79b", fontSize: 13 }}>{formatProvider(item.providerKey)}</span>
                  {item.siteName ? <span style={{ color: "#9eb79b", fontSize: 13 }}>{item.siteName}</span> : null}
                </div>

                <h3 style={{ margin: "12px 0 8px", fontSize: "1.25rem" }}>{item.systemName}</h3>
                <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>{item.summary}</p>

                {badges.length > 0 ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    {badges.map((badge) => (
                      <span key={badge} style={{ ...chipStyle, ...toneForBadge(badge), textTransform: "none", letterSpacing: "normal" }}>
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 18,
                    background: "rgba(10, 17, 11, 0.97)",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    color: "#9eb79b",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 6 }}>suggestedNextStep</strong>
                  <span>{item.suggestedNextStep}</span>
                </div>
              </div>

              <div style={{ minWidth: 220, display: "grid", gap: 10 }}>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>lastSuccessfulBackupAt</span>
                  <strong>{formatDateTime(item.lastSuccessfulBackupAt)}</strong>
                </div>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>lastRestoreTestAt</span>
                  <strong>{formatDateTime(item.lastRestoreTestAt)}</strong>
                </div>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>sourceHealth</span>
                  <strong>{item.sourceHealth?.summary ?? "No provider telemetry attached"}</strong>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const chipStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};

const statusCardStyle = {
  padding: 14,
  borderRadius: 18,
  background: "rgba(10, 17, 11, 0.97)",
  color: "#dff4d3",
  display: "grid",
  gap: 6,
};

const statusLabelStyle = {
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};
