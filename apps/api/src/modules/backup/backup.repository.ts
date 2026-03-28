import type { PrismaClient } from "@prisma/client";
import {
  backupFixtureEvidence,
  backupFixturePolicies,
  backupFixtureRestoreTests,
  backupFixtureSystems,
  type BackupFixtureEvidence,
  type BackupFixturePolicy,
  type BackupFixtureProviderScope,
  type BackupFixtureRestoreTest,
  type BackupFixtureSystem,
} from "./backup.fixtures.js";
import { buildBackupFindingQueue, buildBackupOverviewCards, buildBackupSuggestedNextStep, type BackupAssessmentRow } from "./backup.findings.js";
import type {
  BackupCoverageState,
  BackupInventoryFilters,
  BackupInventoryRow,
  BackupMatchingConfidence,
  BackupOverview,
  BackupProviderEvidence,
  BackupRestoreProof,
  BackupRestoreState,
  BackupSourceHealthState,
  BackupSourceHealth,
  BackupSystemDetail,
} from "./backup.types.js";
import { backupV1Providers } from "./backup.v1-scope.js";

type BackupDateValue = Date | string | null;

type BackupPrismaClient = {
  backupCoveragePolicy: {
    findMany: (args?: unknown) => Promise<
      Array<{
        id: string;
        systemId: string;
        coverageMode: BackupFixturePolicy["coverageMode"];
        backupFreshnessHours: number | null;
        restoreTestMaxAgeDays: number | null;
        gracePeriodHours: number | null;
        providerScope: unknown;
        exclusionReason: string | null;
        notes: string | null;
        system: {
          id: string;
          sourceSystem: string;
          sourceId: string;
          name: string;
          category: string | null;
          ownerTeam: string | null;
          criticality: string | null;
        };
      }>
    >;
  };
  backupEvidence: {
    findMany: () => Promise<
      Array<{
        id: string;
        systemId: string;
        providerKey: string;
        workloadKind: string;
        sourceSystem: string;
        sourceId: string;
        coverageState: BackupCoverageState;
        lastSuccessfulBackupAt: BackupDateValue;
        lastFailedBackupAt: BackupDateValue;
        backupFreshnessState: BackupRestoreState;
        connectorFreshnessState: BackupRestoreState;
        lastObservedAt: BackupDateValue;
        metadata: Record<string, unknown> | null;
      }>
    >;
  };
  backupRestoreTest: {
    findMany: () => Promise<
      Array<{
        id: string;
        systemId: string;
        backupEvidenceId: string | null;
        evidenceSource: BackupRestoreProof["evidenceSource"];
        outcome: BackupRestoreProof["outcome"];
        testedAt: BackupDateValue;
        recoveryPointAt: BackupDateValue;
        ticketRef: string | null;
        notes: string | null;
        metadata: Record<string, unknown> | null;
      }>
    >;
  };
};

type BackupDataset = {
  dataMode: "live" | "seeded_example";
  systems: BackupFixtureSystem[];
  policies: BackupFixturePolicy[];
  evidence: BackupFixtureEvidence[];
  restoreTests: BackupFixtureRestoreTest[];
  generatedAt: string | null;
};

type BackupAssessmentContext = {
  row: BackupAssessmentRow;
  policy: BackupFixturePolicy;
  evidence: BackupFixtureEvidence[];
  restoreTests: BackupFixtureRestoreTest[];
};

const connectorFreshnessOrder: Record<BackupRestoreState, number> = {
  current: 0,
  stale: 1,
  missing: 2,
  unknown: 3,
};

const providerLabelByKey = new Map<string, string>(backupV1Providers.map((provider) => [provider.providerKey, provider.label]));

export class BackupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverview(): Promise<BackupOverview> {
    const dataset = await this.loadDataset();
    const assessments = buildAssessments(dataset);

