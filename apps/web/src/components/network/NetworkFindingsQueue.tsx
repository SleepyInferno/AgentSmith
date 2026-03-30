import { Link } from "react-router-dom";
import type { NetworkFinding } from "../../lib/network";

type NetworkFindingsQueueProps = {
  items: NetworkFinding[];
  emptyTitle?: string;
};

function toneForSeverity(severity: string) {
  switch (severity) {
    case "critical":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.18)" };
    case "high":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.15)" };
    case "watch":
      return { color: "#fcd34d", background: "rgba(202, 138, 4, 0.15)" };
    default:
      return { color: "#5eead4", background: "rgba(20, 184, 166, 0.15)" };
  }
}

function toneForFreshness(freshnessState: string) {
  switch (freshnessState) {
    case "healthy":
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.12)" };
    case "warning":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
    case "stale":
    case "error":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    default:
      return { color: "#9eb79b", background: "rgba(129, 255, 164, 0.08)" };
  }
}

export function NetworkFindingsQueue({ items, emptyTitle }: NetworkFindingsQueueProps) {
  if (items.length === 0) {
    return (
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{emptyTitle ?? "No network findings need review right now"}</h2>
        <p style={{ marginBottom: 0, color: "#9eb79b", lineHeight: 1.6 }}>
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
                  <span style={{ color: "#9eb79b", fontSize: 13 }}>Queue rank #{item.queueRank}</span>
                  <span style={{ color: "#9eb79b", fontSize: 13 }}>{item.resourceKind}</span>
                  {item.siteName ? <span style={{ color: "#9eb79b", fontSize: 13 }}>{item.siteName}</span> : null}
                </div>
                <h3 style={{ margin: "12px 0 8px", fontSize: "1.25rem" }}>{item.resourceName}</h3>
                <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>{item.summary}</p>
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
