import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getNetworkResourceDetail } from "../../lib/network";

function valueOrUnknown(value: string | null) {
  if (value === null || value === "") {
    return "Unknown";
  }

  return value;
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

function confidenceTone(confidence: string) {
  return confidence === "confirmed"
    ? { color: "#0f766e", background: "#ccfbf1" }
    : { color: "#9a3412", background: "#ffedd5" };
}

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

function statusTone(status: string | null) {
  switch (status) {
    case "online":
      return { color: "#166534", background: "#dcfce7" };
    case "offline":
      return { color: "#991b1b", background: "#fee2e2" };
    case "degraded":
      return { color: "#9a3412", background: "#ffedd5" };
    default:
      return { color: "#334155", background: "#e2e8f0" };
  }
}

export function NetworkDetailPage() {
  const { resourceId = "" } = useParams();
  const detailQuery = useQuery({
    queryKey: ["network-resource-detail", resourceId],
    queryFn: () => getNetworkResourceDetail(resourceId),
    enabled: resourceId.length > 0,
  });

  if (detailQuery.isPending) {
    return <div style={panelStyle}>Loading network resource detail...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div style={panelStyle}>Unable to load the selected network resource.</div>;
  }

  const detail = detailQuery.data;
  const hasRelatedResources = detail.relatedResources.length > 0;
  const hasFindings = detail.findings.length > 0;

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
            <p style={eyebrowStyle}>Network detail</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>{detail.resourceName}</h2>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 780 }}>{detail.summary}</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/network/map" style={ghostLinkStyle}>
              Open network mapper
            </Link>
            <Link to="/network/inventory" style={primaryLinkStyle}>
              Back to inventory
            </Link>
          </div>
        </div>

        {detail.dataMode === "seeded_example" ? (
          <div style={seededBannerStyle}>Example network data is shown until a live source is connected</div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <span style={{ ...pillStyle, ...statusTone(detail.operationalStatus) }}>
            {formatLabel(valueOrUnknown(detail.operationalStatus))}
          </span>
          <span style={{ ...pillStyle, ...freshnessTone(detail.freshnessState) }}>{formatLabel(detail.freshnessState)}</span>
          <span style={{ ...pillStyle, background: "#dbeafe", color: "#1d4ed8" }}>{formatLabel(detail.resourceKind)}</span>
        </div>
      </article>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.08fr) minmax(300px, 0.92fr)",
          gap: 20,
        }}
      >
        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Resource scope</h3>
          <p style={{ margin: "0 0 18px", color: "#475569", lineHeight: 1.6 }}>
            {detail.scopeSummary}
          </p>
          <div style={definitionGridStyle}>
            <DefinitionItem label="resourceName" value={detail.resourceName} />
            <DefinitionItem label="resourceKind" value={formatLabel(detail.resourceKind)} />
            <DefinitionItem label="siteName" value={valueOrUnknown(detail.siteName)} />
            <DefinitionItem label="operationalStatus" value={valueOrUnknown(detail.operationalStatus)} />
            <DefinitionItem label="lastSeenAt" value={formatDateTime(detail.lastSeenAt)} />
            <DefinitionItem label="summary" value={detail.summary} />
          </div>
        </article>

        <article style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>Freshness and confidence</h3>
          <div style={{ display: "grid", gap: 14 }}>
            <DefinitionItem label="freshnessState" value={formatLabel(detail.freshnessState)} />
            <DefinitionItem
              label="Suggested next step"
              value={detail.suggestedNextStep ?? "Review the related infrastructure to confirm the current scope."}
            />
            <DefinitionItem
              label="Confidence posture"
              value={
                detail.relatedResources.some((resource) => resource.confidence === "inferred")
                  ? "Some relationships are inferred and should be confirmed before acting."
                  : "The related infrastructure currently maps as confirmed."
              }
            />
          </div>
        </article>
      </section>

      <article style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Related infrastructure</h3>
        {!hasRelatedResources ? (
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            No related infrastructure returned by the network API.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {detail.relatedResources.map((resource) => (
              <div
                key={`${resource.direction}-${resource.resourceId}-${resource.relationship}`}
                style={{
                  padding: 18,
                  borderRadius: 20,
                  background: "#f8fafc",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block", color: "#0f172a", fontSize: "1rem" }}>{resource.resourceName}</strong>
                    <span style={{ color: "#475569", lineHeight: 1.5 }}>
                      {formatLabel(resource.resourceKind)} in {valueOrUnknown(resource.siteName)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ ...pillStyle, ...confidenceTone(resource.confidence) }}>
                      {formatLabel(resource.confidence)}
                    </span>
                    <span style={{ ...pillStyle, ...freshnessTone(resource.freshnessState) }}>
                      {formatLabel(resource.freshnessState)}
                    </span>
                  </div>
                </div>

                <div style={definitionGridStyle}>
                  <DefinitionItem label="relationship" value={formatLabel(resource.relationship)} />
                  <DefinitionItem label="direction" value={formatLabel(resource.direction)} />
                  <DefinitionItem label="operationalStatus" value={valueOrUnknown(resource.operationalStatus)} />
                  <DefinitionItem label="lastSeenAt" value={formatDateTime(resource.lastSeenAt)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article style={panelStyle}>
        <h3 style={{ marginTop: 0 }}>Open findings</h3>
        {!hasFindings ? (
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            No open findings are attached to this network resource right now.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {detail.findings.map((finding) => (
              <div
                key={finding.findingId}
                style={{
                  padding: 18,
                  borderRadius: 20,
                  background: "#ffffff",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ display: "block", color: "#0f172a" }}>{finding.summary}</strong>
                    <span style={{ color: "#475569", lineHeight: 1.5 }}>
                      {valueOrUnknown(finding.scopeLabel ?? detail.siteName)} | Queue rank #{finding.queueRank}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ ...pillStyle, ...confidenceTone("inferred") }}>{formatLabel(finding.kind)}</span>
                    <span style={{ ...pillStyle, ...freshnessTone(finding.freshnessState) }}>
                      {formatLabel(finding.freshnessState)}
                    </span>
                  </div>
                </div>

                <DefinitionItem label="Suggested next step" value={finding.suggestedNextStep} />
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function DefinitionItem(props: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "#f8fafc",
        border: "1px solid rgba(148, 163, 184, 0.14)",
        display: "grid",
        gap: 6,
      }}
    >
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#0f172a", lineHeight: 1.5 }}>{props.value}</strong>
    </div>
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

const definitionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const pillStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
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

const seededBannerStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid rgba(245, 158, 11, 0.35)",
  fontWeight: 600,
};
