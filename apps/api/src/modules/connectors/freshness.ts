import type { FreshnessState, SyncResult, SyncStatus } from "@prisma/client";

export type ConnectorHealth = "healthy" | "warning" | "stale" | "error";

export function evaluateConnectorFreshness(input: {
  lastSuccessfulSyncAt: Date | null;
  lastAttemptedSyncAt: Date | null;
  lastResult: SyncResult | null;
  now?: Date;
}): {
  freshnessState: FreshnessState;
  syncStatus: SyncStatus;
  health: ConnectorHealth;
} {
  const now = input.now ?? new Date();

  if (input.lastResult === "failure") {
    return {
      freshnessState: "error",
      syncStatus: "error",
      health: "error",
    };
  }

  if (!input.lastSuccessfulSyncAt) {
    return {
      freshnessState: input.lastAttemptedSyncAt ? "warning" : "stale",
      syncStatus: input.lastAttemptedSyncAt ? "degraded" : "stale",
      health: input.lastAttemptedSyncAt ? "warning" : "stale",
    };
  }

  const ageHours = (now.valueOf() - input.lastSuccessfulSyncAt.valueOf()) / (1000 * 60 * 60);

  if (ageHours <= 6) {
    return {
      freshnessState: "healthy",
      syncStatus: "healthy",
      health: "healthy",
    };
  }

  if (ageHours <= 24) {
    return {
      freshnessState: "warning",
      syncStatus: "degraded",
      health: "warning",
    };
  }

  return {
    freshnessState: "stale",
    syncStatus: "stale",
    health: "stale",
  };
}

export function mapSyncStatusToHealth(syncStatus: SyncStatus): ConnectorHealth {
  switch (syncStatus) {
    case "healthy":
      return "healthy";
    case "degraded":
      return "warning";
    case "stale":
      return "stale";
    case "error":
      return "error";
  }
}
