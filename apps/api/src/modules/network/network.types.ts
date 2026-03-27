export const networkDataModes = ["live", "seeded_example"] as const;
export type NetworkDataMode = (typeof networkDataModes)[number];

export const networkResourceKinds = [
  "site",
  "wan_link",
  "lan_segment",
  "firewall",
  "switch",
  "access_point",
  "dhcp_service",
  "vpn_service",
] as const;
export type NetworkResourceKind = (typeof networkResourceKinds)[number];

export const networkRelationConfidences = ["confirmed", "inferred"] as const;
export type NetworkRelationConfidence = (typeof networkRelationConfidences)[number];

export const networkFindingKinds = [
  "offline_infrastructure",
  "stale_telemetry",
  "topology_gap",
  "unclear_ownership",
] as const;
export type NetworkFindingKind = (typeof networkFindingKinds)[number];

export const networkSeverityLevels = ["low", "watch", "high", "critical"] as const;
export type NetworkSeverityLevel = (typeof networkSeverityLevels)[number];

export const networkFreshnessStates = ["healthy", "warning", "stale", "error"] as const;
export type NetworkFreshnessState = (typeof networkFreshnessStates)[number];

export type NetworkInventoryRow = {
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  sourceSystem: string;
  sourceId: string;
  siteName: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  managementIp: string | null;
  cidr: string | null;
  ownerLabel: string | null;
  dataMode: NetworkDataMode;
};

export type NetworkFindingItem = {
  findingId: string;
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  kind: NetworkFindingKind;
  severity: NetworkSeverityLevel;
  queueRank: number;
  siteName: string | null;
  scopeLabel: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  summary: string;
  suggestedNextStep: string;
  dataMode: NetworkDataMode;
};

export type NetworkMapNode = {
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  siteName: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
};

export type NetworkMapRelationship = {
  relationshipId: string;
  fromResourceId: string;
  toResourceId: string;
  relationship: string;
  confidence: NetworkRelationConfidence;
  sourceSystem: string;
  lastSeenAt: string | null;
};

export type NetworkMapSiteScope = {
  siteName: string;
  resourceIds: string[];
  relationshipCount: number;
  freshnessState: NetworkFreshnessState;
};

export type NetworkMapResponse = {
  dataMode: NetworkDataMode;
  sites: NetworkMapSiteScope[];
  resources: NetworkMapNode[];
  relationships: NetworkMapRelationship[];
};

export type NetworkRelatedResource = NetworkMapNode & {
  relationship: string;
  confidence: NetworkRelationConfidence;
  direction: "incoming" | "outgoing";
};

export type NetworkResourceDetail = {
  dataMode: NetworkDataMode;
  resource: NetworkInventoryRow;
  relatedResources: NetworkRelatedResource[];
  findings: NetworkFindingItem[];
  scopeSummary: string;
  suggestedNextStep: string | null;
};

export type NetworkInventoryFilters = {
  kind?: NetworkResourceKind;
  siteName?: string;
  freshnessState?: NetworkFreshnessState;
  operationalStatus?: string;
  search?: string;
};
