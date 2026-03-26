export const assetRiskSignalCodes = [
  "stale_check_in",
  "low_disk",
  "missing_encryption",
  "missing_antivirus",
  "missing_patch",
  "unsupported_os",
  "old_device",
  "data_incomplete",
] as const;

export type AssetRiskSignalCode = (typeof assetRiskSignalCodes)[number];

export type AssetRiskSignal = {
  code: AssetRiskSignalCode;
  severity: "low" | "medium" | "high" | "critical";
  label: string;
  explanation: string;
};

export type AssetInventoryRow = {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  department: string | null;
  site: string | null;
  operatingSystem: string | null;
  lastCheckInAt: string | null;
  encryptionStatus: string | null;
  antivirusStatus: string | null;
  patchStatus: string | null;
  diskFreePercent: number | null;
  deviceAgeDays: number | null;
  supportStatus: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  queueRank: number | null;
  freshnessState: string | null;
  summary: string | null;
  signals: AssetRiskSignal[];
};

export type AssetQueueItem = {
  id: string;
  name: string;
  ownerName: string | null;
  riskScore: number;
  riskLevel: string;
  queueRank: number;
  summary: string;
  freshnessState: string;
  signals: AssetRiskSignal[];
};

export type AssetDetail = AssetInventoryRow & {
  serialNumber: string | null;
  complianceState: string | null;
  sourceSystem: string;
  sourceId: string;
  calculatedAt: string | null;
};

export type AssetInventoryFilters = {
  search?: string;
  ownerId?: string;
  department?: string;
  site?: string;
  riskLevel?: string;
  encryptionStatus?: string;
  antivirusStatus?: string;
  patchStatus?: string;
  supportStatus?: string;
  signalCode?: AssetRiskSignalCode;
};