    return {
      dataMode: dataset.dataMode,
      generatedAt: dataset.generatedAt,
      summary: buildOverviewSummary(assessments.map((item) => item.row)),
      cards: buildBackupOverviewCards(assessments.map((item) => item.row)),
      findings: buildBackupFindingQueue(assessments.map((item) => item.row)),
      sourceHealth: buildSourceHealth(dataset),
    };
  }

  async listFindings(limit = 10) {
    const dataset = await this.loadDataset();
    const items = buildBackupFindingQueue(buildAssessments(dataset).map((item) => item.row));

    return items.slice(0, Math.max(limit, 0));
  }

  async listInventory(filters: BackupInventoryFilters = {}): Promise<BackupInventoryRow[]> {
    const dataset = await this.loadDataset();
    const assessments = buildAssessments(dataset);
    const queueBySystemId = new Map(buildBackupFindingQueue(assessments.map((item) => item.row)).map((item) => [item.systemId, item.queueRank]));

    return assessments
      .map((item) => item.row)
      .filter((row) => matchesInventoryFilters(row, filters))
      .sort((left, right) => {
        const leftRank = queueBySystemId.get(left.systemId) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = queueBySystemId.get(right.systemId) ?? Number.MAX_SAFE_INTEGER;
        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.systemName.localeCompare(right.systemName);
      })
      .map(toInventoryRow);
  }

  async getSystemDetail(systemId: string): Promise<BackupSystemDetail | null> {
    const dataset = await this.loadDataset();
    const assessments = buildAssessments(dataset);
    const detail = assessments.find((item) => item.row.systemId === systemId);
    if (!detail) {
      return null;
    }

    const providerKeys = new Set<string>(
      detail.evidence.map((item) => item.providerKey).concat((detail.policy.providerScope ?? []).map((scope) => scope.providerKey)),
    );

    return {
      dataMode: dataset.dataMode,
      system: toInventoryRow(detail.row),
      scopeSummary: buildScopeSummary(detail.policy),
      suggestedNextStep: buildBackupSuggestedNextStep(detail.row),
      sourceHealth: buildSourceHealth(dataset).filter((source) => providerKeys.has(source.providerKey)),
      providerEvidence: detail.evidence
        .slice()
        .sort((left, right) => left.providerKey.localeCompare(right.providerKey) || left.workloadKind.localeCompare(right.workloadKind))
        .map((item) => ({
          evidenceId: item.id,
          providerKey: item.providerKey,
          workloadKind: item.workloadKind,
          sourceSystem: item.sourceSystem,
          sourceId: item.sourceId,
          coverageState: item.coverageState,
          backupFreshnessState: item.backupFreshnessState,
          connectorFreshnessState: item.connectorFreshnessState,
          confidenceState: detail.row.confidenceState,
          lastSuccessfulBackupAt: item.lastSuccessfulBackupAt,
          lastFailedBackupAt: item.lastFailedBackupAt,
          lastObservedAt: item.lastObservedAt,
          summary: detail.row.summary,
          metadata: item.metadata,
        } satisfies BackupProviderEvidence)),
      restoreProofs: detail.restoreTests
        .slice()
        .sort((left, right) => compareDates(right.testedAt, left.testedAt))
        .map((item) => ({
          restoreTestId: item.id,
          backupEvidenceId: item.backupEvidenceId,
          evidenceSource: item.evidenceSource,
          outcome: item.outcome,
          testedAt: item.testedAt,
          recoveryPointAt: item.recoveryPointAt,
          ticketRef: item.ticketRef,
          notes: item.notes,
          metadata: item.metadata,
        } satisfies BackupRestoreProof)),
    };
  }

  private async loadDataset(): Promise<BackupDataset> {
    const prisma = this.prisma as unknown as BackupPrismaClient;

    try {
      const [policies, evidence, restoreTests] = await Promise.all([
        prisma.backupCoveragePolicy.findMany({
          include: {
            system: true,
          },
        }),
        prisma.backupEvidence.findMany(),
        prisma.backupRestoreTest.findMany(),
      ]);

      if (policies.length === 0) {
        return buildSeededDataset();
      }

      const normalizedPolicies = policies.map((item) => normalizePolicy(item, "live"));
      const normalizedSystems = policies.map((item) => normalizeSystem(item.system, "live"));
      const normalizedEvidence = evidence.map((item) => normalizeEvidence(item, "live"));
      const normalizedRestoreTests = restoreTests.map((item) => normalizeRestoreTest(item, "live"));

      return {
        dataMode: "live",
        systems: normalizedSystems,
        policies: normalizedPolicies,
        evidence: normalizedEvidence,
        restoreTests: normalizedRestoreTests,
        generatedAt: computeGeneratedAt(normalizedEvidence, normalizedRestoreTests),
      };
    } catch (error) {
      if (isMissingBackupTableError(error)) {
        return buildSeededDataset();
      }

      throw error;
    }
  }
}

