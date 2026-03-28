import { runEntraConnectorSync, type ConnectorSyncOutput } from "./providers/entra.provider.js";
import { runIntuneConnectorSync } from "./providers/intune.provider.js";

export type ConnectorRegistryEntry = {
  id: "entra" | "intune";
  label: string;
  sourceSystem: string;
  runSync: () => Promise<ConnectorSyncOutput>;
};

export const connectorRegistry: ConnectorRegistryEntry[] = [
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
    runSync: runIntuneConnectorSync,
  },
];

export function getConnectorRegistryEntry(connectorId: string) {
  return connectorRegistry.find((entry) => entry.id === connectorId) ?? null;
}
