import { useQuery } from "@tanstack/react-query";
import { PageTitle } from "../../components/PageTitle";
import { apiGet } from "../../lib/api";

type AuditEvent = {
  timestamp: string;
  action: string;
  actorId: string | null;
  targetType: string;
  targetId: string | null;
  result: string;
  metadata: unknown;
};

function toneForResult(result: string) {
  switch (result) {
    case "success":
    case "signed_out":
      return { background: "#dcfce7", color: "#166534" };
    case "failure":
      return { background: "#fee2e2", color: "#fca5a5" };
    case "partial":
      return { background: "#fef3c7", color: "#92400e" };
    default:
      return { background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" };
  }
}

function formatAction(action: string) {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return "No structured metadata";
  }

  const entries = Object.entries(metadata as Record<string, unknown>).slice(0, 3);
  if (entries.length === 0) {
    return "No structured metadata";
  }

  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(" | ");
}

export function AuditTrailPage() {
  const auditQuery = useQuery({
    queryKey: ["audit-events"],
    queryFn: () => apiGet<AuditEvent[]>("/api/audit-events"),
  });

  const items = auditQuery.data ?? [];

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Audit Log" />
      <article
        style={{
          padding: 24,
          borderRadius: 24,
          background: "rgba(10, 17, 11, 0.97)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#89ff93",
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 700,
          }}
        >
          Traceability
        </p>
        <h2 style={{ margin: "10px 0 8px" }}>Audit trail</h2>
        <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6, maxWidth: 760 }}>
          Review operator and workflow activity in reverse chronological order with target, result,
          and structured metadata before approving follow-on work.
        </p>
      </article>

      {auditQuery.isPending ? (
        <div style={panelStyle}>Loading audit events...</div>
      ) : auditQuery.isError ? (
        <div style={panelStyle}>Unable to load the audit trail right now.</div>
      ) : items.length === 0 ? (
        <div style={panelStyle}>No audit events have been recorded yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {items.map((event) => (
            <article key={`${event.timestamp}-${event.action}-${event.targetId ?? "unknown"}`} style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, color: "#9eb79b", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                  <h2 style={{ margin: "8px 0 0", fontSize: "1.15rem" }}>{formatAction(event.action)}</h2>
                </div>
                <span style={{ ...badgeStyle, ...toneForResult(event.result) }}>{event.result}</span>
              </div>

              <dl
                style={{
                  margin: "18px 0 0",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                }}
              >
                <div>
                  <dt style={labelStyle}>Actor</dt>
                  <dd style={valueStyle}>{event.actorId ?? "system"}</dd>
                </div>
                <div>
                  <dt style={labelStyle}>Target</dt>
                  <dd style={valueStyle}>
                    {event.targetType}
                    {event.targetId ? `: ${event.targetId}` : ""}
                  </dd>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <dt style={labelStyle}>Metadata</dt>
                  <dd style={valueStyle}>{formatMetadata(event.metadata)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
};

const badgeStyle = {
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontWeight: 700,
  alignSelf: "start",
};

const labelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const valueStyle = {
  margin: "4px 0 0",
  color: "#dff4d3",
  lineHeight: 1.5,
};
