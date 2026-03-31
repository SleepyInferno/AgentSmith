import type { PrismaClient } from "@prisma/client";
import { runEntraConnectorSync, type ConnectorSyncOutput } from "./providers/entra.provider.js";
import { createIntuneProvider } from "./providers/intune.provider.js";

export type ConnectorRegistryEntry = {
  id: "entra" | "intune";
  label: string;
  sourceSystem: string;
  runSync: () => Promise<ConnectorSyncOutput>;
};

export type ConnectorRegistryDependencies = {
  systemKey: Buffer;
  prisma: PrismaClient;
};

// Module-level registry — initialized at startup via initConnectorRegistry().
let _registry: ConnectorRegistryEntry[] = [
  {
    id: "entra",
    label: "Microsoft Entra ID",
    sourceSystem: "entra",
    runSync: runEntraConnectorSync,
  },
  {
    id: "intune",
    label: "Microsoft Intune",
    sourceSystem: "intune",
    // Default stub — replaced by initConnectorRegistry() at server startup.
    runSync: async () => ({
      recordsSeen: 0,
      recordsNormalized: 0,
      result: "failure" as const,
      lastError: "Intune provider not initialized — call initConnectorRegistry() at startup",
    }),
  },
];

/**
 * Initialize the connector registry with real runtime dependencies.
 * Must be called at server startup before any sync is triggered.
 */
export function initConnectorRegistry(deps: ConnectorRegistryDependencies): void {
  _registry = [
    {
      id: "entra",
      label: "Microsoft Entra ID",
      sourceSystem: "entra",
      runSync: runEntraConnectorSync,
    },
    {
      id: "intune",
      label: "Microsoft Intune",
      sourceSystem: "intune",
      runSync: createIntuneProvider({ prisma: deps.prisma, systemKey: deps.systemKey }),
    },
  ];
}

/** Build and return a registry array without mutating module-level state. */
export function buildConnectorRegistry(deps: ConnectorRegistryDependencies): ConnectorRegistryEntry[] {
  return [
    {
      id: "entra",
      label: "Microsoft Entra ID",
      sourceSystem: "entra",
      runSync: runEntraConnectorSync,
    },
    {
      id: "intune",
      label: "Microsoft Intune",
      sourceSystem: "intune",
      runSync: createIntuneProvider({ prisma: deps.prisma, systemKey: deps.systemKey }),
    },
  ];
}

export function getConnectorRegistryEntry(connectorId: string) {
  return _registry.find((entry) => entry.id === connectorId) ?? null;
}

/** @deprecated Use initConnectorRegistry() at startup. */
export const connectorRegistry = _registry;
