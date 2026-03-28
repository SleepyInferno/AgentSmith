import { createBrowserRouter, NavLink, Outlet, useLocation } from "react-router-dom";
import { AssetDashboardPage } from "./routes/dashboard/AssetDashboardPage";
import { DeviceInventoryPage } from "./routes/assets/DeviceInventoryPage";
import { DeviceDetailPage } from "./routes/assets/DeviceDetailPage";
import { LifecycleQueuePage } from "./routes/lifecycle/LifecycleQueuePage";
import { LifecycleRunDetailPage } from "./routes/lifecycle/LifecycleRunDetailPage";
import { NetworkDetailPage } from "./routes/network/NetworkDetailPage";
import { NetworkMapPage } from "./routes/network/NetworkMapPage";
import { NetworkOverviewPage } from "./routes/network/NetworkOverviewPage";
import { NetworkInventoryPage } from "./routes/network/NetworkInventoryPage";

type NavItem = {
  label: string;
  to?: string;
  icon: "attention" | "list" | "devices" | "identity" | "backup" | "docs" | "connectors" | "audit" | "settings";
  badge?: string;
  end?: boolean;
};

const primaryItems: NavItem[] = [
  { to: "/", label: "Needs Attention", icon: "attention", badge: "!", end: true },
  { to: "/lifecycle", label: "Lifecycle Queue", icon: "list", badge: "W" },
  { to: "/devices", label: "Device Inventory", icon: "devices" },
  { to: "/network", label: "Identity Risk", icon: "identity" },
  { to: "/backup", label: "Backup Confidence", icon: "backup" },
];

const utilityItems: NavItem[] = [
  { label: "Documentation", icon: "docs" },
  { label: "Connectors", icon: "connectors" },
  { label: "Audit Log", icon: "audit" },
  { label: "Audit logs", icon: "settings" },
];

function SidebarIcon(props: { icon: NavItem["icon"] }) {
  switch (props.icon) {
    case "attention":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 2.8 19.2c-.5.9.1 1.8 1.1 1.8h16.2c1 0 1.6-.9 1.1-1.8Z" />
          <path d="M12 8.5v5.6" />
          <circle cx="12" cy="17.4" r="1" />
        </svg>
      );
    case "list":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5.5" cy="6" r="1.5" />
          <circle cx="5.5" cy="12" r="1.5" />
          <circle cx="5.5" cy="18" r="1.5" />
          <path d="M10 6h9M10 12h9M10 18h9" />
        </svg>
      );
    case "devices":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="8" height="11" rx="1.8" />
          <rect x="13" y="7" width="8" height="13" rx="1.8" />
          <path d="M7 18h0M17 17h0" />
        </svg>
      );
    case "identity":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20c1.9-3.2 4.2-4.8 7-4.8s5.1 1.6 7 4.8" />
        </svg>
      );
    case "backup":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 19h14a2 2 0 0 0 2-2v-3.7a2 2 0 0 0-.6-1.4l-2.8-2.7a2 2 0 0 1-.6-1.4V6a2 2 0 0 0-2-2H9A2 2 0 0 0 7 6v1.8a2 2 0 0 1-.6 1.4l-2.8 2.7a2 2 0 0 0-.6 1.4V17a2 2 0 0 0 2 2Z" />
          <path d="M9 19v-4h6v4" />
        </svg>
      );
    case "docs":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M15 3v4h4" />
        </svg>
      );
    case "connectors":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="12" r="2.3" />
          <circle cx="18" cy="6" r="2.3" />
          <circle cx="18" cy="18" r="2.3" />
          <path d="M8.2 11.2 15.8 6.8M8.2 12.8l7.6 4.4" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M8.5 9h7M8.5 13h7M8.5 17h5" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="m12 3 1.4 2.5 2.9.5-.8 2.8 2 2-2 2 .8 2.8-2.9.5L12 21l-1.4-2.5-2.9-.5.8-2.8-2-2 2-2-.8-2.8 2.9-.5Z" />
        </svg>
      );
  }
}

