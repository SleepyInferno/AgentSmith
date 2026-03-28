import type { ConnectorSyncOutput } from "./entra.provider.js";

export async function runIntuneConnectorSync(): Promise<ConnectorSyncOutput> {
  return {
    recordsSeen: 128,
    recordsNormalized: 124,
    result: "success",
    metadata: {
      dataMode: "seeded_example",
      sourceSystem: "intune",
      objects: "managed_devices",
    },
  };
}
