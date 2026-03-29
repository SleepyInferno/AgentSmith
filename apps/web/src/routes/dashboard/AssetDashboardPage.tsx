import { Link } from "react-router-dom";
const hotspots = [
  { to: "/", label: "Needs Attention navigation", top: 13.4, left: 1.2, width: 17.9, height: 7.6 },
  { to: "/lifecycle", label: "Lifecycle Queue navigation", top: 21.4, left: 1.2, width: 17.9, height: 7.7 },
  { to: "/devices", label: "Device Inventory navigation", top: 29.8, left: 1.2, width: 17.9, height: 7.8 },
  { to: "/network", label: "Identity Risk navigation", top: 38, left: 1.2, width: 17.9, height: 7.8 },
  { to: "/backup", label: "Backup Confidence navigation", top: 46.6, left: 1.2, width: 17.9, height: 7.8 },
  { to: "/devices/agentsmith-1", label: "Ranked issue one", top: 23.3, left: 20.7, width: 56, height: 8.1 },
  { to: "/lifecycle", label: "Ranked issue two", top: 31.5, left: 20.7, width: 56, height: 8 },
  { to: "/devices/agentsmith-2", label: "Ranked issue three", top: 39.7, left: 20.7, width: 56, height: 8 },
  { to: "/lifecycle", label: "Lifecycle runs panel", top: 49.6, left: 20.7, width: 31.6, height: 24.9 },
  { to: "/devices", label: "Safe actions panel", top: 49.6, left: 53.4, width: 23.3, height: 24.9 },
  { to: "/devices", label: "Device inventory panel", top: 77.9, left: 20.7, width: 56, height: 17.6 },
];

export function AssetDashboardPage() {
  return (
    <section className="mockup-dashboard" aria-label="AgentSmith dashboard mockup">
      <div className="mockup-dashboard__frame">
        <img
          src="/mockups/dashboard-home.png"
          alt="AgentSmith dashboard mockup with the Agent Smith character banner, neon sidebar, ranked issues, review panel, and device inventory."
          className="mockup-dashboard__image"
        />

        <nav className="mockup-dashboard__hotspots" aria-label="Dashboard hotspots">
          {hotspots.map((hotspot) => (
            <Link
              key={`${hotspot.label}-${hotspot.to}`}
              to={hotspot.to}
              className="mockup-dashboard__hotspot"
              style={{
                top: `${hotspot.top}%`,
                left: `${hotspot.left}%`,
                width: `${hotspot.width}%`,
                height: `${hotspot.height}%`,
              }}
              aria-label={hotspot.label}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}
