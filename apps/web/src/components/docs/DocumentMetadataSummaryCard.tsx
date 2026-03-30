type DocumentMetadataSummaryCardProps = {
  owner: string | null;
  site: string | null;
  category: string | null;
  reviewState: string;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  reviewAgeLabel: string;
  nextReviewStatus: string;
  historyHighlights: string[];
  suggestedNextStep: string | null;
};

export function DocumentMetadataSummaryCard({
  owner,
  site,
  category,
  reviewState,
  reviewDueAt,
  lastReviewedAt,
  sourceUpdatedAt,
  reviewAgeLabel,
  nextReviewStatus,
  historyHighlights,
  suggestedNextStep,
}: DocumentMetadataSummaryCardProps) {
  return (
    <article style={panelStyle}>
      <p style={eyebrowStyle}>Next review window</p>
      <h3 style={{ margin: "10px 0 8px" }}>Next review window</h3>
      <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>
        Review age, due-window status, and recent history are summarized together before any metadata review is opened.
      </p>

      <div style={statusHeroStyle}>
        <strong style={{ fontSize: "1.2rem", color: "#dff4d3" }}>{nextReviewStatus}</strong>
        <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>{reviewAgeLabel}</span>
      </div>

      <div style={definitionGridStyle}>
        <DefinitionItem label="Owner" value={owner ?? "Unassigned"} />
        <DefinitionItem label="Site" value={site ?? "Unassigned"} />
        <DefinitionItem label="Category" value={category ?? "Unassigned"} />
        <DefinitionItem label="Review state" value={formatLabel(reviewState)} />
        <DefinitionItem label="Review due" value={formatDateTime(reviewDueAt)} />
        <DefinitionItem label="Last reviewed" value={formatDateTime(lastReviewedAt)} />
        <DefinitionItem label="Source updated" value={formatDateTime(sourceUpdatedAt)} />
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
        <strong style={{ color: "#dff4d3" }}>History highlights</strong>
        {historyHighlights.map((highlight) => (
          <div key={highlight} style={highlightStyle}>
            {highlight}
          </div>
        ))}
      </div>

      <div style={nextStepStyle}>
        <strong style={{ color: "#dff4d3" }}>Suggested next step</strong>
        <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>
          {suggestedNextStep ?? "No explicit next step is queued for this documentation record."}
        </span>
      </div>
    </article>
  );
}

function DefinitionItem(props: { label: string; value: string }) {
  return (
    <div style={definitionItemStyle}>
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#dff4d3", lineHeight: 1.5 }}>{props.value}</strong>
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

const eyebrowStyle = {
  margin: 0,
  color: "#89ff93",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  display: "grid",
  gap: 16,
};

const statusHeroStyle = {
  padding: "18px 20px",
  borderRadius: 20,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(147, 197, 253, 0.28)",
  display: "grid",
  gap: 6,
};

const definitionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const definitionItemStyle = {
  padding: 14,
  borderRadius: 16,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  display: "grid",
  gap: 6,
};

const labelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const highlightStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  color: "#9eb79b",
  lineHeight: 1.6,
};

const nextStepStyle = {
  padding: "16px 18px",
  borderRadius: 18,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  display: "grid",
  gap: 8,
};
