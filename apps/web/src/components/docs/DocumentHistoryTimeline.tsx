import type { DocumentationHistoryEntry } from "../../lib/docs";

type DocumentHistoryTimelineProps = {
  history: DocumentationHistoryEntry[];
};

export function DocumentHistoryTimeline({ history }: DocumentHistoryTimelineProps) {
  return (
    <article style={panelStyle}>
      <p style={eyebrowStyle}>Review history</p>
      <h3 style={{ margin: "10px 0 8px" }}>Review history</h3>
      <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
        Source syncs, metadata reviews, and review-completion checkpoints stay visible in chronological order so staleness is never hidden behind raw timestamps.
      </p>

      {history.length === 0 ? (
        <div style={emptyStateStyle}>No document history is recorded for this item yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {history.map((entry) => (
            <article key={entry.revisionId} style={timelineItemStyle}>
              <div style={timelineRailStyle} aria-hidden="true" />
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ ...typeChipStyle, ...toneForRevisionType(entry.revisionType) }}>
                        {formatLabel(entry.revisionType)}
                      </span>
                      <span style={{ color: "#475569", fontSize: 13 }}>{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <strong style={{ display: "block", marginTop: 10, color: "#0f172a" }}>{entry.summary}</strong>
                  </div>
                  <span style={metaBadgeStyle}>{formatLabel(entry.reviewState)}</span>
                </div>

                <div style={metaGridStyle}>
                  <DefinitionItem label="Actor" value={entry.actorLabel ?? "System"} />
                  <DefinitionItem label="Review due" value={formatDateTime(entry.reviewDueAt)} />
                  <DefinitionItem
                    label="Changed fields"
                    value={entry.changedFields.length > 0 ? entry.changedFields.join(", ") : "No field list recorded"}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}

function DefinitionItem(props: { label: string; value: string }) {
  return (
    <div style={definitionItemStyle}>
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#0f172a", lineHeight: 1.5 }}>{props.value}</strong>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toneForRevisionType(revisionType: string) {
  switch (revisionType) {
    case "source_sync":
      return { color: "#1d4ed8", background: "#dbeafe" };
    case "metadata_review":
      return { color: "#9a3412", background: "#ffedd5" };
    case "review_completed":
    default:
      return { color: "#166534", background: "#dcfce7" };
  }
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
  display: "grid",
  gap: 16,
};

const timelineItemStyle = {
  display: "grid",
  gridTemplateColumns: "18px minmax(0, 1fr)",
  gap: 14,
  padding: 18,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
};

const timelineRailStyle = {
  width: 4,
  borderRadius: 999,
  background: "linear-gradient(180deg, #38bdf8, #0f172a)",
};

const typeChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const metaBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
  height: "fit-content",
};

const metaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const definitionItemStyle = {
  padding: 12,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 6,
};

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const emptyStateStyle = {
  padding: "16px 18px",
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  color: "#475569",
  lineHeight: 1.6,
};
