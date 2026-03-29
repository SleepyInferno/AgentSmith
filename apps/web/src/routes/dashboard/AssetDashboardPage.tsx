import { Link } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";

type RiskLevel = "ok" | "warn" | "critical";

type RiskSummary = {
  label: string;
  to: string;
  status: string;
  level: RiskLevel;
};

const riskSummaries: RiskSummary[] = [
  { label: "Device Inventory",   to: "/devices",   status: "3 at risk",  level: "warn" },
  { label: "Lifecycle Queue",    to: "/lifecycle", status: "2 pending",  level: "warn" },
  { label: "Backup Confidence",  to: "/backup",    status: "1 flagged",  level: "warn" },
  { label: "Network Visibility", to: "/network",   status: "All clear",  level: "ok" },
  { label: "Documentation",      to: "/docs",      status: "2 overdue",  level: "warn" },
];

export function AssetDashboardPage() {
  return (
    <section className="agent-dashboard" aria-label="Operator risk overview">
      <PageTitle title="Needs Attention" />

      <div className="agent-dashboard__hero">
        <img
          src="/mockups/hero-agent-smith.png"
          alt="AgentSmith operator console"
          className="agent-dashboard__hero-image"
        />
        <div className="agent-dashboard__hero-copy">
          <p className="agent-dashboard__hero-label">Agent-OS</p>
          <p className="agent-dashboard__hero-tagline">Operator Console</p>
        </div>
      </div>

      <div className="agent-dashboard__cards">
        {riskSummaries.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={`agent-risk-card agent-risk-card--${item.level}`}
            aria-label={`${item.label}: ${item.status}`}
          >
            <p className="agent-risk-card__title">{item.label}</p>
            <p className="agent-risk-card__status">{item.status}</p>
            <span className="agent-risk-card__cta">Open &rarr;</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
