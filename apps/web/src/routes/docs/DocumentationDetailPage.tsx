import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { docsQueryKeys, getDocumentationDetail } from "../../lib/docs";

type DocumentationDetailPageProps = {
  trustBoundaryCopy: string;
};

export function DocumentationDetailPage({ trustBoundaryCopy }: DocumentationDetailPageProps) {
  const { documentId = "" } = useParams();
  const detailQuery = useQuery({
    queryKey: docsQueryKeys.detail(documentId),
    queryFn: () => getDocumentationDetail(documentId),
    enabled: documentId.length > 0,
  });

  if (detailQuery.isPending) {
    return <div style={panelStyle}>Loading documentation detail...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div style={panelStyle}>Unable to load the selected documentation record.</div>;
  }

  const detail = detailQuery.data;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <article
        style={{
          ...panelStyle,
          background: "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p style={eyebrowStyle}>Document detail</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>{detail.title}</h2>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 760 }}>
              {detail.summary ?? "No summary is available for this documentation record yet."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/docs" style={ghostLinkStyle}>
              Back to docs overview
            </Link>
            <Link to="/docs/search" style={primaryLinkStyle}>
              Open search inventory
            </Link>
          </div>
        </div>

        <div style={trustNoteStyle}>
          <strong style={{ color: "#0f172a" }}>{trustBoundaryCopy}</strong>
          <span style={{ color: "#475569", lineHeight: 1.6 }}>
            {detail.reviewAgeLabel}. {detail.nextReviewStatus}.
          </span>
        </div>
      </article>
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

const trustNoteStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 8,
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
