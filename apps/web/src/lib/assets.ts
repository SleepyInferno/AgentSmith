export type RiskLevel = "low" | "medium" | "high" | "critical" | string;
export type SourceFreshnessState = "healthy" | "warning" | "stale" | "error" | "incomplete" | string;

export type AssetRiskSignal = {
  code: string;
  label: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
};

export type AssetQueueItem = {
  deviceId: string;
  deviceName: string;
  riskScore: number;
  riskLevel: RiskLevel;
  queueRank: number;
  summary: string;
  signals: AssetRiskSignal[];
  sourceFreshnessState: SourceFreshnessState;
};

export type AssetInventoryRow = {
  deviceId: string;
  deviceName: string;
  ownerDisplayName: string | null;
  department: string | null;
  site: string | null;
  operatingSystem: string | null;
  encryptionStatus: string | null;
  antivirusStatus: string | null;
  patchStatus: string | null;
  lastCheckInAt: string | null;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  summary: string | null;
  signals: AssetRiskSignal[];
  sourceFreshnessState: SourceFreshnessState;
};

export type AssetDetail = AssetInventoryRow & {
  ownerEmail: string | null;
  diskFreePercent: number | null;
  deviceAgeDays: number | null;
  supportStatus: string | null;
  serialNumber: string | null;
  complianceState: string | null;
  sourceSystem: string;
  sourceId: string;
  calculatedAt: string | null;
  queueRank: number | null;
};

export type DeviceInventoryParams = {
  search?: string;
  ownerId?: string;
  department?: string;
  site?: string;
  riskLevel?: string;
  riskSignal?: string;
  encryptionStatus?: string;
  antivirusStatus?: string;
  patchStatus?: string;
  staleOnly?: boolean;
  sortField?: "riskScore" | "lastCheckInAt" | "deviceName" | "operatingSystem";
  sortDirection?: "asc" | "desc";
};

type QueueResponse = {
  items: AssetQueueItem[];
};

type InventoryResponse = {
  items: AssetInventoryRow[];
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

export function getNeedsAttentionQueue() {
  return apiRequest<QueueResponse>("/api/assets/queue").then((response) => response.items);
}

export function getDeviceInventory(params: DeviceInventoryParams = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (typeof value === "boolean") {
      searchParams.set(key, String(value));
      continue;
    }

    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  const url = query ? `/api/assets/devices?${query}` : "/api/assets/devices";

  return apiRequest<InventoryResponse>(url).then((response) => response.items);
}

export function getDeviceDetail(deviceId: string) {
  return apiRequest<AssetDetail>(`/api/assets/devices/${deviceId}`);
}
