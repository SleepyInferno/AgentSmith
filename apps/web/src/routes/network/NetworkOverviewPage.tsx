import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { NetworkFindingsQueue } from "../../components/network/NetworkFindingsQueue";
import { getNetworkFindings, getNetworkMap } from "../../lib/network";

function getFreshnessMessage(hasStaleData: boolean) {
  return hasStaleData ? "Network data is stale or incomplete" : "Topology confidence is current enough for review";
}

export function NetworkOverviewPage() {
  const emptyQueueTitle = "No network findings need review right now";
  const findingsQuery = useQuery({
    queryKey: ["network-findings"],
    queryFn: getNetworkFindings,
  });

  const mapQuery = useQuery({
    queryKey: ["network-map"],
    queryFn: getNetworkMap,
  });

  const findings = findingsQuery.data?.items ?? [];
  const relationshipCount = mapQuery.data?.relationships.length ?? 0;
  const confirmedCount =
    mapQuery.data?.relationships.filter((relationship) => relationship.confidence === "confirmed").length ?? 0;
  const inferredCount =
    mapQuery.data?.relationships.filter((relationship) => relationship.confidence === "inferred").length ?? 0;
  const staleFindings = findings.some((item) => item.freshnessState !== "healthy");
  const staleSites = mapQuery.data?.sites.some((site) => site.freshnessState !== "healthy") ?? false;
  const isStale = staleFindings || staleSites;
  const freshnessMessage = getFreshnessMessage(isStale);
  const isSeededExample =
    findingsQuery.data?.dataMode === "seeded_example" || mapQuery.data?.dataMode === "seeded_example";

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)",
          gap: 18,
        }}
      >
        <article
          style={{
            ...panelStyle,
            background: "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))",
          }}
        >
          <p style={eyebrowStyle}>Needs review</p>
          <h2 style={{ margin: "12px 0 10px", fontSize: "2rem" }}>Needs review</h2>
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 720 }}>
            Start with the network findings queue, confirm what is stale or inferred, and move into
            inventory only when you need a broader scan across sites, WAN links, and core
            infrastructure.
          </p>
        </article>

        <article
          style={{
            ...panelStyle,
            background: isStale ? "#fff7ed" : "#ecfeff",
            border: `1px solid ${isStale ? "rgba(249, 115, 22, 0.28)" : "rgba(14, 165, 233, 0.25)"}`,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Topology confidence</h2>
          <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.7 }}>{freshnessMessage}</p>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 12,
            }}
          >
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{mapQuery.data?.sites.length ?? "..."}</strong>
              <span style={metricLabelStyle}>Sites in scope</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{confirmedCount}</strong>
              <span style={metricLabelStyle}>Confirmed</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{inferredCount}</strong>
              <span style={metricLabelStyle}>Inferred</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{relationshipCount}</strong>
              <span style={metricLabelStyle}>Relationships</span>
            </div>
          </div>
        </article>
      </section>

      {isSeededExample ? (
        <section
          style={{
            padding: "16px 18px",
            borderRadius: 18,
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            fontWeight: 600,
          }}
        >
          Example network data is shown until a live source is connected
        </section>
      ) : null}

      <section>
        {findingsQuery.isPending ? (
          <div style={panelStyle}>Loading network findings...</div>
        ) : findingsQuery.isError ? (
          <div style={panelStyle}>Unable to load the network review queue right now.</div>
        ) : (
          <NetworkFindingsQueue items={findings} emptyTitle={emptyQueueTitle} />
        )}
      </section>

      <section
        style={{
          ...panelStyle,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Inventory navigation</h2>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 720 }}>
            Open the mapper when you need relationship context, then move into the full inventory
            for site filters, operational status checks, or a denser scan of every tracked resource.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            to="/network/map"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: 999,
              background: "#e0f2fe",
              color: "#082f49",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Open network mapper
          </Link>
          <Link
            to="/network/inventory"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: 999,
              background: "#0f172a",
              color: "#f8fafc",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Open network inventory
          </Link>
        </div>
      </section>
    </section>
  );
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
};

const metricCardStyle = {
  padding: 14,
  borderRadius: 18,
  background: "rgba(255, 255, 255, 0.78)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  display: "grid",
  gap: 6,
};

const metricValueStyle = {
  fontSize: "1.5rem",
  color: "#0f172a",
};

const metricLabelStyle = {
  color: "#475569",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};
