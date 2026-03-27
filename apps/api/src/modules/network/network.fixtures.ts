import type {
  NetworkFindingKind,
  NetworkFreshnessState,
  NetworkRelationConfidence,
  NetworkResourceKind,
  NetworkSeverityLevel,
} from "./network.types.js";

export type NetworkFixtureResource = {
  id: string;
  sourceSystem: string;
  sourceId: string;
  kind: NetworkResourceKind;
  name: string;
  siteName: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  managementIp: string | null;
  cidr: string | null;
  ownerLabel: string | null;
  metadata: Record<string, unknown> | null;
};

export type NetworkFixtureRelationship = {
  id: string;
  fromResourceId: string;
  toResourceId: string;
  relationship: string;
  confidence: NetworkRelationConfidence;
  sourceSystem: string;
  lastSeenAt: string | null;
  metadata: Record<string, unknown> | null;
};

export type NetworkFixtureFinding = {
  id: string;
  resourceId: string;
  kind: NetworkFindingKind;
  severity: NetworkSeverityLevel;
  summary: string;
  suggestedNextStep: string;
  queueRank: number;
  siteName: string | null;
  scopeLabel: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
};

const seededSource = "seeded_example";

export const networkFixtureResources: NetworkFixtureResource[] = [
  {
    id: "site-hq",
    sourceSystem: seededSource,
    sourceId: "site-hq",
    kind: "site",
    name: "HQ",
    siteName: "HQ",
    operationalStatus: "online",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T12:00:00.000Z",
    managementIp: null,
    cidr: null,
    ownerLabel: "IT Infrastructure",
    metadata: { countryCode: "US", region: "East" },
  },
  {
    id: "site-branch",
    sourceSystem: seededSource,
    sourceId: "site-branch",
    kind: "site",
    name: "Branch Office",
    siteName: "Branch Office",
    operationalStatus: "online",
    freshnessState: "warning",
    lastSeenAt: "2026-03-27T10:30:00.000Z",
    managementIp: null,
    cidr: null,
    ownerLabel: "Field IT",
    metadata: { countryCode: "US", region: "Midwest" },
  },
  {
    id: "wan-primary",
    sourceSystem: seededSource,
    sourceId: "wan-primary",
    kind: "wan_link",
    name: "Primary WAN",
    siteName: "HQ",
    operationalStatus: "degraded",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:58:00.000Z",
    managementIp: null,
    cidr: null,
    ownerLabel: "ISP Provider",
    metadata: { provider: "MetroFiber" },
  },
  {
    id: "lan-hq-users",
    sourceSystem: seededSource,
    sourceId: "lan-hq-users",
    kind: "lan_segment",
    name: "HQ Users LAN",
    siteName: "HQ",
    operationalStatus: "online",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:57:00.000Z",
    managementIp: null,
    cidr: "10.10.0.0/24",
    ownerLabel: "IT Infrastructure",
    metadata: { vlanId: 10 },
  },
  {
    id: "lan-branch-users",
    sourceSystem: seededSource,
    sourceId: "lan-branch-users",
    kind: "lan_segment",
    name: "Branch Users LAN",
    siteName: "Branch Office",
    operationalStatus: "online",
    freshnessState: "warning",
    lastSeenAt: "2026-03-27T09:10:00.000Z",
    managementIp: null,
    cidr: "10.20.0.0/24",
    ownerLabel: "Field IT",
    metadata: { vlanId: 20 },
  },
  {
    id: "firewall-hq-01",
    sourceSystem: seededSource,
    sourceId: "firewall-hq-01",
    kind: "firewall",
    name: "HQ Edge Firewall",
    siteName: "HQ",
    operationalStatus: "offline",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:50:00.000Z",
    managementIp: "10.10.0.1",
    cidr: null,
    ownerLabel: "Network Operations",
    metadata: { vendor: "Fortinet" },
  },
  {
    id: "switch-hq-core-01",
    sourceSystem: seededSource,
    sourceId: "switch-hq-core-01",
    kind: "switch",
    name: "HQ Core Switch",
    siteName: "HQ",
    operationalStatus: "online",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:56:00.000Z",
    managementIp: "10.10.0.2",
    cidr: null,
    ownerLabel: "Network Operations",
    metadata: { vendor: "Cisco" },
  },
  {
    id: "ap-branch-01",
    sourceSystem: seededSource,
    sourceId: "ap-branch-01",
    kind: "access_point",
    name: "Branch AP 01",
    siteName: "Branch Office",
    operationalStatus: "online",
    freshnessState: "stale",
    lastSeenAt: "2026-03-20T08:15:00.000Z",
    managementIp: "10.20.0.10",
    cidr: null,
    ownerLabel: "Field IT",
    metadata: { vendor: "Ubiquiti" },
  },
  {
    id: "dhcp-hq-01",
    sourceSystem: seededSource,
    sourceId: "dhcp-hq-01",
    kind: "dhcp_service",
    name: "HQ DHCP",
    siteName: "HQ",
    operationalStatus: "online",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:40:00.000Z",
    managementIp: "10.10.0.20",
    cidr: null,
    ownerLabel: "Infrastructure Services",
    metadata: { scopeCount: 2 },
  },
  {
    id: "vpn-hub-01",
    sourceSystem: seededSource,
    sourceId: "vpn-hub-01",
    kind: "vpn_service",
    name: "HQ VPN Hub",
    siteName: "HQ",
    operationalStatus: "online",
    freshnessState: "warning",
    lastSeenAt: "2026-03-27T10:45:00.000Z",
    managementIp: "10.10.0.30",
    cidr: null,
    ownerLabel: null,
    metadata: { remoteUserCount: 14 },
  },
];

