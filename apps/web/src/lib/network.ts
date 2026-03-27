export type NetworkDataMode = "live" | "seeded_example" | string;
export type NetworkFreshnessState = "healthy" | "warning" | "stale" | "error" | string;
export type NetworkResourceKind =
  | "site"
  | "wan_link"
  | "lan_segment"
  | "firewall"
  | "switch"
  | "access_point"
  | "dhcp_service"
  | "vpn_service"
  | string;
export type NetworkRelationConfidence = "confirmed" | "inferred" | string;

export type NetworkFinding = {
  dataMode: NetworkDataMode;
  findingId: string;
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  kind: string;
  severity: string;
  queueRank: number;
  siteName: string | null;
  scopeLabel: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  summary: string;
  suggestedNextStep: string;
};

export type NetworkInventoryParams = {
  search?: string;
  kind?: string;
  site?: string;
  operationalStatus?: string;
  freshnessState?: string;
};

export type NetworkInventoryRow = {
  dataMode: NetworkDataMode;
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  siteName: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  managementIp: string | null;
  cidr: string | null;
  ownerLabel: string | null;
  summary?: string | null;
  suggestedNextStep?: string | null;
};

export type NetworkMapSiteScope = {
  siteName: string;
  resourceIds: string[];
  relationshipCount: number;
  freshnessState: NetworkFreshnessState;
};

export type NetworkMapResource = {
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
  lastSeenAt: string | null;
};

export type NetworkMap = {
  dataMode: NetworkDataMode;
  sites: NetworkMapSiteScope[];
  resources: NetworkMapResource[];
  relationships: NetworkMapRelationship[];
};

export type NetworkRelatedResource = {
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  siteName: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  relationship: string;
  confidence: NetworkRelationConfidence;
  direction: "incoming" | "outgoing";
};

export type NetworkResourceDetail = {
  dataMode: NetworkDataMode;
  resourceId: string;
  resourceName: string;
  resourceKind: NetworkResourceKind;
  siteName: string | null;
  operationalStatus: string | null;
  freshnessState: NetworkFreshnessState;
  lastSeenAt: string | null;
  managementIp: string | null;
  cidr: string | null;
  ownerLabel: string | null;
  scopeSummary: string;
  summary: string;
  suggestedNextStep: string | null;
  findings: NetworkFinding[];
  relatedResources: NetworkRelatedResource[];
};

type NetworkFindingsResponse = {
  dataMode: NetworkDataMode;
  items: NetworkFinding[];
};

type NetworkInventoryResponse = {
  dataMode: NetworkDataMode;
  items: NetworkInventoryRow[];
};

async function apiRequest<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getNetworkFindings() {
  return apiRequest<NetworkFindingsResponse>("/api/network/findings").then((response) => response.items);
}

export function getNetworkInventory(params: NetworkInventoryParams = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  const url = query ? `/api/network/resources?${query}` : "/api/network/resources";

  return apiRequest<NetworkInventoryResponse>(url).then((response) => response.items);
}

export function getNetworkMap() {
  return apiRequest<NetworkMap>("/api/network/map");
}

export function getNetworkResourceDetail(resourceId: string) {
  return apiRequest<NetworkResourceDetail>(`/api/network/resources/${resourceId}`);
}
