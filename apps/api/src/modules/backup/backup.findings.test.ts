import assert from "node:assert/strict";
import test from "node:test";
import type { BackupAssessmentRow } from "./backup.findings.js";
import { buildBackupFindingQueue, buildBackupOverviewCards, buildBackupSuggestedNextStep } from "./backup.findings.js";

function makeAssessmentRow(overrides: Partial<BackupAssessmentRow> = {}): BackupAssessmentRow {
  return {
    systemId: "sys-finance-sql",
    systemName: "Finance SQL",
    sourceSystem: "seeded_example",
    sourceId: "sys-finance-sql",
    category: "database",
    siteName: null,
    ownerTeam: "Finance IT",
    criticality: "tier_0",
    coverageMode: "required",
    coverageState: "protected",
    confidenceState: "healthy",
    providerKey: "azure_backup",
    workloadKind: "virtual_machine",
    backupFreshnessState: "current",
    restoreFreshnessState: "current",
    lastSuccessfulBackupAt: "2026-03-27T05:15:00.000Z",
    lastRestoreTestedAt: "2026-03-21T14:00:00.000Z",
    restoreEvidenceSource: "provider_sync",
    summary: "Finance SQL meets the configured backup policy.",
    suggestedNextStep: null,
    dataMode: "seeded_example",
    latestRestoreOutcome: "success",
    withinBackupGraceWindow: false,
    telemetryUnavailable: false,
    ...overrides,
  };
}

test("missing required coverage yields a high-risk queue item with enrollment guidance", () => {
  const row = makeAssessmentRow({
    systemId: "sys-domain-controller",
    systemName: "Primary Domain Controller",
    category: "identity",
    coverageState: "missing",
    confidenceState: "high_risk",
    providerKey: "azure_backup",
    workloadKind: "server",
    backupFreshnessState: "missing",
    restoreFreshnessState: "missing",
    lastSuccessfulBackupAt: null,
    lastRestoreTestedAt: null,
    summary: "Coverage missing for an expected protected system",
  });

  const queue = buildBackupFindingQueue([row]);

  assert.equal(queue[0]?.coverageState, "missing");
  assert.equal(queue[0]?.confidenceState, "high_risk");
  assert.equal(queue[0]?.summary, "Coverage missing for an expected protected system");
  assert.equal(queue[0]?.suggestedNextStep, "Confirm the system is enrolled in backup policy");
});

test("stale restore proof yields Schedule a restore test guidance", () => {
  const row = makeAssessmentRow({
    systemId: "sys-sharepoint-tenant",
    systemName: "Microsoft 365 Collaboration",
    category: "m365",
    coverageState: "partial",
    confidenceState: "high_risk",
    providerKey: "m365_backup",
    workloadKind: "m365_sharepoint",
    restoreFreshnessState: "stale",
    summary: "Backup is recent but restore proof is stale",
  });

  assert.equal(buildBackupSuggestedNextStep(row), "Schedule a restore test");
});

test("telemetry outages surface unknown confidence and provider freshness guidance", () => {
  const row = makeAssessmentRow({
    systemId: "sys-branch-nas",
    systemName: "Branch NAS",
    category: "storage",
    coverageState: "unknown",
    confidenceState: "unknown",
    providerKey: "veeam",
    workloadKind: "server",
    backupFreshnessState: "unknown",
    restoreFreshnessState: "current",
    lastSuccessfulBackupAt: null,
    telemetryUnavailable: true,
    summary: "Backup telemetry is unavailable from the configured provider",
  });

  const queue = buildBackupFindingQueue([row]);

  assert.equal(queue[0]?.confidenceState, "unknown");
  assert.equal(queue[0]?.summary, "Backup telemetry is unavailable from the configured provider");
  assert.equal(queue[0]?.suggestedNextStep, "Investigate provider telemetry freshness");
});

test("excluded systems stay out of the risk queue and preserve the exact exclusion guidance", () => {
  const row = makeAssessmentRow({
    systemId: "sys-lab-jumpbox",
    systemName: "Lab Jumpbox",
    category: "lab",
    coverageMode: "excluded",
    coverageState: "excluded",
    confidenceState: "watch",
    providerKey: "veeam",
    workloadKind: "endpoint_image",
    backupFreshnessState: "unknown",
    restoreFreshnessState: "unknown",
    summary: "System is intentionally excluded from backup policy",
  });

  const queue = buildBackupFindingQueue([row]);

  assert.equal(buildBackupSuggestedNextStep(row), "System is intentionally excluded from backup policy");
  assert.equal(queue.length, 0);
});

test("overview cards count protected, high-risk, unknown, and excluded systems", () => {
  const cards = buildBackupOverviewCards([
    makeAssessmentRow(),
    makeAssessmentRow({
      systemId: "sys-domain-controller",
      systemName: "Primary Domain Controller",
      coverageState: "missing",
      confidenceState: "high_risk",
      summary: "Coverage missing for an expected protected system",
    }),
    makeAssessmentRow({
      systemId: "sys-branch-nas",
      systemName: "Branch NAS",
      coverageState: "unknown",
      confidenceState: "unknown",
      providerKey: "veeam",
      summary: "Backup telemetry is unavailable from the configured provider",
      telemetryUnavailable: true,
    }),
    makeAssessmentRow({
      systemId: "sys-lab-jumpbox",
      systemName: "Lab Jumpbox",
      coverageMode: "excluded",
      coverageState: "excluded",
      confidenceState: "watch",
      providerKey: "veeam",
      summary: "System is intentionally excluded from backup policy",
    }),
  ]);

  assert.equal(cards.find((card) => card.key === "protected_systems")?.value, 3);
  assert.equal(cards.find((card) => card.key === "high_risk")?.value, 1);
  assert.equal(cards.find((card) => card.key === "unknown")?.value, 1);
  assert.equal(cards.find((card) => card.key === "excluded")?.value, 1);
});
