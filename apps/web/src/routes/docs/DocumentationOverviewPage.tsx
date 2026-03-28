import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DocumentationReviewQueue } from "../../components/docs/DocumentationReviewQueue";
import { docsQueryKeys, getDocumentationOverview, searchDocumentation } from "../../lib/docs";

type DocumentationOverviewPageProps = {
  trustBoundaryCopy: string;
};

const defaultTrustBoundaryCopy =
  "Document content stays read-only in this phase. Metadata changes go through explicit review and audit logging.";

function getCardValue(cards: Array<{ key: string; value: number }>, key: string) {
  return cards.find((card) => card.key === key)?.value ?? 0;
}

function formatSearchCoverageSummary(total: number, kindCount: number) {
  if (total === 0) {
    return "No indexed documentation records yet";
  }

  return `${total} documents across ${kindCount} document kinds`;
}

export function DocumentationOverviewPage({ trustBoundaryCopy }: DocumentationOverviewPageProps) {
  const overviewQuery = useQuery({
    queryKey: docsQueryKeys.overview,
    queryFn: getDocumentationOverview,
  });

  const searchCoverageQuery = useQuery({
    queryKey: docsQueryKeys.search({}),
    queryFn: () => searchDocumentation({}),
  });

  const overview = overviewQuery.data;
  const searchCoverage = searchCoverageQuery.data;
  const queue = overview?.queue ?? [];
  const cards = overview?.cards ?? [];
  const isSeededExample =
    overview?.dataMode === "seeded_example" || searchCoverage?.dataMode === "seeded_example";
  const overdueCount = getCardValue(cards, "review_overdue");
  const metadataIncompleteCount = getCardValue(cards, "metadata_incomplete");
  const recentChangeCount = getCardValue(cards, "recent_change");
  const totalDocuments = searchCoverage?.total ?? getCardValue(cards, "total_documents");
  const kindCount = searchCoverage?.facets.kinds.length ?? 0;
  const siteCount = searchCoverage?.facets.sites.length ?? 0;
  const systemCount = searchCoverage?.facets.systems.length ?? 0;

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
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 760 }}>
            Start with stale or weakly classified knowledge, then move into search inventory only
            when you need a broader scan across SOPs, vendor notes, contacts, infrastructure notes,
            and recovery procedures.
          </p>
          <p style={{ margin: "14px 0 0", color: "#0f172a", fontWeight: 700 }}>
            {trustBoundaryCopy || defaultTrustBoundaryCopy}
          </p>
        </article>

        <article
          style={{
            ...panelStyle,
            background: "#eff6ff",
            border: "1px solid rgba(59, 130, 246, 0.18)",
          }}
        >
          <p style={eyebrowStyle}>Search coverage</p>
          <h2 style={{ margin: "10px 0 8px" }}>Search coverage</h2>
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.7 }}>
            {searchCoverageQuery.isPending
              ? "Loading documentation search coverage..."
              : searchCoverageQuery.isError
                ? "Unable to load search coverage right now."
                : formatSearchCoverageSummary(totalDocuments, kindCount)}
          </p>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: 12,
            }}
          >
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{totalDocuments}</strong>
              <span style={metricLabelStyle}>Indexed</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{kindCount}</strong>
              <span style={metricLabelStyle}>Kinds</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{siteCount}</strong>
              <span style={metricLabelStyle}>Sites</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{systemCount}</strong>
              <span style={metricLabelStyle}>Linked systems</span>
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
          Example documentation records are shown until a live source is connected
        </section>
      ) : null}

      <section>
        {overviewQuery.isPending ? (
          <div style={panelStyle}>Loading documentation review queue...</div>
        ) : overviewQuery.isError ? (
          <div style={panelStyle}>Unable to load the documentation review queue right now.</div>
        ) : (
          <DocumentationReviewQueue
            items={queue}
            emptyTitle="No documentation records need review right now"
          />
        )}
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Review aging</p>
            <h2 style={{ margin: "10px 0 8px" }}>Review aging</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 760 }}>
              Queue ordering comes from the server-owned overview contract, so overdue review,
              metadata gaps, and recent changes stay aligned with the search inventory.
            </p>
          </div>
          <div style={summaryBadgeStyle}>{overview?.summary ?? "Documentation review posture"}</div>
        </div>

        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <article style={agingCardStyle}>
            <span style={{ ...chipStyle, background: "#fee2e2", color: "#991b1b" }}>review_overdue</span>
            <strong style={{ fontSize: "1.8rem", color: "#0f172a" }}>{overdueCount}</strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Documents already past the expected review window.
            </p>
          </article>
          <article style={agingCardStyle}>
            <span style={{ ...chipStyle, background: "#ffedd5", color: "#9a3412" }}>metadata_incomplete</span>
            <strong style={{ fontSize: "1.8rem", color: "#0f172a" }}>{metadataIncompleteCount}</strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Records missing owner, site, category, or other relevance context.
            </p>
          </article>
          <article style={agingCardStyle}>
            <span style={{ ...chipStyle, background: "#dbeafe", color: "#1d4ed8" }}>recent_change</span>
            <strong style={{ fontSize: "1.8rem", color: "#0f172a" }}>{recentChangeCount}</strong>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Documents updated after the most recent review checkpoint.
            </p>
          </article>
        </div>
      </section>

      <section style={panelStyle}>
        <p style={eyebrowStyle}>Search inventory</p>
        <h2 style={{ margin: "10px 0 8px" }}>Search inventory</h2>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 760 }}>
          Open the bookmarkable inventory when you need server-driven search filters and explicit
          relevance explanations instead of a client-side table filter.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link
            to="/docs/search"
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
            Open search inventory
          </Link>
          <div style={infoPillStyle}>
            {searchCoverageQuery.isError
              ? "Search coverage needs attention"
              : "Server-driven filters stay bookmarkable"}
          </div>
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

const chipStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
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

const agingCardStyle = {
  padding: 18,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 8,
};

const summaryBadgeStyle = {
  padding: "14px 16px",
  borderRadius: 18,
  background: "#eff6ff",
  color: "#0f172a",
  fontWeight: 700,
  alignSelf: "start",
  maxWidth: 260,
};

const infoPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#e0f2fe",
  color: "#082f49",
  fontWeight: 700,
};
