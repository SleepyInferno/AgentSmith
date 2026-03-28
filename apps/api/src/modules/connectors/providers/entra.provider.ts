export type ConnectorSyncOutput = {
  recordsSeen: number;
  recordsNormalized: number;
  result: "success" | "partial" | "failure";
  metadata?: Record<string, string | number | boolean | null>;
  lastError?: string | null;
};

export async function runEntraConnectorSync(): Promise<ConnectorSyncOutput> {
  return {
    recordsSeen: 42,
    recordsNormalized: 42,
    result: "success",
    metadata: {
      dataMode: "seeded_example",
      sourceSystem: "entra",
      objects: "users, groups",
    },
  };
}
