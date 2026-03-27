import { Link } from "react-router-dom";
import type { NetworkFinding } from "../../lib/network";

type NetworkFindingsQueueProps = {
  items: NetworkFinding[];
  emptyTitle?: string;
};

function toneForSeverity(severity: string) {
  switch (severity) {
    case "critical":
      return { color: "#7f1d1d", background: "#fecaca" };
    case "high":
      return { color: "#9a3412", background: "#fed7aa" };
    case "watch":
      return { color: "#854d0e", background: "#fde68a" };
    default:
      return { color: "#0f766e", background: "#ccfbf1" };
  }
}

function toneForFreshness(freshnessState: string) {
  switch (freshnessState) {
    case "healthy":
      return { color: "#166534", background: "#dcfce7" };
    case "warning":
      return { color: "#9a3412", background: "#ffedd5" };
    case "stale":
    case "error":
      return { color: "#7f1d1d", background: "#fee2e2" };
    default:
      return { color: "#334155", background: "#e2e8f0" };
  }
}

export function NetworkFindingsQueue({ items, emptyTitle }: NetworkFindingsQueueProps) {
  if (items.length === 0) {
    return (
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{emptyTitle ?? "No network findings need review right now"}</h2>
        <p style={{ marginBottom: 0, color: "#475569", lineHeight: 1.6 }}>
          The network queue is clear. Open inventory if you want to review scope, site coverage,
          or current freshness across all tracked resources.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => {
        const severityTone = toneForSeverity(item.severity);
        const freshnessTone = toneForFreshness(item.freshnessState);

        return (
          <Link
            key={item.findingId}
            to={`/network/resources/${item.resourceId}`}
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
              <div style={{ minWidth: 0, flex: "1 1 460px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      ...severityTone,
                    }}
                  >
                    {item.severity}
                  </span>
                  <span style={{ color: "#475569", fontSize: 13 }}>Queue rank #{item.queueRank}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}>{item.resourceKind}</span>
                  {item.siteName ? <span style={{ color: "#475569", fontSize: 13 }}>{item.siteName}</span> : null}
                </div>
                <h3 style={{ margin: "12px 0 8px", fontSize: "1.25rem" }}>{item.resourceName}</h3>
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

              <div
                style={{
                  minWidth: 168,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ ...statusCardStyle, ...freshnessTone }}>
                  <span style={statusLabelStyle}>freshnessState</span>
                  <strong>{item.freshnessState}</strong>
                </div>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>operationalStatus</span>
                  <strong>{item.operationalStatus ?? "Unknown"}</strong>
                </div>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>scope</span>
                  <strong>{item.scopeLabel ?? item.siteName ?? "Unknown"}</strong>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

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