function buildSeededDataset(): BackupDataset {
  return {
    dataMode: "seeded_example",
    systems: backupFixtureSystems.map((item) => ({ ...item })),
    policies: backupFixturePolicies.map((item) => ({
      ...item,
      providerScope: item.providerScope?.map((scope) => ({ ...scope, workloadKinds: [...scope.workloadKinds] })) ?? null,
    })),
    evidence: backupFixtureEvidence.map((item) => ({ ...item, metadata: item.metadata ? { ...item.metadata } : null })),
    restoreTests: backupFixtureRestoreTests.map((item) => ({ ...item, metadata: item.metadata ? { ...item.metadata } : null })),
    generatedAt: computeGeneratedAt(backupFixtureEvidence, backupFixtureRestoreTests),
  };
}

function normalizePolicy(
  record: Awaited<ReturnType<BackupPrismaClient["backupCoveragePolicy"]["findMany"]>>[number],
  dataMode: BackupDataset["dataMode"],
): BackupFixturePolicy {
  return {
    id: record.id,
    systemId: record.systemId,
    coverageMode: record.coverageMode,
    backupFreshnessHours: record.backupFreshnessHours,
    restoreTestMaxAgeDays: record.restoreTestMaxAgeDays,
    gracePeriodHours: record.gracePeriodHours,
    providerScope: normalizeProviderScope(record.providerScope),
    exclusionReason: record.exclusionReason,
    notes: record.notes,
    confidenceState: "unknown",
    summary: null,
    dataMode,
  };
}

function normalizeSystem(
  system: Awaited<ReturnType<BackupPrismaClient["backupCoveragePolicy"]["findMany"]>>[number]["system"],
  dataMode: BackupDataset["dataMode"],
): BackupFixtureSystem {
  return {
    id: system.id,
    sourceSystem: system.sourceSystem,
    sourceId: system.sourceId,
    name: system.name,
    category: system.category,
    ownerTeam: system.ownerTeam,
    criticality: system.criticality,
    dataMode,
  };
}

function normalizeEvidence(
  record: Awaited<ReturnType<BackupPrismaClient["backupEvidence"]["findMany"]>>[number],
  dataMode: BackupDataset["dataMode"],
): BackupFixtureEvidence {
  const matchingConfidence = getMatchingConfidenceFromMetadata(record.metadata);

  return {
    id: record.id,
    systemId: record.systemId,
    providerKey: record.providerKey as BackupFixtureEvidence["providerKey"],
    workloadKind: record.workloadKind as BackupFixtureEvidence["workloadKind"],
    matchingConfidence,
    sourceSystem: record.sourceSystem,
    sourceId: record.sourceId,
    coverageState: record.coverageState,
    lastSuccessfulBackupAt: toIsoString(record.lastSuccessfulBackupAt),
    lastFailedBackupAt: toIsoString(record.lastFailedBackupAt),
    backupFreshnessState: record.backupFreshnessState,
    connectorFreshnessState: record.connectorFreshnessState,
    lastObservedAt: toIsoString(record.lastObservedAt),
    restoreFreshnessState: "unknown",
    confidenceState: "unknown",
    summary: "",
    suggestedNextStep: "",
    metadata: record.metadata,
    dataMode,
  };
}

function normalizeRestoreTest(
  record: Awaited<ReturnType<BackupPrismaClient["backupRestoreTest"]["findMany"]>>[number],
  dataMode: BackupDataset["dataMode"],
): BackupFixtureRestoreTest {
  return {
    id: record.id,
    systemId: record.systemId,
    backupEvidenceId: record.backupEvidenceId,
    evidenceSource: record.evidenceSource,
    outcome: record.outcome,
    testedAt: toRequiredIsoString(record.testedAt),
    recoveryPointAt: toIsoString(record.recoveryPointAt),
    ticketRef: record.ticketRef,
    notes: record.notes,
    metadata: record.metadata,
    dataMode,
  };
}

