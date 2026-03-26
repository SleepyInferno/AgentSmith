import { createBrowserRouter, Link, NavLink, Outlet } from "react-router-dom";
import { AssetDashboardPage } from "./routes/dashboard/AssetDashboardPage";
import { DeviceInventoryPage } from "./routes/assets/DeviceInventoryPage";
import { DeviceDetailPage } from "./routes/assets/DeviceDetailPage";

const navigationItems = [
  { to: "/", label: "Needs attention" },
  { to: "/devices", label: "Device inventory" },
];

function AppShell() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(35, 89, 139, 0.36), transparent 36%), linear-gradient(180deg, #09111d 0%, #132033 46%, #e8edf2 46%, #f7f9fb 100%)",
        color: "#0f172a",
        fontFamily:
          "\"Segoe UI\", \"Aptos\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 20px 56px" }}>
        <header
          style={{
            padding: 24,
            borderRadius: 28,
            color: "#f8fafc",
            background: "linear-gradient(135deg, rgba(9, 17, 29, 0.96), rgba(19, 32, 51, 0.92))",
            border: "1px solid rgba(148, 163, 184, 0.24)",
            boxShadow: "0 24px 60px rgba(9, 17, 29, 0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  fontSize: 12,
                  color: "#7dd3fc",
                }}
              >
                Phase 2 asset health
              </p>
              <h1 style={{ margin: "10px 0 8px", fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>
                Morning risk queue
              </h1>
              <p style={{ margin: 0, maxWidth: 620, lineHeight: 1.6, color: "#cbd5e1" }}>
                Start with the riskiest endpoints, verify freshness before acting, and move into the
                full inventory only when you need broader triage.
              </p>
            </div>
            <Link
              to="/devices"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 18px",
                borderRadius: 999,
                color: "#f8fafc",
                textDecoration: "none",
                background: "rgba(14, 165, 233, 0.2)",
                border: "1px solid rgba(125, 211, 252, 0.4)",
              }}
            >
              Open device inventory
            </Link>
          </div>
          <nav aria-label="Primary" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                style={({ isActive }) => ({
                  padding: "10px 16px",
                  borderRadius: 999,
                  textDecoration: "none",
                  color: isActive ? "#082f49" : "#dbeafe",
                  background: isActive ? "#bae6fd" : "rgba(30, 41, 59, 0.78)",
                  border: "1px solid rgba(125, 211, 252, 0.32)",
                  fontWeight: 600,
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <section style={{ marginTop: 24 }}>
          <Outlet />
        </section>
      </div>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <AssetDashboardPage /> },
      { path: "devices", element: <DeviceInventoryPage /> },
      { path: "devices/:deviceId", element: <DeviceDetailPage /> },
    ],
  },
]);
