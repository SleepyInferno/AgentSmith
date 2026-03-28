import type { Prisma, PrismaClient, SyncResult } from "@prisma/client";
import type { AuditService } from "../modules/audit/audit.service.js";
import { getConnectorRegistryEntry } from "../modules/connectors/connector.registry.js";
import { evaluateConnectorFreshness } from "../modules/connectors/freshness.js";

type RunConnectorSyncDependencies = {
  prisma: Pick<PrismaClient, "connectorSource" | "syncRun">;
  auditService: Pick<AuditService, "write">;
  now?: () => Date;
};

export async function runConnectorSync(connectorId: string, dependencies: RunConnectorSyncDependencies) {
  const registryEntry = getConnectorRegistryEntry(connectorId);

  if (!registryEntry) {
    throw new Error(`Unknown connector '${connectorId}'`);
  }

  const now = dependencies.now ?? (() => new Date());
  const startedAt = now();

  await dependencies.auditService.write({
    timestamp: startedAt,
    actorId: null,
    action: "connector.sync_started",
    targetType: "connector",
    targetId: registryEntry.id,
    result: "started",
    metadata: {
      connectorId: registryEntry.id,
      label: registryEntry.label,
    },
  });

  try {
    const output = await registryEntry.runSync();
    const completedAt = now();
    const lastSuccessfulSyncAt = output.result === "failure" ? null : completedAt;
    const freshness = evaluateConnectorFreshness({
      lastSuccessfulSyncAt,
      lastAttemptedSyncAt: completedAt,
      lastResult: output.result as SyncResult,
      now: completedAt,
    });

    const connectorSource = await dependencies.prisma.connectorSource.upsert({
      where: {
        key: registryEntry.id,
      },
      update: {
        label: registryEntry.label,
        sourceSystem: registryEntry.sourceSystem,
        syncStatus: freshness.syncStatus,
        freshnessState: freshness.freshnessState,
        lastSuccessfulSyncAt,
        lastAttemptedSyncAt: completedAt,
        lastError: output.result === "failure" ? output.lastError ?? "Sync failed" : null,
      },
      create: {
        key: registryEntry.id,
        label: registryEntry.label,
        sourceSystem: registryEntry.sourceSystem,
        syncStatus: freshness.syncStatus,
        freshnessState: freshness.freshnessState,
        lastSuccessfulSyncAt,
        lastAttemptedSyncAt: completedAt,
        lastError: output.result === "failure" ? output.lastError ?? "Sync failed" : null,
      },
    });

    await dependencies.prisma.syncRun.create({
      data: {
        connectorSourceId: connectorSource.id,
        startedAt,
        completedAt,
        result: output.result as SyncResult,
        recordsSeen: output.recordsSeen,
        recordsNormalized: output.recordsNormalized,
        ...(output.metadata
          ? {
              metadata: output.metadata as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    await dependencies.auditService.write({
      timestamp: completedAt,
      actorId: null,
      action: output.result === "failure" ? "connector.sync_failed" : "connector.sync_succeeded",
      targetType: "connector",
      targetId: registryEntry.id,
      result: output.result,
      metadata: {
        connectorId: registryEntry.id,
        recordsSeen: output.recordsSeen,
        recordsNormalized: output.recordsNormalized,
        ...(output.lastError ? { lastError: output.lastError } : {}),
      },
    });

    return {
      connectorId: registryEntry.id,
      result: output.result,
    };
  } catch (error) {
    const completedAt = now();

    await dependencies.prisma.connectorSource.upsert({
      where: {
        key: registryEntry.id,
      },
      update: {
        label: registryEntry.label,
        sourceSystem: registryEntry.sourceSystem,
        syncStatus: "error",
        freshnessState: "error",
        lastAttemptedSyncAt: completedAt,
        lastError: error instanceof Error ? error.message : "Unknown sync error",
      },
      create: {
        key: registryEntry.id,
        label: registryEntry.label,
        sourceSystem: registryEntry.sourceSystem,
        syncStatus: "error",
        freshnessState: "error",
        lastAttemptedSyncAt: completedAt,
        lastError: error instanceof Error ? error.message : "Unknown sync error",
      },
    });

    await dependencies.auditService.write({
      timestamp: completedAt,
      actorId: null,
      action: "connector.sync_failed",
      targetType: "connector",
      targetId: registryEntry.id,
      result: "failure",
      metadata: {
        connectorId: registryEntry.id,
        lastError: error instanceof Error ? error.message : "Unknown sync error",
      },
    });

    throw error;
  }
}

export async function runAllConnectorSyncs(dependencies: RunConnectorSyncDependencies) {
  for (const connectorId of ["entra", "intune"]) {
    await runConnectorSync(connectorId, dependencies);
  }
}
