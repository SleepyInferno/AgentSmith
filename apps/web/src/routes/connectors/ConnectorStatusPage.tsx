import { useQuery } from "@tanstack/react-query";
import { PageTitle } from "../../components/PageTitle";
import { apiGet } from "../../lib/api";

type ConnectorCard = {
  id: string;
  label: string;
  health: "healthy" | "warning" | "stale" | "error" | string;
  freshnessState: "healthy" | "warning" | "stale" | "error" | string;
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  lastResult: string;
};

function toneForState(state: string) {
  switch (state) {
    case "healthy":
      return { background: "#dcfce7", color: "#166534" };
    case "warning":
      return { background: "#fef3c7", color: "#92400e" };
    case "stale":
      return { background: "#fee2e2", color: "#fca5a5" };
    case "error":
      return { background: "#fecaca", color: "#7f1d1d" };
    default:
      return { background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" };
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not yet recorded";
  }

  return new Date(value).toLocaleString();
}

export function ConnectorStatusPage() {
  const connectorsQuery = useQuery({
    queryKey: ["connectors"],
    queryFn: () => apiGet<ConnectorCard[]>("/api/connectors"),
  });

  const connectors = connectorsQuery.data ?? [];

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Connectors" />
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
          Source freshness
        </p>
        <h2 style={{ margin: "10px 0 8px", fontSize: "1.25rem" }}>Connector status</h2>
        <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6, maxWidth: 760 }}>
          Review source health, last successful sync time, freshness, and the latest sync outcome
          before trusting downstream dashboards or workflows.
        </p>
      </article>

      {connectorsQuery.isPending ? (
        <div style={panelStyle}>Loading connector health...</div>
      ) : connectorsQuery.isError ? (
        <div style={panelStyle}>Unable to load connector status right now.</div>
      ) : connectors.length === 0 ? (
        <div style={panelStyle}>No connector sources have been registered yet.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          {connectors.map((connector) => (
            <article key={connector.id} style={panelStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, color: "#9eb79b", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.12em" }}>
                    Connector
                  </p>
                  <h2 style={{ margin: "8px 0 0", fontSize: "1.25rem" }}>{connector.label}</h2>
                </div>
                <span style={{ ...badgeStyle, ...toneForState(connector.health) }}>{connector.health}</span>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <div style={metricStyle}>
                  <span style={metricLabelStyle}>Freshness</span>
                  <strong>{connector.freshnessState}</strong>
                </div>
                <div style={metricStyle}>
                  <span style={metricLabelStyle}>Last result</span>
                  <strong>{connector.lastResult}</strong>
                </div>
              </div>

              <dl style={{ margin: "18px 0 0", display: "grid", gap: 10 }}>
                <div>
                  <dt style={metricLabelStyle}>Last successful sync</dt>
                  <dd style={{ margin: "4px 0 0", color: "#dff4d3" }}>{formatTimestamp(connector.lastSuccessfulSyncAt)}</dd>
                </div>
                <div>
                  <dt style={metricLabelStyle}>Last attempted sync</dt>
                  <dd style={{ margin: "4px 0 0", color: "#dff4d3" }}>{formatTimestamp(connector.lastAttemptedSyncAt)}</dd>
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

const metricStyle = {
  padding: 14,
  borderRadius: 18,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  display: "grid",
  gap: 6,
};

const metricLabelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};