function ShellNavigationItem({ item }: { item: NavItem }) {
  const content = (
    <>
      <span className="agent-sidebar__icon">
        <SidebarIcon icon={item.icon} />
      </span>
      <span className="agent-sidebar__label">{item.label}</span>
      {item.badge ? <span className="agent-sidebar__badge">{item.badge}</span> : null}
    </>
  );

  if (!item.to) {
    return <span className="agent-sidebar__item agent-sidebar__item--ghost">{content}</span>;
  }

  return (
    <NavLink
      to={item.to}
      {...(item.end ? { end: true } : {})}
      className={({ isActive }) =>
        isActive ? "agent-sidebar__item agent-sidebar__item--active" : "agent-sidebar__item"
      }
    >
      {content}
    </NavLink>
  );
}

function BrowserToolbar() {
  return (
    <header className="agent-browser">
      <div className="agent-browser__lights" aria-hidden="true">
        <span className="agent-browser__light agent-browser__light--red" />
        <span className="agent-browser__light agent-browser__light--amber" />
        <span className="agent-browser__light agent-browser__light--green" />
      </div>
      <div className="agent-browser__controls" aria-hidden="true">
        <span className="agent-browser__glyph">↶</span>
        <span className="agent-browser__glyph">‹</span>
        <span className="agent-browser__glyph">›</span>
      </div>
      <div className="agent-browser__address">AgentSmith</div>
      <div className="agent-browser__controls" aria-hidden="true">
        <span className="agent-browser__glyph">⤴</span>
        <span className="agent-browser__glyph">＋</span>
        <span className="agent-browser__glyph">⧉</span>
      </div>
    </header>
  );
}

function ReviewPanel() {
  const location = useLocation();
  const contextLabel =
    location.pathname === "/"
      ? "Operator review follows the staged-risk flow shown in the mockup."
      : "The review rail stays visible while deeper routes are in focus.";

  return (
    <aside className="agent-review-panel">
      <div className="agent-review-panel__header">
        <h2>Review Panel</h2>
        <button type="button" className="agent-review-panel__close" aria-label="Close review panel">
          ×
        </button>
      </div>

      <div className="agent-review-panel__stack">
        <div>
          <p className="agent-review-panel__eyebrow">Confirm</p>
          <h3>Disable Stale Account "Svc-acct"</h3>
        </div>

        <div>
          <p className="agent-review-panel__label">Affected Scope</p>
          <p className="agent-review-panel__value">1 Account</p>
        </div>

        <div>
          <p className="agent-review-panel__label">Risk/Impact</p>
          <p className="agent-review-panel__body">
            Stale-impact: summary is disable account but the operator can still review context and
            restore a mandatory audit override before taking the action.
          </p>
        </div>

        <div className="agent-review-panel__review-note">
          <p className="agent-review-panel__label">Operator Review</p>
          <p className="agent-review-panel__body">
            {contextLabel} Connectors stay visible because this screen plan is specific to high-
            trust changes.
          </p>
        </div>
      </div>

      <div className="agent-review-panel__seal" aria-hidden="true">
        <div className="agent-review-panel__seal-ring">
          <span>CONSENT TO</span>
          <span>SYNCHRONIZATION</span>
          <span>NO SIDE EFFECTS</span>
        </div>
      </div>

      <label className="agent-review-panel__checkbox">
        <input type="checkbox" />
        <span>Operator Review: I understand this is a manual override</span>
      </label>

      <button type="button" className="agent-review-panel__action">
        Disable Account (Explicit Log Created)
      </button>
    </aside>
  );
}