function normalizeProviderScope(value: unknown): BackupFixtureProviderScope[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const scopes = value.flatMap((item) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const providerKey = "providerKey" in item ? item.providerKey : undefined;
    const workloadKinds = "workloadKinds" in item ? item.workloadKinds : undefined;

    if (typeof providerKey !== "string" || !Array.isArray(workloadKinds)) {
      return [];
    }

    return [
      {
        providerKey: providerKey as BackupFixtureProviderScope["providerKey"],
        workloadKinds: workloadKinds.filter((workloadKind): workloadKind is string => typeof workloadKind === "string") as BackupFixtureProviderScope["workloadKinds"],
      },
    ];
  });

  return scopes.length > 0 ? scopes : null;
}

function buildAssessments(dataset: BackupDataset): BackupAssessmentContext[] {
  const systemById = new Map(dataset.systems.map((system) => [system.id, system]));
  const evidenceBySystemId = groupBy(dataset.evidence, (item) => item.systemId);
  const restoreBySystemId = groupBy(dataset.restoreTests, (item) => item.systemId);

  return dataset.policies.flatMap((policy) => {
    const system = systemById.get(policy.systemId);
    if (!system) {
      return [];
    }

    const evidence = evidenceBySystemId.get(policy.systemId) ?? [];
    const restoreTests = (restoreBySystemId.get(policy.systemId) ?? [])
      .slice()
      .sort((left, right) => compareDates(right.testedAt, left.testedAt));

    return [
      {
        row: buildAssessmentRow(dataset.dataMode, system, policy, evidence, restoreTests),
        policy,
        evidence,
        restoreTests,
      },
    ];
  });
}

function buildAssessmentRow(
  dataMode: BackupDataset["dataMode"],
  system: BackupFixtureSystem,
  policy: BackupFixturePolicy,
  evidence: BackupFixtureEvidence[],
  restoreTests: BackupFixtureRestoreTest[],
): BackupAssessmentRow {
  const coverageState = getCoverageState(policy, evidence);
  const telemetryUnavailable = hasTelemetryGap(policy, evidence);
  const lastSuccessfulBackupAt = getLatestDate(evidence.map((item) => item.lastSuccessfulBackupAt));
  const latestRestoreTest = restoreTests[0] ?? null;
  const lastRestoreTestedAt = latestRestoreTest?.testedAt ?? null;
  const restoreEvidenceSource = latestRestoreTest?.evidenceSource ?? null;
  const latestRestoreOutcome = latestRestoreTest?.outcome ?? null;
  const backupAgeHours = getAgeHours(lastSuccessfulBackupAt);
  const withinBackupGraceWindow = Boolean(
    backupAgeHours !== null &&
      policy.backupFreshnessHours !== null &&
      policy.gracePeriodHours !== null &&
      backupAgeHours > policy.backupFreshnessHours &&
      backupAgeHours <= policy.backupFreshnessHours + policy.gracePeriodHours,
  );
  const backupFreshnessState = getBackupFreshnessState(
    policy,
    evidence,
    coverageState,
    telemetryUnavailable,
    lastSuccessfulBackupAt,
  );
  const restoreFreshnessState = getRestoreFreshnessState(policy, evidence, restoreTests);
  const matchingConfidence = getMatchingConfidence(evidence);
  const evidenceSource = latestRestoreTest?.evidenceSource ?? (evidence.length > 0 ? "provider_sync" : null);
  const confidenceState = getConfidenceState({
    policy,
    coverageState,
    backupFreshnessState,
    restoreFreshnessState,
    latestRestoreOutcome,
    matchingConfidence,
    telemetryUnavailable,
    withinBackupGraceWindow,
  });

  const baseRow: BackupAssessmentRow = {
    systemId: system.id,
    systemName: system.name,
    sourceSystem: system.sourceSystem,
    sourceId: system.sourceId,
    category: system.category,
    siteName: null,
    ownerTeam: system.ownerTeam,
    criticality: system.criticality,
    coverageMode: policy.coverageMode,
    coverageState,
    confidenceState,
    matchingConfidence,
    providerKey: pickProviderKey(policy, evidence),
    workloadKind: pickWorkloadKind(policy, evidence),
    backupFreshnessState,
    restoreFreshnessState,
    lastSuccessfulBackupAt,
    lastRestoreTestedAt,
    evidenceSource,
    restoreEvidenceSource,
    summary: "",
    suggestedNextStep: null,
    dataMode,
    latestRestoreOutcome,
    withinBackupGraceWindow,
    telemetryUnavailable,
  };

  return {
    ...baseRow,
    summary: buildRowSummary(baseRow, policy, evidence),
  };
}

