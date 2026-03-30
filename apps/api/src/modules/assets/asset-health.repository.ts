import { PrismaClient, type Prisma } from "@prisma/client";
import { assetFixtureDetails, assetFixtureInventory, assetFixtureQueue } from "./asset-health.fixtures.js";
import type {
  AssetDetail,
  AssetInventoryFilters,
  AssetInventoryRow,
  AssetQueueItem,
  AssetInventorySortDirection,
  AssetInventorySortField,
  AssetRiskSignal,
  AssetRiskSignalCode,
} from "./asset-health.types.js";

type AssetDeviceRecord = Prisma.DeviceGetPayload<{
  include: {
    riskAssessment: true;
  };
}>;

type AssetOwnerRecord = {
  id: string;
  displayName: string;
  email: string | null;
  department: string | null;
};

export class AssetHealthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listInventory(filters: AssetInventoryFilters = {}): Promise<AssetInventoryRow[]> {
    const isSeeded = await this.isSeededMode();
    if (isSeeded) {
      return sortInventoryRows(
        applyInventoryFilters(assetFixtureInventory, filters),
        filters.sortField,
        filters.sortDirection,
      );
    }

    const devices = await this.prisma.device.findMany({
      where: buildDeviceWhere(filters),
      include: {
        riskAssessment: true,
      },
      orderBy: [
        { riskAssessment: { queueRank: "asc" } },
        { name: "asc" },
      ],
    });

    const owners = await this.loadOwners(devices);
    const rows = devices.map((device) => mapInventoryRow(device, owners.get(device.ownerId ?? "")));

    return sortInventoryRows(
      rows.filter((device) => filterBySignal(device, filters.riskSignal)).filter((device) => filterByStaleOnly(device, filters.staleOnly)),
      filters.sortField,
      filters.sortDirection,
    );
  }

  async listQueue(limit: number): Promise<AssetQueueItem[]> {
    const isSeeded = await this.isSeededMode();
    if (isSeeded) {
      return assetFixtureQueue.slice(0, limit);
    }

    const devices = await this.prisma.device.findMany({
      where: {
        riskAssessment: {
          isNot: null,
        },
      },
      include: {
        riskAssessment: true,
      },
      orderBy: [
        { riskAssessment: { queueRank: "asc" } },
        { riskAssessment: { riskScore: "desc" } },
        { name: "asc" },
      ],
      take: limit,
    });

    const owners = await this.loadOwners(devices);

    return devices
      .map((device) => {
        const row = mapInventoryRow(device, owners.get(device.ownerId ?? ""));
        if (!row.riskScore || !row.riskLevel || !row.queueRank || !row.summary || !row.freshnessState) {
          return null;
        }

        return {
          id: row.id,
          name: row.name,
          ownerName: row.ownerName,
          riskScore: row.riskScore,
          riskLevel: row.riskLevel,
          queueRank: row.queueRank,
          summary: row.summary,
          freshnessState: row.freshnessState,
          signals: row.signals,
        } satisfies AssetQueueItem;
      })
      .filter((item): item is AssetQueueItem => item !== null);
  }

  async getDeviceDetail(deviceId: string): Promise<AssetDetail | null> {
    const isSeeded = await this.isSeededMode();
    if (isSeeded) {
      return assetFixtureDetails[deviceId] ?? null;
    }

    const device = await this.prisma.device.findUnique({
      where: {
        id: deviceId,
      },
      include: {
        riskAssessment: true,
      },
    });

    if (!device) {
      return null;
    }

    const owners = await this.loadOwners([device]);
    const owner = owners.get(device.ownerId ?? "");
    const row = mapInventoryRow(device, owner);

    return {
      ...row,
      serialNumber: device.serialNumber ?? null,
      complianceState: device.complianceState ?? null,
      sourceSystem: device.sourceSystem,
      sourceId: device.sourceId,
      calculatedAt: device.riskAssessment?.calculatedAt.toISOString() ?? null,
    };
  }

  private seededModeCache: boolean | null = null;

  private async isSeededMode(): Promise<boolean> {
    if (this.seededModeCache !== null) {
      return this.seededModeCache;
    }

    try {
      const count = await this.prisma.device.count();
      this.seededModeCache = count === 0;
    } catch {
      this.seededModeCache = true;
    }

    return this.seededModeCache;
  }

  private async loadOwners(devices: AssetDeviceRecord[]): Promise<Map<string, AssetOwnerRecord>> {
    const ownerIds = [...new Set(devices.map((device) => device.ownerId).filter((ownerId): ownerId is string => Boolean(ownerId)))];

    if (ownerIds.length === 0) {
      return new Map();
    }

    const owners = await this.prisma.user.findMany({
      where: {
        id: {
          in: ownerIds,
        },
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        department: true,
      },
    });

    return new Map(owners.map((owner) => [owner.id, owner]));
  }
}

function applyInventoryFilters(rows: AssetInventoryRow[], filters: AssetInventoryFilters): AssetInventoryRow[] {
  return rows
    .filter((d) => !filters.department || d.department === filters.department)
    .filter((d) => !filters.site || d.site === filters.site)
    .filter((d) => !filters.riskLevel || d.riskLevel === filters.riskLevel)
    .filter((d) => !filters.encryptionStatus || d.encryptionStatus === filters.encryptionStatus)
    .filter((d) => !filters.antivirusStatus || d.antivirusStatus === filters.antivirusStatus)
    .filter((d) => !filters.patchStatus || d.patchStatus === filters.patchStatus)
    .filter((d) => !filters.riskSignal || d.signals.some((s) => s.code === filters.riskSignal))
    .filter((d) => !filters.staleOnly || d.freshnessState === "stale")
    .filter((d) => {
      if (!filters.search) return true;
      const q = filters.search.toLowerCase();
      return [d.name, d.ownerName, d.operatingSystem, d.site, d.department].some((v) => v?.toLowerCase().includes(q));
    });
}

