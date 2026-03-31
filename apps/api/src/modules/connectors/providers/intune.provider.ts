import type { PrismaClient } from "@prisma/client";
import type { ConnectorSyncOutput } from "./entra.provider.js";
import { buildGraphClient, graphPageAll, withRetry } from "../graph-helpers.js";
import type { Client } from "@microsoft/microsoft-graph-client";

// ---------------------------------------------------------------------------
// Graph API shape types
// ---------------------------------------------------------------------------

interface ManagedDevice {
  id: string;
  deviceName: string | null;
  serialNumber: string | null;
  operatingSystem: string | null;
  osVersion: string | null;
  complianceState: string | null;
  isEncrypted: boolean | null;
  lastSyncDateTime: string | null;
  enrolledDateTime: string | null;
  userId: string | null;
}

interface CompliancePolicyState {
  id: string;
  displayName: string;
  platformType: string;
  state: string;
}

// ---------------------------------------------------------------------------
// Dependency injection types — allows tests to inject fakes
// ---------------------------------------------------------------------------

type GraphClientLike = {
  api: (path: string) => { get: () => Promise<unknown> };
};

export type IntuneProviderDependencies = {
  prisma: Pick<
    PrismaClient,
    "device" | "user" | "deviceCompliancePolicy" | "deviceComplianceAssignment" | "integrationCredential"
  >;
  systemKey: Buffer;
  /** Override for testing — defaults to real buildGraphClient */
  buildGraphClientFn?: (
    prisma: Pick<PrismaClient, "integrationCredential">,
    systemKey: Buffer
  ) => Promise<Client>;
  /** Override for testing — defaults to real graphPageAll */
  graphPageAllFn?: <T>(client: GraphClientLike, path: string) => Promise<T[]>;
  /** Override for testing — defaults to real withRetry */
  withRetryFn?: <T>(fn: () => Promise<T>) => Promise<T>;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createIntuneProvider(deps: IntuneProviderDependencies): () => Promise<ConnectorSyncOutput> {
  return async (): Promise<ConnectorSyncOutput> => {
    try {
      const _buildGraphClient = deps.buildGraphClientFn ?? buildGraphClient;
      const _graphPageAll = deps.graphPageAllFn ?? graphPageAll;
      const _withRetry = deps.withRetryFn ?? withRetry;

      // 1. Build authenticated Graph client
      const client = await _buildGraphClient(deps.prisma, deps.systemKey);

      // 2. Fetch all managed devices (paginated)
      const allDevices = await _withRetry(() =>
        _graphPageAll<ManagedDevice>(client as never, "/deviceManagement/managedDevices")
      );

      // 3. Batch user lookup for owner linking
      const uniqueUserIds = [...new Set(allDevices.map((d) => d.userId).filter((id): id is string => !!id))];
      const matchedUsers = uniqueUserIds.length > 0
        ? await deps.prisma.user.findMany({
            where: { sourceSystem: "entra", sourceId: { in: uniqueUserIds } },
            select: { id: true, sourceId: true },
          })
        : [];
      const userMap = new Map(matchedUsers.map((u) => [u.sourceId, u.id]));

      // 4. Upsert each device
      let upsertedCount = 0;
      const upsertedDeviceMap = new Map<string, string>(); // sourceId -> db id

      for (const device of allDevices) {
        const encryptionStatus =
          device.isEncrypted === true ? "healthy" :
          device.isEncrypted === false ? "missing" :
          null;

        const operatingSystem = [device.operatingSystem, device.osVersion]
          .filter((v): v is string => !!v)
          .join(" ") || null;

        const lastCheckInAt = device.lastSyncDateTime ? new Date(device.lastSyncDateTime) : null;
        const deviceAgeDays = device.enrolledDateTime
          ? Math.floor((Date.now() - new Date(device.enrolledDateTime).getTime()) / 86_400_000)
          : null;

        const ownerId = device.userId ? (userMap.get(device.userId) ?? null) : null;

        const upserted = await deps.prisma.device.upsert({
          where: { sourceSystem_sourceId: { sourceSystem: "intune", sourceId: device.id } },
          update: {
            name: device.deviceName ?? "Unknown",
            serialNumber: device.serialNumber ?? null,
            operatingSystem,
            complianceState: device.complianceState ?? null,
            encryptionStatus: encryptionStatus as never,
            lastCheckInAt,
            lastSeenAt: lastCheckInAt,
            deviceAgeDays,
            ownerId,
            antivirusStatus: null,
            patchStatus: null,
            diskFreePercent: null,
            supportStatus: null,
          },
          create: {
            sourceSystem: "intune",
            sourceId: device.id,
            name: device.deviceName ?? "Unknown",
            serialNumber: device.serialNumber ?? null,
            operatingSystem,
            complianceState: device.complianceState ?? null,
            encryptionStatus: encryptionStatus as never,
            lastCheckInAt,
            lastSeenAt: lastCheckInAt,
            deviceAgeDays,
            ownerId,
            antivirusStatus: null,
            patchStatus: null,
            diskFreePercent: null,
            supportStatus: null,
          },
        });

        upsertedDeviceMap.set(device.id, upserted.id);
        upsertedCount++;
      }

      // 5. Fetch compliance policy states per device in batches of 10
      const BATCH_SIZE = 10;
      for (let i = 0; i < allDevices.length; i += BATCH_SIZE) {
        const batch = allDevices.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (device) => {
            const dbDeviceId = upsertedDeviceMap.get(device.id);
            if (!dbDeviceId) return;

            const policyStates = await _withRetry(() =>
              _graphPageAll<CompliancePolicyState>(
                client as never,
                `/deviceManagement/managedDevices/${device.id}/deviceCompliancePolicyStates`
              )
            );

            // Deduplicate by policy id
            const deduped = new Map<string, CompliancePolicyState>();
            for (const ps of policyStates) {
              deduped.set(ps.id, ps);
            }

            for (const ps of deduped.values()) {
              const upsertedPolicy = await deps.prisma.deviceCompliancePolicy.upsert({
                where: { sourceSystem_sourceId: { sourceSystem: "intune", sourceId: ps.id } },
                update: { name: ps.displayName, platform: ps.platformType },
                create: {
                  sourceSystem: "intune",
                  sourceId: ps.id,
                  name: ps.displayName,
                  platform: ps.platformType,
                },
              });

              await deps.prisma.deviceComplianceAssignment.upsert({
                where: { deviceId_policyId: { deviceId: dbDeviceId, policyId: upsertedPolicy.id } },
                update: { status: ps.state, lastReportedAt: new Date() },
                create: {
                  deviceId: dbDeviceId,
                  policyId: upsertedPolicy.id,
                  status: ps.state,
                  lastReportedAt: new Date(),
                },
              });
            }
          })
        );
      }

      // 6. Delete stale Intune device rows not in this sync
      const syncedSourceIds = allDevices.map((d) => d.id);
      await deps.prisma.device.deleteMany({
        where: {
          sourceSystem: "intune",
          sourceId: { notIn: syncedSourceIds },
        },
      });

      return {
        recordsSeen: allDevices.length,
        recordsNormalized: upsertedCount,
        result: "success",
        metadata: {
          sourceSystem: "intune",
          objects: "managed_devices,compliance_policies",
        },
      };
    } catch (error) {
      return {
        recordsSeen: 0,
        recordsNormalized: 0,
        result: "failure",
        lastError: error instanceof Error ? error.message : String(error),
      };
    }
  };
}