function getCoverageState(
  policy: BackupFixturePolicy,
  evidence: BackupFixtureEvidence[],
): BackupAssessmentRow["coverageState"] {
  if (policy.coverageMode === "excluded") {
    return "excluded";
  }

  if (evidence.length === 0) {
    return "missing";
  }

  const evidenceStates = new Set(evidence.map((item) => item.coverageState));
  if (evidenceStates.has("missing")) {
    return "missing";
  }

  if (evidenceStates.has("partial")) {
    return "partial";
  }

  if (evidenceStates.has("unknown")) {
    return evidenceStates.has("protected") ? "partial" : "unknown";
  }

  return "protected";
}

function hasTelemetryGap(policy: BackupFixturePolicy, evidence: BackupFixtureEvidence[]): boolean {
  if (policy.coverageMode === "excluded" || evidence.length === 0) {
    return false;
  }

  return evidence.some(
    (item) => item.connectorFreshnessState !== "current" || item.coverageState === "unknown" || item.lastObservedAt === null,
  );
}

function getBackupFreshnessState(
  policy: BackupFixturePolicy,
  evidence: BackupFixtureEvidence[],
  coverageState: BackupAssessmentRow["coverageState"],
  telemetryUnavailable: boolean,
  lastSuccessfulBackupAt: string | null,
): BackupAssessmentRow["backupFreshnessState"] {
  if (policy.coverageMode === "excluded") {
    return "unknown";
  }

  if (coverageState === "missing") {
    return "missing";
  }

  if (telemetryUnavailable && lastSuccessfulBackupAt === null) {
    return "unknown";
  }

  if (lastSuccessfulBackupAt === null) {
    return evidence[0]?.backupFreshnessState ?? "missing";
  }

  const ageHours = getAgeHours(lastSuccessfulBackupAt);
  if (ageHours === null || policy.backupFreshnessHours === null) {
    return evidence[0]?.backupFreshnessState ?? "unknown";
  }

  return ageHours <= policy.backupFreshnessHours ? "current" : "stale";
}

function getRestoreFreshnessState(
  policy: BackupFixturePolicy,
  evidence: BackupFixtureEvidence[],
  restoreTests: BackupFixtureRestoreTest[],
): BackupAssessmentRow["restoreFreshnessState"] {
  if (policy.coverageMode === "excluded") {
    return "unknown";
  }

  if (restoreTests.length === 0) {
    return "missing";
  }

  if (policy.restoreTestMaxAgeDays === null) {
    return "current";
  }
  const maxAgeDays = policy.restoreTestMaxAgeDays;

  const fallbackTests = restoreTests.filter((item) => item.backupEvidenceId === null);
  const evaluationStates = (evidence.length > 0 ? evidence : [null]).map((evidenceItem) => {
    const relevantTests =
      evidenceItem === null
        ? restoreTests
        : restoreTests.filter((item) => item.backupEvidenceId === evidenceItem.id || item.backupEvidenceId === null);

    const latestRestoreTest = relevantTests[0];
    if (!latestRestoreTest) {
      return "missing" as const;
    }

    const ageDays = getAgeDays(latestRestoreTest.testedAt);
    if (ageDays === null) {
      return "unknown" as const;
    }

    return ageDays <= maxAgeDays ? ("current" as const) : ("stale" as const);
  });

  if (evaluationStates.includes("stale")) {
    return "stale";
  }

  if (evaluationStates.includes("missing") && fallbackTests.length === 0) {
    return "missing";
  }

  if (evaluationStates.includes("unknown")) {
    return "unknown";
  }

  return "current";
}

