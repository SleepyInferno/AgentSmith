import type { CSSProperties } from "react";
import type { NetworkMap, NetworkMapRelationship, NetworkMapResource, NetworkMapSiteScope } from "../../lib/network";

type NetworkMapCanvasProps = {
  map: NetworkMap;
};

type SiteNode = {
  resourceId: string;
  siteName: string;
  relationshipCount: number;
  freshnessState: string;
  resourceCount: number;
};

type ColumnNode =
  | {
      id: string;
      column: "Sites";
      title: string;
      subtitle: string;
      operationalStatus: string | null;
      freshnessState: string;
      lastSeenAt: string | null;
      kindLabel: string;
      metaLabel: string;
      tone: CSSProperties;
    }
  | {
      id: string;
      column: "WAN links" | "LAN segments" | "Core infrastructure";
      title: string;
      subtitle: string;
      operationalStatus: string | null;
      freshnessState: string;
      lastSeenAt: string | null;
      kindLabel: string;
      metaLabel: string;
      tone: CSSProperties;
    };

const columnOrder = ["Sites", "WAN links", "LAN segments", "Core infrastructure"] as const;
const columnWidth = 258;
const cardHeight = 120;
const rowGap = 30;
const columnGap = 52;
const canvasPadding = 36;

export function NetworkMapCanvas({ map }: NetworkMapCanvasProps) {
  const siteResources = new Map(
    map.resources.filter((resource) => resource.resourceKind === "site").map((resource) => [resource.resourceId, resource]),
  );

  const siteNodes = map.sites
    .map((site) => buildSiteNode(site, siteResources))
    .filter((site): site is SiteNode => site !== null);
  const resources = map.resources.filter((resource) => resource.resourceKind !== "site");

  const columns: Record<(typeof columnOrder)[number], ColumnNode[]> = {
    Sites: siteNodes.map((site) => ({
      id: site.resourceId,
      column: "Sites",
      title: site.siteName,
      subtitle: `${site.resourceCount} resources in scope`,
      operationalStatus: null,
      freshnessState: site.freshnessState,
      lastSeenAt: null,
      kindLabel: "Site scope",
      metaLabel: `${site.relationshipCount} mapped relationships`,
      tone: toneForKind("site"),
    })),
    "WAN links": resources
      .filter((resource) => resource.resourceKind === "wan_link")
      .map((resource) => buildResourceNode(resource, "WAN links")),
    "LAN segments": resources
      .filter((resource) => resource.resourceKind === "lan_segment")
      .map((resource) => buildResourceNode(resource, "LAN segments")),
    "Core infrastructure": resources
      .filter((resource) =>
        ["firewall", "switch", "access_point", "dhcp_service", "vpn_service"].includes(resource.resourceKind),
      )
      .map((resource) => buildResourceNode(resource, "Core infrastructure")),
  };

  const columnHeights = columnOrder.map((column) => columns[column].length);
  const maxRows = Math.max(...columnHeights, 1);
  const svgWidth = canvasPadding * 2 + columnOrder.length * columnWidth + (columnOrder.length - 1) * columnGap;
  const svgHeight = canvasPadding * 2 + maxRows * cardHeight + Math.max(maxRows - 1, 0) * rowGap;
  const nodePositions = buildNodePositions(columns);

  return (
    <div
      style={{
        position: "relative",
        overflowX: "auto",
        padding: 12,
        borderRadius: 28,
        background:
          "linear-gradient(180deg, rgba(240, 249, 255, 0.95), rgba(248, 250, 252, 0.98)), repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.08) 1px, transparent 1px, transparent 90px)",
        border: "1px solid rgba(148, 163, 184, 0.22)",
      }}
    >
      <div style={{ position: "relative", width: svgWidth, height: svgHeight }}>
        <svg
          aria-hidden="true"
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ position: "absolute", inset: 0 }}
        >
          {map.relationships.map((relationship) => {
            const from = nodePositions.get(relationship.fromResourceId);
            const to = nodePositions.get(relationship.toResourceId);

            if (!from || !to) {
              return null;
            }

            const stroke = relationship.confidence === "confirmed" ? "#5eead4" : "#b45309";
            const controlOffset = Math.max(42, Math.abs(to.x - from.x) * 0.35);

            return (
              <path
                key={relationship.relationshipId}
                d={`M ${from.x} ${from.y} C ${from.x + controlOffset} ${from.y}, ${to.x - controlOffset} ${to.y}, ${to.x} ${to.y}`}
                fill="none"
                stroke={stroke}
                strokeWidth={relationship.confidence === "confirmed" ? 3 : 2.5}
                strokeDasharray={relationship.confidence === "confirmed" ? undefined : "10 8"}
                opacity={relationship.confidence === "confirmed" ? 0.92 : 0.8}
              />
            );
          })}
        </svg>

        {columnOrder.map((column, columnIndex) => {
          const x = canvasPadding + columnIndex * (columnWidth + columnGap);

          return (
            <section
              key={column}
              aria-label={column}
              style={{
                position: "absolute",
                top: canvasPadding,
                left: x,
                width: columnWidth,
                display: "grid",
                gap: rowGap,
              }}
            >
              <header
                style={{
                  minHeight: 74,
                  padding: "14px 16px",
                  borderRadius: 20,
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
                }}
              >
                <p style={columnLabelStyle}>{column}</p>
                <strong style={{ color: "#dff4d3", fontSize: "1.05rem" }}>{columns[column].length} items</strong>
              </header>

              {columns[column].map((node, index) => {
                const y = cardY(index);

                return (
                  <article
                    key={node.id}
                    style={{
                      ...nodeCardStyle,
                      top: y,
                      minHeight: cardHeight,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ ...kindPillStyle, ...node.tone }}>{node.kindLabel}</span>
                        <h3 style={{ margin: "12px 0 6px", fontSize: "1rem", color: "#dff4d3" }}>{node.title}</h3>
                        <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.55 }}>{node.subtitle}</p>
                      </div>
                      <span style={metaLabelStyle}>{node.metaLabel}</span>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                      {node.operationalStatus ? (
                        <span style={{ ...badgeStyle, ...toneForStatus(node.operationalStatus) }}>
                          {formatLabel(node.operationalStatus)}
                        </span>
                      ) : null}
                      <span style={{ ...badgeStyle, ...toneForFreshness(node.freshnessState) }}>
                        {formatLabel(node.freshnessState)}
                      </span>
                    </div>

                    {node.lastSeenAt ? <p style={lastSeenStyle}>Last seen {formatDateTime(node.lastSeenAt)}</p> : null}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function buildSiteNode(site: NetworkMapSiteScope, siteResources: Map<string, NetworkMapResource>) {
  const siteResourceId = site.resourceIds.find((resourceId) => siteResources.has(resourceId));

  if (!siteResourceId) {
    return null;
  }

  return {
    resourceId: siteResourceId,
    siteName: site.siteName,
    relationshipCount: site.relationshipCount,
    freshnessState: site.freshnessState,
    resourceCount: site.resourceIds.length,
  };
}

function buildResourceNode(
  resource: NetworkMapResource,
  column: "WAN links" | "LAN segments" | "Core infrastructure",
): ColumnNode {
  return {
    id: resource.resourceId,
    column,
    title: resource.resourceName,
    subtitle: resource.siteName ? `${resource.siteName} scope` : "Shared network scope",
    operationalStatus: resource.operationalStatus,
    freshnessState: resource.freshnessState,
    lastSeenAt: resource.lastSeenAt,
    kindLabel: formatKind(resource.resourceKind),
    metaLabel: resource.siteName ?? "No site",
    tone: toneForKind(resource.resourceKind),
  };
}

function buildNodePositions(columns: Record<(typeof columnOrder)[number], ColumnNode[]>) {
  const positions = new Map<string, { x: number; y: number }>();

  columnOrder.forEach((column, columnIndex) => {
    const centerX = canvasPadding + columnIndex * (columnWidth + columnGap) + columnWidth / 2;

    columns[column].forEach((node, index) => {
      positions.set(node.id, {
        x: centerX,
        y: cardY(index) + cardHeight / 2,
      });
    });
  });

  return positions;
}

function cardY(index: number) {
  return 112 + index * (cardHeight + rowGap);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatKind(value: string) {
  switch (value) {
    case "access_point":
      return "Access point";
    case "dhcp_service":
      return "DHCP service";
    case "lan_segment":
      return "LAN segment";
    case "vpn_service":
      return "VPN service";
    case "wan_link":
      return "WAN link";
    default:
      return formatLabel(value);
  }
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toneForKind(kind: string): CSSProperties {
  switch (kind) {
    case "site":
      return { color: "#93c5fd", background: "rgba(59, 130, 246, 0.15)" };
    case "wan_link":
      return { color: "#5eead4", background: "rgba(20, 184, 166, 0.15)" };
    case "lan_segment":
      return { color: "#c4b5fd", background: "rgba(124, 58, 237, 0.15)" };
    default:
      return { color: "#92400e", background: "#fef3c7" };
  }
}

function toneForStatus(status: string): CSSProperties {
  switch (status) {
    case "online":
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.12)" };
    case "offline":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    case "degraded":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
    default:
      return { color: "#9eb79b", background: "rgba(129, 255, 164, 0.08)" };
  }
}

function toneForFreshness(state: string): CSSProperties {
  switch (state) {
    case "healthy":
      return { color: "#86efac", background: "rgba(134, 239, 172, 0.12)" };
    case "warning":
      return { color: "#fdba74", background: "rgba(234, 88, 12, 0.12)" };
    case "stale":
    case "error":
      return { color: "#fca5a5", background: "rgba(220, 38, 38, 0.15)" };
    default:
      return { color: "#9eb79b", background: "rgba(129, 255, 164, 0.08)" };
  }
}

const columnLabelStyle = {
  margin: 0,
  color: "#89ff93",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const nodeCardStyle = {
  position: "absolute" as const,
  insetInline: 0,
  padding: "16px 16px 14px",
  borderRadius: 22,
  background: "rgba(255, 255, 255, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.1)",
};

const kindPillStyle = {
  display: "inline-flex",
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
};

const badgeStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const metaLabelStyle = {
  color: "#9eb79b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const lastSeenStyle = {
  margin: "12px 0 0",
  color: "#9eb79b",
  fontSize: 13,
};
