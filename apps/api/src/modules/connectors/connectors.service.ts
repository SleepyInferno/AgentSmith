import type { PrismaClient, SyncResult } from "@prisma/client";
import { connectorRegistry } from "./connector.registry.js";
import { evaluateConnectorFreshness, mapSyncStatusToHealth, type ConnectorHealth } from "./freshness.js";

export type ConnectorCard = {
  id: string;
  label: string;
  health: ConnectorHealth;
  freshnessState: "healthy" | "warning" | "stale" | "error";
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  lastResult: SyncResult | "not_run";
};

type ConnectorSourceRecord = {
  key: string;
  label: string;
  sourceSystem: string;
  syncStatus: "healthy" | "degraded" | "stale" | "error";
  freshnessState: "healthy" | "warning" | "stale" | "error";
  lastSuccessfulSyncAt: Date | null;
  lastAttemptedSyncAt: Date | null;
  syncRuns: Array<{
    result: SyncResult;
  }>;
};

export class ConnectorsService {
  constructor(
    private readonly prisma: Pick<PrismaClient, "connectorSource">,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listConnectors(): Promise<ConnectorCard[]> {
    const sources = (await this.prisma.connectorSource.findMany({
      include: {
        syncRuns: {
          orderBy: {
            startedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        key: "asc",
      },
    })) as ConnectorSourceRecord[];

    if (sources.length === 0) {
      return this.buildSeededCards();
    }

    const byKey = new Map(sources.map((source) => [source.key, source]));

    return connectorRegistry.map((entry) => {
      const source = byKey.get(entry.id);

      if (!source) {
        return this.buildSeededCard(entry.id, entry.label, 18);
      }

      return {
        id: source.key,
        label: source.label,
        health: mapSyncStatusToHealth(source.syncStatus),
        freshnessState: source.freshnessState,
        lastSuccessfulSyncAt: source.lastSuccessfulSyncAt?.toISOString() ?? null,
        lastAttemptedSyncAt: source.lastAttemptedSyncAt?.toISOString() ?? null,
        lastResult: source.syncRuns[0]?.result ?? "not_run",
      };
    });
  }

  private buildSeededCards() {
    return connectorRegistry.map((entry, index) =>
      this.buildSeededCard(entry.id, entry.label, index === 0 ? 4 : 10),
    );
  }

  private buildSeededCard(id: string, label: string, ageHours: number): ConnectorCard {
    const lastSuccessfulSyncAt = new Date(this.now().valueOf() - ageHours * 60 * 60 * 1000);
    const lastAttemptedSyncAt = new Date(lastSuccessfulSyncAt.valueOf() + 20 * 60 * 1000);
    const freshness = evaluateConnectorFreshness({
      lastSuccessfulSyncAt,
      lastAttemptedSyncAt,
      lastResult: "success",
      now: this.now(),
    });

    return {
      id,
      label,
      health: freshness.health,
      freshnessState: freshness.freshnessState,
      lastSuccessfulSyncAt: lastSuccessfulSyncAt.toISOString(),
      lastAttemptedSyncAt: lastAttemptedSyncAt.toISOString(),
      lastResult: "success",
    };
  }
}