function getMatchingConfidence(evidence: BackupFixtureEvidence[]): BackupMatchingConfidence {
  if (evidence.length === 0) {
    return "unknown";
  }

  if (evidence.some((item) => item.matchingConfidence === "duplicate")) {
    return "duplicate";
  }

  return "confirmed";
}

function getConfidenceState(input: {
  policy: BackupFixturePolicy;
  coverageState: BackupAssessmentRow["coverageState"];
  backupFreshnessState: BackupAssessmentRow["backupFreshnessState"];
  restoreFreshnessState: BackupAssessmentRow["restoreFreshnessState"];
  latestRestoreOutcome: BackupAssessmentRow["latestRestoreOutcome"];
  matchingConfidence: BackupMatchingConfidence;
  telemetryUnavailable: boolean;
  withinBackupGraceWindow: boolean;
}): BackupAssessmentRow["confidenceState"] {
  if (input.policy.coverageMode === "excluded") {
    return input.policy.confidenceState;
  }

  if (input.matchingConfidence === "duplicate") {
    return "unknown";
  }

  if (input.telemetryUnavailable) {
    return "unknown";
  }

  if (input.coverageState === "missing") {
    return "high_risk";
  }

  if (input.latestRestoreOutcome === "failure") {
    return "high_risk";
  }

  if (input.restoreFreshnessState === "stale" || input.restoreFreshnessState === "missing") {
    return "high_risk";
  }

  if (input.backupFreshnessState === "stale") {
    return input.withinBackupGraceWindow ? "watch" : "high_risk";
  }

  if (input.coverageState === "partial") {
    return "watch";
  }

  return "healthy";
}

function buildRowSummary(
  row: BackupAssessmentRow,
  policy: BackupFixturePolicy,
  evidence: BackupFixtureEvidence[],
): string {
  if (row.coverageMode === "excluded" || row.coverageState === "excluded") {
    return policy.exclusionReason ? `Excluded by policy: ${policy.exclusionReason}` : "Excluded by policy";
  }

  if (row.matchingConfidence === "duplicate") {
    return "Duplicate match needs review";
  }

  if (row.telemetryUnavailable || row.confidenceState === "unknown") {
    const summary = evidence.find((item) => item.summary === "Backup telemetry is unavailable from the configured provider")?.summary;
    return summary ?? "Backup telemetry is unavailable from the configured provider";
  }

  if (row.coverageState === "missing") {
    return "Coverage missing for an expected protected system";
  }

  if (row.latestRestoreOutcome === "failure") {
    return "Latest restore validation failed for this system";
  }

  if (row.restoreFreshnessState === "stale" && row.backupFreshnessState === "current") {
    const summary = evidence.find((item) => item.summary === "Backup is recent but restore proof is stale")?.summary;
    return summary ?? "Backup is recent but restore proof is stale";
  }

  if (row.restoreFreshnessState === "missing" && row.backupFreshnessState === "current") {
    return "Backup is recent but restore proof is missing";
  }

  if (row.backupFreshnessState === "stale") {
    return evidence.find((item) => item.summary.toLowerCase().includes("backup"))?.summary ?? "backup evidence is stale";
  }

  if (row.coverageState === "partial") {
    return evidence.find((item) => item.coverageState === "partial")?.summary ?? "Backup coverage is partial for this system";
  }

  return policy.summary ?? `${row.systemName} meets the configured backup policy.`;
}

