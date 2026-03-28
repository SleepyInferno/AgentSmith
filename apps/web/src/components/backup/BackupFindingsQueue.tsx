import { Link } from "react-router-dom";
import type { BackupFinding } from "../../lib/backup";

type BackupFindingsQueueProps = {
  items: BackupFinding[];
  emptyTitle?: string;
};

function toneForConfidence(confidenceState: string) {
  switch (confidenceState) {
    case "high_risk":
      return { color: "#991b1b", background: "#fee2e2" };
    case "watch":
      return { color: "#9a3412", background: "#fed7aa" };
    case "unknown":
      return { color: "#1d4ed8", background: "#dbeafe" };
    default:
      return { color: "#166534", background: "#dcfce7" };
  }
}

function toneForCoverage(coverageState: string) {
  switch (coverageState) {
    case "missing":
      return { color: "#991b1b", background: "#fee2e2" };
    case "partial":
      return { color: "#9a3412", background: "#ffedd5" };
    case "excluded":
      return { color: "#475569", background: "#e2e8f0" };
    default:
      return { color: "#0f766e", background: "#ccfbf1" };
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

export function BackupFindingsQueue({ items, emptyTitle }: BackupFindingsQueueProps) {
  if (items.length === 0) {
    return (
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{emptyTitle ?? "No backup findings need review right now"}</h2>
        <p style={{ marginBottom: 0, color: "#475569", lineHeight: 1.6 }}>
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
              background: "#ffffff",
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
                  <span style={{ color: "#475569", fontSize: 13 }}>Queue rank #{item.queueRank}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}>{formatProvider(item.providerKey)}</span>
                  {item.siteName ? <span style={{ color: "#475569", fontSize: 13 }}>{item.siteName}</span> : null}
                </div>

                <h3 style={{ margin: "12px 0 8px", fontSize: "1.25rem" }}>{item.systemName}</h3>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{item.summary}</p>

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    color: "#334155",
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
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};

const statusCardStyle = {
  padding: 14,
  borderRadius: 18,
  background: "#eff6ff",
  color: "#0f172a",
  display: "grid",
  gap: 6,
};

const statusLabelStyle = {
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};
