import type {
  AssetDetail,
  AssetInventoryRow,
  AssetQueueItem,
  AssetRiskSignal,
} from "./asset-health.types.js";

const RISK_WEIGHTS = {
  missing_encryption: 35,
  missing_antivirus: 30,
  missing_patch: 25,
  unsupported_os: 25,
  stale_check_in: 20,
  low_disk: 15,
  old_device: 10,
  data_incomplete: 10,
} as const;

const STALE_CHECK_IN_DAYS = 14;
const LOW_DISK_THRESHOLD = 15;
const OLD_DEVICE_DAYS = 365 * 3;

export type AssetDeviceForScoring = Pick<
  AssetInventoryRow,
  | "id"
  | "name"
  | "ownerName"
  | "ownerEmail"
  | "department"
  | "site"
  | "operatingSystem"
  | "lastCheckInAt"
  | "encryptionStatus"
  | "antivirusStatus"
  | "patchStatus"
  | "diskFreePercent"
  | "deviceAgeDays"
  | "supportStatus"
> & {
  serialNumber?: string | null;
  complianceState?: string | null;
  sourceSystem?: string;
  sourceId?: string;
  freshnessState?: string | null;
};

export type AssetRiskAssessment = {
  riskScore: number;
  riskLevel: "low" | "watch" | "high" | "critical";
  summary: string;
  freshnessState: string;
  signals: AssetRiskSignal[];
};

export function scoreDeviceRisk(device: AssetDeviceForScoring): AssetRiskAssessment {
  const signals: AssetRiskSignal[] = [];

  if (device.encryptionStatus === "missing") {
    signals.push(createSignal("missing_encryption"));
  }

  if (device.antivirusStatus === "missing") {
    signals.push(createSignal("missing_antivirus"));
  }

  if (device.patchStatus === "missing") {
    signals.push(createSignal("missing_patch"));
  }

  if (device.supportStatus === "unsupported") {
    signals.push(createSignal("unsupported_os"));
  }

  if (isStaleCheckIn(device.lastCheckInAt)) {
    signals.push(createSignal("stale_check_in"));
  }

  if (typeof device.diskFreePercent === "number" && device.diskFreePercent < LOW_DISK_THRESHOLD) {
    signals.push(createSignal("low_disk"));
  }

  if (typeof device.deviceAgeDays === "number" && device.deviceAgeDays >= OLD_DEVICE_DAYS) {
    signals.push(createSignal("old_device"));
  }

  if (hasIncompleteData(device)) {
    signals.push(createSignal("data_incomplete"));
  }

  const riskScore = signals.reduce((total, signal) => total + RISK_WEIGHTS[signal.code], 0);
  const riskLevel = toRiskLevel(riskScore);
  const freshnessState = device.freshnessState ?? (signals.some((signal) => signal.code === "stale_check_in") ? "warning" : "healthy");

  return {
    riskScore,
    riskLevel,
    freshnessState,
    signals,
    summary: buildSummary(signals, riskLevel),
  };
}

export function buildQueueItems(devices: AssetDeviceForScoring[]): AssetQueueItem[] {
  return devices
    .map((device) => {
      const assessment = scoreDeviceRisk(device);
      return {
        id: device.id,
        name: device.name,
        ownerName: device.ownerName,
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        queueRank: 0,
        summary: assessment.summary,
        freshnessState: assessment.freshnessState,
        signals: assessment.signals,
      };
    })
    .sort((left, right) => {
      if (right.riskScore !== left.riskScore) {
        return right.riskScore - left.riskScore;
      }

      return left.name.localeCompare(right.name);
    })
    .map((item, index) => ({
      ...item,
      queueRank: index + 1,
    }));
}