function buildSourceHealth(dataset: BackupDataset): BackupSourceHealth[] {
  const providerKeys = new Set<string>();
  for (const policy of dataset.policies) {
    for (const scope of policy.providerScope ?? []) {
      providerKeys.add(scope.providerKey);
    }
  }
  for (const evidence of dataset.evidence) {
    providerKeys.add(evidence.providerKey);
  }

  return [...providerKeys]
    .sort((left, right) => left.localeCompare(right))
    .map((providerKey) => {
      const providerEvidence = dataset.evidence.filter((item) => item.providerKey === providerKey);
      const connectorFreshnessState =
        providerEvidence.reduce<BackupRestoreState | null>((worst, item) => {
          if (worst === null) {
            return item.connectorFreshnessState;
          }

          return connectorFreshnessOrder[item.connectorFreshnessState] > connectorFreshnessOrder[worst]
            ? item.connectorFreshnessState
            : worst;
        }, null) ?? "missing";
      const state = getSourceHealthState(providerEvidence, connectorFreshnessState);

      return {
        providerKey,
        providerLabel: providerLabelByKey.get(providerKey) ?? providerKey,
        state,
        connectorFreshnessState,
        lastObservedAt: getLatestDate(providerEvidence.map((item) => item.lastObservedAt)),
        systemsObserved: new Set(providerEvidence.map((item) => item.systemId)).size,
        workloadsObserved: new Set(providerEvidence.map((item) => item.workloadKind)).size,
        summary: buildSourceHealthSummary(state),
        dataMode: dataset.dataMode,
      };
    });
}

function getSourceHealthState(
  providerEvidence: BackupFixtureEvidence[],
  connectorFreshnessState: BackupRestoreState,
): BackupSourceHealthState {
  if (
    providerEvidence.some((item) => {
      const status = item.metadata?.["lastConnectorStatus"];
      return typeof status === "string" && /error|outage|timeout/i.test(status);
    })
  ) {
    return "error";
  }

  return connectorFreshnessState;
}

function getMatchingConfidenceFromMetadata(metadata: Record<string, unknown> | null): BackupMatchingConfidence {
  const value = metadata?.["matchingConfidence"];
  return value === "duplicate" || value === "unknown" || value === "confirmed" ? value : "confirmed";
}

function buildSourceHealthSummary(state: BackupSourceHealthState): string {
  switch (state) {
    case "current":
      return "Backup telemetry is current for this provider";
    case "stale":
      return "Backup telemetry is stale or incomplete";
    case "error":
      return "Backup provider outage or connector failure requires investigation";
    case "missing":
      return "No backup telemetry has been observed for this provider yet";
    case "unknown":
    default:
      return "Backup telemetry is unavailable from the configured provider";
  }
}

function buildOverviewSummary(rows: BackupAssessmentRow[]): string {
  const protectedCount = rows.filter((row) => row.coverageMode === "required").length;
  const highRiskCount = rows.filter((row) => row.confidenceState === "high_risk").length;
  const unknownCount = rows.filter((row) => row.confidenceState === "unknown").length;

  return `${protectedCount} protected system${protectedCount === 1 ? "" : "s"} in scope; ${highRiskCount} require immediate review and ${unknownCount} have unknown telemetry.`;
}

function buildScopeSummary(policy: BackupFixturePolicy): string {
  if (policy.coverageMode === "excluded") {
    return policy.exclusionReason
      ? `Excluded from backup policy: ${policy.exclusionReason}.`
      : "This system is intentionally excluded from backup policy.";
  }

  const providerSummary =
    policy.providerScope
      ?.map((scope) => `${providerLabelByKey.get(scope.providerKey) ?? scope.providerKey} (${scope.workloadKinds.join(", ")})`)
      .join("; ") ?? "No provider scope assigned";
  const backupWindow = policy.backupFreshnessHours === null ? "no backup freshness target" : `${policy.backupFreshnessHours}h backup freshness`;
  const restoreWindow =
    policy.restoreTestMaxAgeDays === null ? "no restore-proof target" : `${policy.restoreTestMaxAgeDays}d restore proof`;
  const graceWindow = policy.gracePeriodHours === null ? "no grace window" : `${policy.gracePeriodHours}h grace window`;

  return `${providerSummary}. Policy window: ${backupWindow}, ${restoreWindow}, ${graceWindow}.`;
}

