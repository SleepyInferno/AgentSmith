import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { NetworkMapCanvas } from "../../components/network/NetworkMapCanvas";
import { NetworkRelationshipLegend } from "../../components/network/NetworkRelationshipLegend";
import { getNetworkMap } from "../../lib/network";

function freshnessTone(state: string) {
  switch (state) {
    case "healthy":
      return { color: "#166534", background: "#dcfce7" };
    case "warning":
      return { color: "#9a3412", background: "#ffedd5" };
    case "stale":
    case "error":
      return { color: "#991b1b", background: "#fee2e2" };
    default:
      return { color: "#334155", background: "#e2e8f0" };
  }
}

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function NetworkMapPage() {
  const mapQuery = useQuery({
    queryKey: ["network-map"],
    queryFn: getNetworkMap,
  });

  if (mapQuery.isPending) {
    return <div style={panelStyle}>Loading network mapper...</div>;
  }

  if (mapQuery.isError || !mapQuery.data) {
    return <div style={panelStyle}>Unable to load the network mapper right now.</div>;
  }

  const map = mapQuery.data;
  const confirmedCount = map.relationships.filter((relationship) => relationship.confidence === "confirmed").length;
  const inferredCount = map.relationships.filter((relationship) => relationship.confidence === "inferred").length;
  const staleSites = map.sites.filter((site) => site.freshnessState !== "healthy");

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Network Map" />
      <article style={{ ...panelStyle, background: "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p style={eyebrowStyle}>Network mapper</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>Site topology</h2>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 760 }}>
              Review which site scopes are confirmed, which links are still inferred, and where freshness gaps mean
              the map should be treated as context instead of ground truth.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/network" style={ghostLinkStyle}>
              Back to queue
            </Link>
            <Link to="/network/inventory" style={primaryLinkStyle}>
              Open inventory
            </Link>
          </div>
        </div>

        {map.dataMode === "seeded_example" ? (
          <div style={seededBannerStyle}>Example network data is shown until a live source is connected</div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Sites</span>
            <strong style={metricValueStyle}>{map.sites.length}</strong>
          </div>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Confirmed</span>
            <strong style={metricValueStyle}>{confirmedCount}</strong>
          </div>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Inferred</span>
            <strong style={metricValueStyle}>{inferredCount}</strong>
          </div>
          <div style={metricCardStyle}>
            <span style={metricLabelStyle}>Relationships</span>
            <strong style={metricValueStyle}>{map.relationships.length}</strong>
          </div>
        </div>
      </article>

      <article style={panelStyle}>
        <NetworkMapCanvas map={map} />
      </article>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(280px, 0.95fr)",
          gap: 20,
        }}
      >
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1.25rem" }}>Relationship legend</h3>
          <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
            The line treatment tells you how much confidence the server has in each mapped relationship. Use solid
            links for immediate review and dashed links as prompts to confirm what the source could only infer.
          </p>
          <NetworkRelationshipLegend map={map} />
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0, fontSize: "1.25rem" }}>Freshness watch</h3>
          <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
            Stale scopes are the first place to verify before you depend on the topology for a change or outage review.
          </p>

          <div style={{ display: "grid", gap: 12 }}>
            {map.sites.map((site) => (
              <div
                key={site.siteName}
                style={{
                  padding: 16,
                  borderRadius: 18,
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  background: "#f8fafc",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: "#0f172a" }}>{site.siteName}</strong>
                  <span style={{ ...statusPillStyle, ...freshnessTone(site.freshnessState) }}>
                    {formatLabel(site.freshnessState)}
                  </span>
                </div>
                <span style={{ color: "#475569" }}>
                  {site.resourceIds.length} resources in scope, {site.relationshipCount} mapped relationships
                </span>
              </div>
            ))}
          </div>

          {staleSites.length === 0 ? (
            <p style={{ margin: "16px 0 0", color: "#166534", fontWeight: 600 }}>
              Every mapped site is currently healthy enough for review.
            </p>
          ) : (
            <p style={{ margin: "16px 0 0", color: "#9a3412", fontWeight: 600 }}>
              {staleSites.length} site{staleSites.length === 1 ? "" : "s"} need freshness verification before you trust
              the full picture.
            </p>
          )}
        </article>
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
  padding: 16,
  borderRadius: 18,
  background: "rgba(255, 255, 255, 0.88)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  display: "grid",
  gap: 8,
};

const metricLabelStyle = {
  color: "#475569",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const metricValueStyle = {
  color: "#0f172a",
  fontSize: "1.8rem",
};

const seededBannerStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid rgba(245, 158, 11, 0.35)",
  fontWeight: 600,
};

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#0f172a",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 600,
};

const ghostLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 600,
};

const statusPillStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};
