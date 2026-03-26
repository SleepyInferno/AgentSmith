import { PrismaClient, type Prisma } from "@prisma/client";
import type {
  AssetDetail,
  AssetInventoryFilters,
  AssetInventoryRow,
  AssetQueueItem,
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

    return devices
      .map((device) => mapInventoryRow(device, owners.get(device.ownerId ?? "")))
      .filter((device) => filterBySignal(device, filters.signalCode));
  }

  async listQueue(limit: number): Promise<AssetQueueItem[]> {
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

  if (filters.supportStatus) {
    where.supportStatus = filters.supportStatus as AssetDeviceRecord["supportStatus"];
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
