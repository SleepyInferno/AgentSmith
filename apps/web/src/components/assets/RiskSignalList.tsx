import type { AssetRiskSignal } from "../../lib/assets";

type RiskSignalListProps = {
  signals: AssetRiskSignal[];
};

export function RiskSignalList({ signals }: RiskSignalListProps) {
  if (signals.length === 0) {
    return (
      <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>
        No backend risk signals were returned for this device.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {signals.map((signal) => (
        <article
          key={signal.code}
          style={{
            borderRadius: 20,
            border: "1px solid rgba(148, 163, 184, 0.22)",
            background: "rgba(10, 17, 11, 0.97)",
            padding: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <strong>{signal.label}</strong>
            <span
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(129, 255, 164, 0.08)",
                color: "#9eb79b",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {signal.severity}
            </span>
          </div>
          <p style={{ margin: "10px 0 0", color: "#9eb79b", lineHeight: 1.6 }}>{signal.explanation}</p>
        </article>
      ))}
    </div>
  );
}
