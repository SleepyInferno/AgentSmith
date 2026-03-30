import type { BackupSourceHealth } from "../../lib/backup";

type BackupSourceHealthCardProps = {
  source: BackupSourceHealth;
  evidenceSources: string[];
  isReadOnly: boolean;
};

export function BackupSourceHealthCard({
  source,
  evidenceSources,
  isReadOnly,
}: BackupSourceHealthCardProps) {
  return (
    <article
      style={{
        padding: 20,
        borderRadius: 22,
        background: "rgba(10, 17, 11, 0.97)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <strong style={{ display: "block", color: "#dff4d3", fontSize: "1rem" }}>{source.providerLabel}</strong>
          <span style={{ color: "#9eb79b", lineHeight: 1.5 }}>{source.summary}</span>
        </div>
        <span style={{ ...chipStyle, ...toneForFreshness(source.state) }}>{formatState(source.state)}</span>
      </div>

      <div style={definitionGridStyle}>
        <DefinitionItem label="provider freshness" value={formatState(source.state)} />
        <DefinitionItem label="connector freshness" value={formatState(source.connectorFreshnessState)} />
        <DefinitionItem
          label="evidence source"
          value={evidenceSources.length > 0 ? evidenceSources.map(formatEvidenceSource).join(", ") : "provider_sync"}
        />
        <DefinitionItem label="read-only" value={isReadOnly ? "This detail route is read-only." : "Write actions are enabled."} />
        <DefinitionItem label="lastObservedAt" value={formatDateTime(source.lastObservedAt)} />
        <DefinitionItem label="systemsObserved" value={String(source.systemsObserved)} />
      </div>
    </article>
  );
}

function formatState(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEvidenceSource(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function toneForFreshness(value: string) {
  switch (value) {
    case "error":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    case "stale":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
    case "missing":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    case "unknown":
      return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
    case "current":
    default:
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.12)" };
  }
}

function DefinitionItem(props: { label: string; value: string }) {
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

const definitionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const labelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};