function buildDeviceWhere(filters: AssetInventoryFilters): Prisma.DeviceWhereInput {
  const where: Prisma.DeviceWhereInput = {};

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (filters.department) {
    where.departmentSnapshot = filters.department;
  }

  if (filters.site) {
    where.siteSnapshot = filters.site;
  }

  if (filters.encryptionStatus) {
    where.encryptionStatus = filters.encryptionStatus as AssetDeviceRecord["encryptionStatus"];
  }

  if (filters.antivirusStatus) {
    where.antivirusStatus = filters.antivirusStatus as AssetDeviceRecord["antivirusStatus"];
  }

  if (filters.patchStatus) {
    where.patchStatus = filters.patchStatus as AssetDeviceRecord["patchStatus"];
  }

  if (filters.riskLevel) {
    where.riskAssessment = {
      is: {
        riskLevel: filters.riskLevel as NonNullable<AssetDeviceRecord["riskAssessment"]>["riskLevel"],
      },
    };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { serialNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function mapInventoryRow(device: AssetDeviceRecord, owner?: AssetOwnerRecord): AssetInventoryRow {
  return {
    id: device.id,
    name: device.name,
    ownerName: owner?.displayName ?? null,
    ownerEmail: owner?.email ?? null,
    department: device.departmentSnapshot ?? owner?.department ?? null,
    site: device.siteSnapshot ?? null,
    operatingSystem: device.operatingSystem ?? null,
    lastCheckInAt: device.lastCheckInAt?.toISOString() ?? null,
    encryptionStatus: device.encryptionStatus ?? null,
    antivirusStatus: device.antivirusStatus ?? null,
    patchStatus: device.patchStatus ?? null,
    diskFreePercent: device.diskFreePercent ?? null,
    deviceAgeDays: device.deviceAgeDays ?? null,
    supportStatus: device.supportStatus ?? null,
    riskScore: device.riskAssessment?.riskScore ?? null,
    riskLevel: device.riskAssessment?.riskLevel ?? null,
    queueRank: device.riskAssessment?.queueRank ?? null,
    freshnessState: device.riskAssessment?.sourceFreshnessState ?? null,
    summary: device.riskAssessment?.summary ?? null,
    signals: parseSignals(device.riskAssessment?.signals),
  };
}

function filterBySignal(device: AssetInventoryRow, signalCode?: AssetRiskSignalCode): boolean {
  if (!signalCode) {
    return true;
  }

  return device.signals.some((signal) => signal.code === signalCode);
}

function filterByStaleOnly(device: AssetInventoryRow, staleOnly?: boolean): boolean {
  if (!staleOnly) {
    return true;
  }

  return device.freshnessState === "stale" || device.signals.some((signal) => signal.code === "stale_check_in");
}

function sortInventoryRows(
  devices: AssetInventoryRow[],
  sortField?: AssetInventorySortField,
  sortDirection: AssetInventorySortDirection = "desc",
): AssetInventoryRow[] {
  if (!sortField) {
    return [...devices].sort((left, right) => {
      const leftRank = left.queueRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.queueRank ?? Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.name.localeCompare(right.name);
    });
  }

  const direction = sortDirection === "asc" ? 1 : -1;

  return [...devices].sort((left, right) => {
    switch (sortField) {
      case "riskScore":
        return compareNullableNumber(left.riskScore, right.riskScore, direction) || left.name.localeCompare(right.name);
      case "lastCheckInAt":
        return compareNullableDate(left.lastCheckInAt, right.lastCheckInAt, direction) || left.name.localeCompare(right.name);
      case "deviceName":
        return left.name.localeCompare(right.name) * direction;
      case "operatingSystem":
        return compareNullableString(left.operatingSystem, right.operatingSystem, direction) || left.name.localeCompare(right.name);
    }
  });
}

function compareNullableNumber(left: number | null, right: number | null, direction: number): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return (left - right) * direction;
}

function compareNullableDate(left: string | null, right: string | null, direction: number): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return (new Date(left).valueOf() - new Date(right).valueOf()) * direction;
}

function compareNullableString(left: string | null, right: string | null, direction: number): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left.localeCompare(right) * direction;
}

function parseSignals(signals: Prisma.JsonValue | null | undefined): AssetRiskSignal[] {
  if (!Array.isArray(signals)) {
    return [];
  }

  return signals.flatMap((signal: Prisma.JsonValue) => {
    if (
      typeof signal !== "object" ||
      signal === null ||
      !("code" in signal) ||
      !("severity" in signal) ||
      !("label" in signal) ||
      !("explanation" in signal)
    ) {
      return [];
    }

    const { code, severity, label, explanation } = signal;
    if (
      typeof code !== "string" ||
      typeof severity !== "string" ||
      typeof label !== "string" ||
      typeof explanation !== "string"
    ) {
      return [];
    }

    return [
      {
        code: code as AssetRiskSignalCode,
        severity: severity as AssetRiskSignal["severity"],
        label,
        explanation,
      },
    ];
  });
}
