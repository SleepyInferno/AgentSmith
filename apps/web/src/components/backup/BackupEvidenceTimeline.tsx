import type { BackupTimelineEntry } from "../../lib/backup";

type BackupEvidenceTimelineProps = {
  entries: BackupTimelineEntry[];
};

export function BackupEvidenceTimeline({ entries }: BackupEvidenceTimelineProps) {
  if (entries.length === 0) {
    return (
      <div style={emptyStateStyle}>
        No backup, restore, or operator-attested evidence has been recorded for this system yet.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {entries.map((entry) => (
        <article
          key={entry.id}
          style={{
            padding: 18,
            borderRadius: 20,
            background: "rgba(10, 17, 11, 0.97)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong style={{ display: "block", color: "#dff4d3", fontSize: "1rem" }}>{entry.title}</strong>
              <span style={{ color: "#9eb79b", lineHeight: 1.5 }}>{formatDateTime(entry.occurredAt)}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span style={{ ...chipStyle, ...toneForType(entry.type) }}>{formatType(entry.type)}</span>
              {entry.outcome ? <span style={{ ...chipStyle, background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" }}>{entry.outcome}</span> : null}
            </div>
          </div>

          <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>{entry.summary}</p>

          <div style={detailsGridStyle}>
            <TimelineMeta label="providerKey" value={entry.providerKey ?? "Unknown"} />
            <TimelineMeta label="workloadKind" value={entry.workloadKind ?? "Unknown"} />
            <TimelineMeta
              label="evidenceSource"
              value={entry.type === "operator_attested" ? "operator_attested" : formatEvidenceSource(entry.evidenceSource)}
            />
            <TimelineMeta label="ticketRef" value={entry.ticketRef ?? "None"} />
            <TimelineMeta label="recoveryPointAt" value={formatDateTime(entry.recoveryPointAt)} />
          </div>
        </article>
      ))}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatType(value: BackupTimelineEntry["type"]) {
  if (value === "operator_attested") {
    return "Operator-attested proof";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEvidenceSource(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toneForType(type: BackupTimelineEntry["type"]) {
  switch (type) {
    case "failed_backup":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    case "operator_attested":
      return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
    case "restore_proof":
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.12)" };
    case "successful_backup":
    default:
      return { color: "#5eead4", background: "rgba(20, 184, 166, 0.15)" };
  }
}

function TimelineMeta(props: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 16,
        background: "rgba(10, 17, 11, 0.97)",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        display: "grid",
        gap: 6,
      }}
    >
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#dff4d3", lineHeight: 1.5 }}>{props.value}</strong>
    </div>
  );
}

const chipStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const emptyStateStyle = {
  padding: 18,
  borderRadius: 20,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  color: "#9eb79b",
  lineHeight: 1.6,
};

const labelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};
