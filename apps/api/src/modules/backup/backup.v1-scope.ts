export const unsupported_provider = "unsupported_provider" as const;

export const backupV1WorkloadKeys = [
  "virtual_machine",
  "server",
  "m365_exchange",
  "m365_sharepoint",
  "endpoint_image",
] as const;

export type BackupV1WorkloadKey = (typeof backupV1WorkloadKeys)[number];

export const azure_backup = {
  providerKey: "azure_backup",
  label: "Azure Backup",
  workloadKeys: ["virtual_machine", "server"] as const,
} as const;

export const m365_backup = {
  providerKey: "m365_backup",
  label: "Microsoft 365 Backup",
  workloadKeys: ["m365_exchange", "m365_sharepoint"] as const,
} as const;

export const veeam = {
  providerKey: "veeam",
  label: "Veeam",
  workloadKeys: ["server", "endpoint_image"] as const,
} as const;

export const backupV1Providers = [azure_backup, m365_backup, veeam] as const;

export type BackupV1ProviderDescriptor = (typeof backupV1Providers)[number];
export type BackupV1ProviderKey = BackupV1ProviderDescriptor["providerKey"];

export const backupV1ScopeNote =
  "Any provider outside the Phase 5 v1 source scope is treated as unsupported_provider until a later phase expands support.";