function matchesInventoryFilters(row: BackupAssessmentRow, filters: BackupInventoryFilters): boolean {
  if (filters.confidenceState && row.confidenceState !== filters.confidenceState) {
    return false;
  }

  if (filters.coverageMode && row.coverageMode !== filters.coverageMode) {
    return false;
  }

  if (filters.coverageState && row.coverageState !== filters.coverageState) {
    return false;
  }

  if (filters.providerKey && row.providerKey !== filters.providerKey) {
    return false;
  }

  if (filters.siteName && row.siteName !== filters.siteName) {
    return false;
  }

  if (filters.category && row.category !== filters.category) {
    return false;
  }

  if (filters.workloadKind && row.workloadKind !== filters.workloadKind) {
    return false;
  }

  if (filters.criticality && row.criticality !== filters.criticality) {
    return false;
  }

  if (filters.staleOnly) {
    const isStale = row.backupFreshnessState === "stale" || row.restoreFreshnessState === "stale";
    if (!isStale) {
      return false;
    }
  }

  if (!filters.search) {
    return true;
  }

  const query = filters.search.toLowerCase();
  return [
    row.systemName,
    row.category,
    row.siteName,
    row.ownerTeam,
    row.providerKey,
    row.workloadKind,
    row.sourceSystem,
  ].some((value) => value?.toLowerCase().includes(query));
}

function toInventoryRow(row: BackupAssessmentRow): BackupInventoryRow {
  return {
    systemId: row.systemId,
    systemName: row.systemName,
    sourceSystem: row.sourceSystem,
    sourceId: row.sourceId,
    category: row.category,
    siteName: row.siteName,
    ownerTeam: row.ownerTeam,
    criticality: row.criticality,
    coverageMode: row.coverageMode,
    coverageState: row.coverageState,
    confidenceState: row.confidenceState,
    matchingConfidence: row.matchingConfidence,
    providerKey: row.providerKey,
    workloadKind: row.workloadKind,
    backupFreshnessState: row.backupFreshnessState,
    restoreFreshnessState: row.restoreFreshnessState,
    lastSuccessfulBackupAt: row.lastSuccessfulBackupAt,
    lastRestoreTestedAt: row.lastRestoreTestedAt,
    evidenceSource: row.evidenceSource,
    restoreEvidenceSource: row.restoreEvidenceSource,
    summary: row.summary,
    suggestedNextStep: buildBackupSuggestedNextStep(row),
    dataMode: row.dataMode,
  };
}

function pickProviderKey(policy: BackupFixturePolicy, evidence: BackupFixtureEvidence[]): string | null {
  return evidence[0]?.providerKey ?? policy.providerScope?.[0]?.providerKey ?? null;
}

function pickWorkloadKind(policy: BackupFixturePolicy, evidence: BackupFixtureEvidence[]): string | null {
  return evidence[0]?.workloadKind ?? policy.providerScope?.[0]?.workloadKinds[0] ?? null;
}

function computeGeneratedAt(
  evidence: BackupFixtureEvidence[],
  restoreTests: BackupFixtureRestoreTest[],
): string | null {
  return getLatestDate([
    ...evidence.map((item) => item.lastObservedAt),
    ...restoreTests.map((item) => item.testedAt),
  ]);
}

function getLatestDate(values: Array<string | null>): string | null {
  return values.reduce<string | null>((latest, value) => {
    if (!value) {
      return latest;
    }

    if (!latest) {
      return value;
    }

    return compareDates(value, latest) > 0 ? value : latest;
  }, null);
}

function compareDates(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  return new Date(left).valueOf() - new Date(right).valueOf();
}

function getAgeHours(value: string | null): number | null {
  if (!value) {
    return null;
  }

  return (Date.now() - new Date(value).valueOf()) / (1000 * 60 * 60);
}

function getAgeDays(value: string | null): number | null {
  if (!value) {
    return null;
  }

  return (Date.now() - new Date(value).valueOf()) / (1000 * 60 * 60 * 24);
}

function toIsoString(value: BackupDateValue): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toRequiredIsoString(value: BackupDateValue): string {
  return toIsoString(value) ?? new Date(0).toISOString();
}

function isMissingBackupTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";

  return code === "P2021" || /backup(coveragepolicy|evidence|restoretest)/i.test(message);
}

function groupBy<T>(items: T[], keySelector: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keySelector(item);
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
      continue;
    }

    groups.set(key, [item]);
  }

  return groups;
}