export const networkFixtureRelationships: NetworkFixtureRelationship[] = [
  {
    id: "rel-site-hq-wan",
    fromResourceId: "site-hq",
    toResourceId: "wan-primary",
    relationship: "uplink",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T11:58:00.000Z",
    metadata: { connector: "site_export" },
  },
  {
    id: "rel-wan-branch",
    fromResourceId: "wan-primary",
    toResourceId: "site-branch",
    relationship: "serves_site",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T10:30:00.000Z",
    metadata: { connector: "site_export" },
  },
  {
    id: "rel-site-hq-lan",
    fromResourceId: "site-hq",
    toResourceId: "lan-hq-users",
    relationship: "contains_segment",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T11:57:00.000Z",
    metadata: { connector: "site_export" },
  },
  {
    id: "rel-site-branch-lan",
    fromResourceId: "site-branch",
    toResourceId: "lan-branch-users",
    relationship: "contains_segment",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T09:10:00.000Z",
    metadata: { connector: "site_export" },
  },
  {
    id: "rel-firewall-wan",
    fromResourceId: "firewall-hq-01",
    toResourceId: "wan-primary",
    relationship: "protects_uplink",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T11:50:00.000Z",
    metadata: { connector: "firewall_export" },
  },
  {
    id: "rel-firewall-lan",
    fromResourceId: "firewall-hq-01",
    toResourceId: "lan-hq-users",
    relationship: "protects_segment",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T11:50:00.000Z",
    metadata: { connector: "firewall_export" },
  },
  {
    id: "rel-switch-lan",
    fromResourceId: "switch-hq-core-01",
    toResourceId: "lan-hq-users",
    relationship: "switches_segment",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T11:56:00.000Z",
    metadata: { connector: "switch_export" },
  },
  {
    id: "rel-ap-lan",
    fromResourceId: "ap-branch-01",
    toResourceId: "lan-branch-users",
    relationship: "broadcasts_on",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-20T08:15:00.000Z",
    metadata: { connector: "wireless_export" },
  },
  {
    id: "rel-dhcp-lan",
    fromResourceId: "dhcp-hq-01",
    toResourceId: "lan-hq-users",
    relationship: "assigns_addresses",
    confidence: "confirmed",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T11:40:00.000Z",
    metadata: { connector: "dhcp_export" },
  },
  {
    id: "rel-vpn-wan",
    fromResourceId: "vpn-hub-01",
    toResourceId: "wan-primary",
    relationship: "terminates_vpn",
    confidence: "inferred",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T10:45:00.000Z",
    metadata: { connector: "remote_access_audit" },
  },
  {
    id: "rel-vpn-branch",
    fromResourceId: "vpn-hub-01",
    toResourceId: "site-branch",
    relationship: "supports_remote_access",
    confidence: "inferred",
    sourceSystem: seededSource,
    lastSeenAt: "2026-03-27T10:45:00.000Z",
    metadata: { connector: "remote_access_audit" },
  },
];

export const networkFixtureFindings: NetworkFixtureFinding[] = [
  {
    id: "finding-firewall-offline",
    resourceId: "firewall-hq-01",
    kind: "offline_infrastructure",
    severity: "critical",
    summary: "HQ Edge Firewall is offline.",
    suggestedNextStep: "Investigate edge firewall reachability.",
    queueRank: 1,
    siteName: "HQ",
    scopeLabel: "HQ perimeter",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:50:00.000Z",
  },
  {
    id: "finding-ap-stale",
    resourceId: "ap-branch-01",
    kind: "stale_telemetry",
    severity: "high",
    summary: "Branch AP 01 has stale telemetry.",
    suggestedNextStep: "Refresh wireless telemetry and confirm controller reporting.",
    queueRank: 2,
    siteName: "Branch Office",
    scopeLabel: "Branch wireless",
    freshnessState: "stale",
    lastSeenAt: "2026-03-20T08:15:00.000Z",
  },
  {
    id: "finding-vpn-owner",
    resourceId: "vpn-hub-01",
    kind: "unclear_ownership",
    severity: "watch",
    summary: "HQ VPN Hub does not have a confirmed owner.",
    suggestedNextStep: "Confirm service ownership.",
    queueRank: 3,
    siteName: "HQ",
    scopeLabel: "Remote access",
    freshnessState: "warning",
    lastSeenAt: "2026-03-27T10:45:00.000Z",
  },
  {
    id: "finding-branch-gap",
    resourceId: "lan-branch-users",
    kind: "topology_gap",
    severity: "watch",
    summary: "Branch Users LAN lacks a confirmed uplink relationship.",
    suggestedNextStep: "Review site mapping.",
    queueRank: 4,
    siteName: "Branch Office",
    scopeLabel: "Branch Office LAN",
    freshnessState: "warning",
    lastSeenAt: "2026-03-27T09:10:00.000Z",
  },
];
