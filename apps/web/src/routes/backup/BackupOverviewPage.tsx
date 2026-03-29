import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { BackupFindingsQueue } from "../../components/backup/BackupFindingsQueue";
import { getBackupFindings, getBackupOverview } from "../../lib/backup";

type BackupOverviewPageProps = {
  trustBoundaryCopy: string;
};

const defaultTrustBoundaryCopy =
  "Read-only evidence view - no backup jobs, restores, or exceptions can be executed here.";

function toneForCard(tone: string) {
  switch (tone) {
    case "high_risk":
      return { background: "#fee2e2", color: "#991b1b" };
    case "watch":
      return { background: "#ffedd5", color: "#9a3412" };
    case "unknown":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "healthy":
      return { background: "#dcfce7", color: "#166534" };
    default:
      return { background: "#e2e8f0", color: "#334155" };
  }
}

function formatProviderSummary(count: number) {
  return count === 1 ? "1 provider needs attention" : `${count} providers need attention`;
}

export function BackupOverviewPage({ trustBoundaryCopy }: BackupOverviewPageProps) {
  const findingsQuery = useQuery({
    queryKey: ["backup-findings"],
    queryFn: getBackupFindings,
  });

  const overviewQuery = useQuery({
    queryKey: ["backup-overview"],
    queryFn: getBackupOverview,
  });

  const findings = findingsQuery.data?.items ?? [];
  const cards = overviewQuery.data?.cards ?? [];
  const sourceHealth = overviewQuery.data?.sourceHealth ?? [];
  const isSeededExample =
    findingsQuery.data?.dataMode === "seeded_example" || overviewQuery.data?.dataMode === "seeded_example";
  const highRiskCount = cards.find((card) => card.key === "high_risk")?.value ?? 0;
  const watchCount = cards.find((card) => card.key === "watch")?.value ?? 0;
  const unknownCount = cards.find((card) => card.key === "unknown")?.value ?? 0;
  const staleRestoreCount = findings.filter((item) => !item.lastRestoreTestAt).length;
  const providersNeedingReview = sourceHealth.filter((item) => item.state !== "current").length;
  const hasStaleTelemetry = providersNeedingReview > 0 || findings.some((item) => item.confidenceState === "unknown");

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Backup Confidence" />
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
            Start with systems missing coverage, stale restore proof, or unclear provider telemetry,
            then widen out into the protected-system inventory only when you need a full baseline scan.
          </p>
          <p style={{ margin: "14px 0 0", color: "#0f172a", fontWeight: 700 }}>
            {trustBoundaryCopy || defaultTrustBoundaryCopy}
          </p>
        </article>

        <article
          style={{
            ...panelStyle,
            background: hasStaleTelemetry ? "#fff7ed" : "#ecfeff",
            border: `1px solid ${hasStaleTelemetry ? "rgba(249, 115, 22, 0.28)" : "rgba(14, 165, 233, 0.25)"}`,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Restore proof</h2>
          <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.7 }}>
            {hasStaleTelemetry
              ? "Backup telemetry is stale or incomplete"
              : "Restore-test evidence and provider telemetry are current enough for review"}
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
              <strong style={metricValueStyle}>{highRiskCount}</strong>
              <span style={metricLabelStyle}>High risk</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{watchCount}</strong>
              <span style={metricLabelStyle}>Watch</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{staleRestoreCount}</strong>
              <span style={metricLabelStyle}>No restore proof</span>
            </div>
            <div style={metricCardStyle}>
              <strong style={metricValueStyle}>{unknownCount}</strong>
              <span style={metricLabelStyle}>Unknown</span>
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
          Example backup data is shown until a live backup source is connected
        </section>
      ) : null}

      <section>
        {findingsQuery.isPending ? (
          <div style={panelStyle}>Loading backup findings...</div>
        ) : findingsQuery.isError ? (
          <div style={panelStyle}>Unable to load the backup review queue right now.</div>
        ) : (
          <BackupFindingsQueue items={findings} emptyTitle="No backup findings need review right now" />
        )}
      </section>

      <section style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Coverage baseline</p>
            <h2 style={{ margin: "10px 0 8px" }}>Coverage baseline</h2>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 760 }}>
              These cards come directly from the backup overview contract so the dashboard uses the
              same coverage and confidence semantics as the inventory and future detail routes.
            </p>
          </div>
          <div style={summaryBadgeStyle}>{formatProviderSummary(providersNeedingReview)}</div>
        </div>

        {overviewQuery.isPending ? (
          <div style={{ marginTop: 20 }}>Loading backup overview...</div>
        ) : overviewQuery.isError ? (
          <div style={{ marginTop: 20 }}>Unable to load backup coverage baseline right now.</div>
        ) : (
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {cards.map((card) => {
              const tone = toneForCard(card.tone);

              return (
                <article
                  key={card.key}
                  style={{
                    padding: 18,
                    borderRadius: 20,
                    background: "#f8fafc",
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <span style={{ ...chipStyle, ...tone }}>{card.label}</span>
                  <strong style={{ fontSize: "1.8rem", color: "#0f172a" }}>{card.value}</strong>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>{card.summary}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <p style={eyebrowStyle}>Inventory navigation</p>
        <h2 style={{ margin: "10px 0 8px" }}>Inventory navigation</h2>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 760 }}>
          Open the protected-system inventory when you need server-driven filters for provider,
          site, or confidence state while keeping seeded-example and stale-telemetry disclosure visible.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link
            to="/backup/inventory"
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
            Open backup inventory
          </Link>
          <div style={infoPillStyle}>
            {hasStaleTelemetry ? "Review provider freshness first" : "Queue and inventory are aligned"}
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

const summaryBadgeStyle = {
  padding: "14px 16px",
  borderRadius: 18,
  background: "#eff6ff",
  color: "#0f172a",
  fontWeight: 700,
  alignSelf: "start",
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