function AppShell() {
  const location = useLocation();

  if (location.pathname === "/") {
    return (
      <main className="mockup-app-shell">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="agent-shell">
      <BrowserToolbar />

      <div className="agent-console">
        <aside className="agent-sidebar">
          <div className="agent-sidebar__brand">
            <div className="agent-sidebar__brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3 4.5 6v5.4c0 4.4 2.8 8.5 7.5 10.6 4.7-2.1 7.5-6.2 7.5-10.6V6Z" />
                <path d="M12 8.1c-1.9 0-3.4 1.5-3.4 3.4 0 1 .4 1.9 1.2 2.5-.2 1.3-.8 2.5-1.8 3.4 1.3-.4 2.7-.6 4-.6s2.7.2 4 .6c-1-.9-1.6-2.1-1.8-3.4.8-.6 1.2-1.5 1.2-2.5 0-1.9-1.5-3.4-3.4-3.4Z" />
              </svg>
            </div>
            <div>
              <p className="agent-sidebar__brand-title">AgentSmith</p>
              <p className="agent-sidebar__brand-subtitle">s-os</p>
            </div>
          </div>

          <nav className="agent-sidebar__nav" aria-label="Primary">
            {primaryItems.map((item) => (
              <ShellNavigationItem key={item.label} item={item} />
            ))}
          </nav>

          <nav className="agent-sidebar__nav agent-sidebar__nav--utility" aria-label="Utilities">
            {utilityItems.map((item) => (
              <ShellNavigationItem key={item.label} item={item} />
            ))}
          </nav>
        </aside>

        <section className="agent-main-stage">
          <Outlet />
        </section>

        <ReviewPanel />
      </div>
    </div>
  );
}

function BackupRouteIntro(props: {
  eyebrow: string;
  title: string;
  description: string;
  primaryLink: { to: string; label: string };
  secondaryLink?: { to: string; label: string };
}) {
  return (
    <section style={{ display: "grid", gap: 20 }}>
      <article
        style={{
          padding: 24,
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#0369a1",
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontWeight: 700,
          }}
        >
          {props.eyebrow}
        </p>
        <h2 style={{ margin: "12px 0 10px", fontSize: "2rem" }}>{props.title}</h2>
        <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 760 }}>{props.description}</p>
        <p style={{ margin: "14px 0 0", color: "#0f172a", fontWeight: 700 }}>
          Records evidence only - no backup jobs or restore actions are triggered here.
        </p>
      </article>

      <section
        style={{
          padding: 24,
          borderRadius: 24,
          background: "#ffffff",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>Route entry point</h3>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 720 }}>
            The backup module shell is now wired into navigation. Task 2 replaces this route intro with the
            queue-first overview and inventory pages.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <NavLink
            to={props.primaryLink.to}
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
            {props.primaryLink.label}
          </NavLink>
          {props.secondaryLink ? (
            <NavLink
              to={props.secondaryLink.to}
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
              {props.secondaryLink.label}
            </NavLink>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function BackupOverviewRouteIntro() {
  return (
    <BackupRouteIntro
      eyebrow="Backup confidence"
      title="Backup review workspace"
      description="Start with the backup review queue, confirm where coverage is missing or restore proof is stale, then open inventory for a broader protected-system scan."
      primaryLink={{ to: "/backup/inventory", label: "Open backup inventory" }}
    />
  );
}

function BackupInventoryRouteIntro() {
  return (
    <BackupRouteIntro
      eyebrow="Backup inventory"
      title="Protected-system inventory"
      description="Server-driven filters and backup confidence context will land here so the operator can widen or narrow the protected-system scan without losing trust details."
      primaryLink={{ to: "/backup", label: "Back to backup overview" }}
      secondaryLink={{ to: "/backup/inventory", label: "Refresh inventory route" }}
    />
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
      { path: "network", element: <NetworkOverviewPage /> },
      { path: "network/map", element: <NetworkMapPage /> },
      { path: "network/inventory", element: <NetworkInventoryPage /> },
      { path: "network/resources/:resourceId", element: <NetworkDetailPage /> },
      { path: "backup", element: <BackupOverviewRouteIntro /> },
      { path: "backup/inventory", element: <BackupInventoryRouteIntro /> },
      { path: "lifecycle", element: <LifecycleQueuePage /> },
      { path: "lifecycle/runs/:runId", element: <LifecycleRunDetailPage /> },
    ],
  },
]);