export function buildDeviceDetail(device: AssetDeviceForScoring): AssetDetail {
  const assessment = scoreDeviceRisk(device);

  return {
    id: device.id,
    name: device.name,
    ownerName: device.ownerName,
    ownerEmail: device.ownerEmail,
    department: device.department,
    site: device.site,
    operatingSystem: device.operatingSystem,
    lastCheckInAt: device.lastCheckInAt,
    encryptionStatus: device.encryptionStatus,
    antivirusStatus: device.antivirusStatus,
    patchStatus: device.patchStatus,
    diskFreePercent: device.diskFreePercent,
    deviceAgeDays: device.deviceAgeDays,
    supportStatus: device.supportStatus,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    queueRank: 1,
    freshnessState: assessment.freshnessState,
    summary: assessment.summary,
    signals: assessment.signals,
    serialNumber: device.serialNumber ?? null,
    complianceState: device.complianceState ?? null,
    sourceSystem: device.sourceSystem ?? "unknown",
    sourceId: device.sourceId ?? device.id,
    calculatedAt: new Date().toISOString(),
  };
}

function createSignal(code: keyof typeof RISK_WEIGHTS): AssetRiskSignal {
  switch (code) {
    case "missing_encryption":
      return {
        code,
        severity: "critical",
        label: "Missing encryption",
        explanation: "Device storage is not encrypted, increasing exposure if the endpoint is lost or stolen.",
      };
    case "missing_antivirus":
      return {
        code,
        severity: "critical",
        label: "Missing antivirus",
        explanation: "No active antivirus status was reported for this endpoint.",
      };
    case "missing_patch":
      return {
        code,
        severity: "high",
        label: "Missing patch coverage",
        explanation: "Patch status is missing or failing, so the device may be exposed to known vulnerabilities.",
      };
    case "unsupported_os":
      return {
        code,
        severity: "high",
        label: "Unsupported OS",
        explanation: "The operating system is outside supported lifecycle coverage.",
      };
    case "stale_check_in":
      return {
        code,
        severity: "high",
        label: "Stale check-in",
        explanation: "The device has not checked in recently enough to trust its current telemetry.",
      };
    case "low_disk":
      return {
        code,
        severity: "medium",
        label: "Low disk space",
        explanation: "Free disk capacity is below the operational threshold.",
      };
    case "old_device":
      return {
        code,
        severity: "medium",
        label: "Older device",
        explanation: "Hardware age suggests elevated support or reliability risk.",
      };
    case "data_incomplete":
      return {
        code,
        severity: "medium",
        label: "Data incomplete",
        explanation: "One or more core health signals are unknown, so the device cannot be treated as healthy.",
      };
  }
}

function isStaleCheckIn(lastCheckInAt: string | null): boolean {
  if (!lastCheckInAt) {
    return true;
  }

  const lastCheckIn = new Date(lastCheckInAt);
  if (Number.isNaN(lastCheckIn.valueOf())) {
    return true;
  }

  const ageMs = Date.now() - lastCheckIn.valueOf();
  return ageMs > STALE_CHECK_IN_DAYS * 24 * 60 * 60 * 1000;
}

function hasIncompleteData(device: AssetDeviceForScoring): boolean {
  const trackedStatuses = [
    device.encryptionStatus,
    device.antivirusStatus,
    device.patchStatus,
    device.supportStatus,
  ];

  return trackedStatuses.some((status) => status === null || status === "unknown") || !device.lastCheckInAt;
}

function toRiskLevel(riskScore: number): AssetRiskAssessment["riskLevel"] {
  if (riskScore >= 60) {
    return "critical";
  }

  if (riskScore >= 35) {
    return "high";
  }

  if (riskScore >= 10) {
    return "watch";
  }

  return "low";
}

function buildSummary(signals: AssetRiskSignal[], riskLevel: AssetRiskAssessment["riskLevel"]): string {
  if (signals.length === 0) {
    return "No active risk signals.";
  }

  const topSignals = signals
    .slice(0, 2)
    .map((signal) => signal.label.toLowerCase())
    .join(" and ");

  return `${riskLevel} risk driven by ${topSignals}.`;
}
