import { createBrowserRouter, NavLink, Outlet, type RouteObject } from "react-router-dom";
import { AssetDashboardPage } from "./routes/dashboard/AssetDashboardPage";
import { DeviceInventoryPage } from "./routes/assets/DeviceInventoryPage";
import { DeviceDetailPage } from "./routes/assets/DeviceDetailPage";
import { LifecycleQueuePage } from "./routes/lifecycle/LifecycleQueuePage";
import { LifecycleRunDetailPage } from "./routes/lifecycle/LifecycleRunDetailPage";
import { BackupDetailPage } from "./routes/backup/BackupDetailPage";
import { BackupInventoryPage } from "./routes/backup/BackupInventoryPage";
import { BackupOverviewPage } from "./routes/backup/BackupOverviewPage";
import { NetworkDetailPage } from "./routes/network/NetworkDetailPage";
import { NetworkMapPage } from "./routes/network/NetworkMapPage";
import { NetworkOverviewPage } from "./routes/network/NetworkOverviewPage";
import { NetworkInventoryPage } from "./routes/network/NetworkInventoryPage";
import { DocumentationOverviewPage } from "./routes/docs/DocumentationOverviewPage";
import { DocumentationSearchPage } from "./routes/docs/DocumentationSearchPage";
import { DocumentationDetailPage } from "./routes/docs/DocumentationDetailPage";
import { AuditTrailPage } from "./routes/audit/AuditTrailPage";
import { ConnectorStatusPage } from "./routes/connectors/ConnectorStatusPage";
import { IntegrationsPage } from "./routes/settings/IntegrationsPage";
import { LoginPage } from "./routes/LoginPage";
import { SetupPage } from "./routes/SetupPage";
import { ProtectedLayout } from "./routes/ProtectedLayout";

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
  { to: "/docs", label: "Documentation", icon: "docs" },
  { to: "/connectors", label: "Connectors", icon: "connectors" },
  { to: "/audit", label: "Audit Log", icon: "audit" },
  { to: "/settings", label: "Integrations", icon: "settings" },
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

function AppShell() {
  return (
    <div className="agent-shell">
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
              <p className="agent-sidebar__brand-subtitle">S-OS</p>
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
      </div>
    </div>
  );
}

const backupTrustBoundaryCopy = "Read-only evidence view - no backup jobs, restores, or exceptions can be executed here.";
const documentationTrustBoundaryCopy =
  "Document content stays read-only in this phase. Metadata changes go through explicit review and audit logging.";

export const appRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/setup",
    element: <SetupPage />,
  },
  {
    element: <ProtectedLayout />,
    children: [
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
          { path: "backup", element: <BackupOverviewPage trustBoundaryCopy={backupTrustBoundaryCopy} /> },
          { path: "backup/inventory", element: <BackupInventoryPage trustBoundaryCopy={backupTrustBoundaryCopy} /> },
          { path: "backup/systems/:systemId", element: <BackupDetailPage /> },
          { path: "docs", element: <DocumentationOverviewPage trustBoundaryCopy={documentationTrustBoundaryCopy} /> },
          { path: "docs/search", element: <DocumentationSearchPage trustBoundaryCopy={documentationTrustBoundaryCopy} /> },
          { path: "docs/:documentId", element: <DocumentationDetailPage trustBoundaryCopy={documentationTrustBoundaryCopy} /> },
          { path: "lifecycle", element: <LifecycleQueuePage /> },
          { path: "lifecycle/runs/:runId", element: <LifecycleRunDetailPage /> },
          { path: "connectors", element: <ConnectorStatusPage /> },
          { path: "audit", element: <AuditTrailPage /> },
          { path: "settings", element: <IntegrationsPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export const router = createAppRouter();
