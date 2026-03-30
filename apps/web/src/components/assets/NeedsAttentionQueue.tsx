import { Link } from "react-router-dom";
import type { AssetQueueItem } from "../../lib/assets";

type NeedsAttentionQueueProps = {
  items: AssetQueueItem[];
};

function toneForRisk(riskLevel: string) {
  switch (riskLevel) {
    case "critical":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.18)" };
    case "high":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.15)" };
    case "watch":
      return { color: "#fcd34d", background: "rgba(202, 138, 4, 0.15)" };
    case "low":
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.15)" };
    default:
      return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
  }
}

export function NeedsAttentionQueue({ items }: NeedsAttentionQueueProps) {
  if (items.length === 0) {
    return (
      <section
        style={{
          padding: 24,
          borderRadius: 24,
          background: "rgba(10, 17, 11, 0.97)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>No risky devices right now</h2>
        <p style={{ marginBottom: 0, color: "#9eb79b", lineHeight: 1.6 }}>
          The queue is clear. Move into the inventory if you want to inspect healthy devices or
          confirm source coverage.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => {
        const tone = toneForRisk(item.riskLevel);

        return (
          <Link
            key={item.deviceId}
            to={`/devices/${item.deviceId}`}
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
              <div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      ...tone,
                    }}
                  >
                    {item.riskLevel}
                  </span>
                  <span style={{ color: "#9eb79b", fontSize: 13 }}>Queue rank #{item.queueRank}</span>
                </div>
                <h3 style={{ margin: "12px 0 8px", fontSize: "1.25rem" }}>{item.deviceName}</h3>
                <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>{item.summary}</p>
              </div>
              <div
                style={{
                  minWidth: 112,
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(10, 17, 11, 0.97)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9eb79b" }}>
                  riskScore
                </div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#dff4d3" }}>
                  {item.riskScore}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              {item.signals.slice(0, 2).map((signal) => (
                <span
                  key={signal.code}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 999,
                    background: "rgba(129, 255, 164, 0.08)",
                    color: "#9eb79b",
                    fontSize: 13,
                  }}
                >
                  {signal.label}
                </span>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
