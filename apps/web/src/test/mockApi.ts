import type { SessionUser } from "../hooks/useSession";
import type {
  DocumentationMetadataReviewRequest,
  DocumentationMetadataReviewResponse,
} from "../lib/docs";
import type {
  LifecycleRunDetail,
  LifecycleRunSummary,
  LifecycleTemplate,
  StartLifecycleRunInput,
  UpdateLifecycleStepInput,
} from "../lib/lifecycle";

type MockResponseDescriptor = {
  status: number;
  headers?: Record<string, string>;
  json?: unknown;
  text?: string;
};

export type MockRequestLogEntry = {
  method: string;
  pathname: string;
  search: string;
  body: string | null;
};

export type CreateMockApiOptions = {
  authenticated?: boolean;
  bootstrapRequired?: boolean; // defaults to false — most tests assume bootstrap is complete
};

export type MockApi = ReturnType<typeof createMockApi>;

const baseOrigin = "http://localhost";
const fixedNow = "2026-03-28T15:00:00.000Z";

const mockUser: SessionUser = {
  id: "operator-1",
  email: "morgan.admin@example.com",
  displayName: "Morgan Admin",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toUrl(input: string | URL) {
  return new URL(String(input), baseOrigin);
}

function jsonResponse(json: unknown, status = 200): MockResponseDescriptor {
  return {
    status,
    headers: {
      "content-type": "application/json",
    },
    json,
  };
}

async function readRequestBody(input: RequestInfo | URL, init?: RequestInit) {
  if (typeof init?.body === "string") {
    return init.body;
  }

  if (input instanceof Request) {
    return input.clone().text();
  }

  return null;
}

const assetQueueResponse = {
  items: [
    {
      deviceId: "agentsmith-1",
      deviceName: "AgentSmith Laptop 01",
      riskScore: 92,
      riskLevel: "critical",
      queueRank: 1,
      summary: "Encryption is missing and the device has not checked in recently.",
      signals: [
        {
          code: "missing_encryption",
          label: "Missing encryption",
          severity: "critical",
          explanation: "BitLocker is not enabled.",
        },
      ],
      sourceFreshnessState: "warning",
    },
  ],
};

const assetInventoryResponse = {
  items: [
    {
      deviceId: "agentsmith-1",
      deviceName: "AgentSmith Laptop 01",
      ownerDisplayName: "Jordan Lee",
      department: "Operations",
      site: "HQ",
      operatingSystem: "Windows 11 Pro",
      encryptionStatus: "missing",
      antivirusStatus: "healthy",
      patchStatus: "warning",
      lastCheckInAt: "2026-03-24T13:00:00.000Z",
      riskScore: 92,
      riskLevel: "critical",
      summary: "Encryption is missing and the device has not checked in recently.",
      signals: assetQueueResponse.items[0].signals,
      sourceFreshnessState: "warning",
      complianceState: "noncompliant",
    },
    {
      deviceId: "agentsmith-2",
      deviceName: "AgentSmith Surface 02",
      ownerDisplayName: "Taylor Brooks",
      department: "Finance",
      site: "Branch",
      operatingSystem: "Windows 10 Pro",
      encryptionStatus: "healthy",
      antivirusStatus: "warning",
      patchStatus: "missing",
      lastCheckInAt: "2026-03-28T12:40:00.000Z",
      riskScore: 71,
      riskLevel: "high",
      summary: "Patching is missing and AV telemetry needs review.",
      signals: [
        {
          code: "missing_patch",
          label: "Missing patch",
          severity: "high",
          explanation: "Patch rollup missing.",
        },
      ],
      sourceFreshnessState: "healthy",
      complianceState: "compliant",
    },
  ],
};

const assetDetails = {
  "agentsmith-1": {
    ...assetInventoryResponse.items[0],
    ownerEmail: "jordan.lee@example.com",
    diskFreePercent: 11,
    deviceAgeDays: 1140,
    supportStatus: "expiring",
    serialNumber: "ASMITH-LAP-01",
    complianceState: "noncompliant",
    sourceSystem: "intune",
    sourceId: "intune-device-001",
    calculatedAt: "2026-03-28T14:55:00.000Z",
    queueRank: 1,
    complianceAssignments: [
      { policyName: "Windows 10 Baseline", platform: "windows10AndLater", status: "compliant", lastReportedAt: "2026-03-28T14:55:00.000Z" },
    ],
  },
  "agentsmith-2": {
    ...assetInventoryResponse.items[1],
    ownerEmail: "taylor.brooks@example.com",
    diskFreePercent: 44,
    deviceAgeDays: 620,
    supportStatus: "supported",
    serialNumber: "ASMITH-SRF-02",
    complianceState: "compliant",
    sourceSystem: "intune",
    sourceId: "intune-device-002",
    calculatedAt: "2026-03-28T14:55:00.000Z",
    queueRank: 2,
    complianceAssignments: [],
  },
};

const connectorCards = [
  {
    id: "entra",
    label: "Microsoft Entra",
    health: "healthy",
    freshnessState: "healthy",
    lastSuccessfulSyncAt: "2026-03-28T14:40:00.000Z",
    lastAttemptedSyncAt: "2026-03-28T14:40:00.000Z",
    lastResult: "42 identities normalized",
  },
  {
    id: "intune",
    label: "Microsoft Intune",
    health: "warning",
    freshnessState: "warning",
    lastSuccessfulSyncAt: "2026-03-28T12:15:00.000Z",
    lastAttemptedSyncAt: "2026-03-28T14:35:00.000Z",
    lastResult: "Sync completed with stale device inventory",
  },
];

const auditEvents = [
  {
    timestamp: "2026-03-28T14:58:00.000Z",
    action: "docs.metadata.reviewed",
    actorId: "operator-1",
    targetType: "document",
    targetId: "doc-m365-break-glass",
    result: "success",
    metadata: {
      reviewState: "current",
      actorLabel: "Morgan Admin",
    },
  },
  {
    timestamp: "2026-03-28T14:40:00.000Z",
    action: "connector.sync_succeeded",
    actorId: null,
    targetType: "connector",
    targetId: "entra",
    result: "success",
    metadata: {
      recordsSeen: 42,
    },
  },
];

const backupOverviewResponse = {
  dataMode: "seeded_example",
  generatedAt: fixedNow,
  summary: "Protected systems need review where coverage, restore proof, or telemetry are unclear.",
  cards: [
    { key: "high_risk", label: "High risk", value: 1, tone: "high_risk", summary: "Coverage is missing for one system." },
    { key: "watch", label: "Watch", value: 1, tone: "watch", summary: "Restore proof needs attention on one system." },
    { key: "unknown", label: "Unknown", value: 1, tone: "unknown", summary: "Telemetry is unclear on one system." },
  ],
  findings: [],
  sourceHealth: [
    {
      providerKey: "veeam",
      providerLabel: "Veeam",
      state: "current",
      connectorFreshnessState: "current",
      lastObservedAt: "2026-03-28T14:20:00.000Z",
      systemsObserved: 17,
      workloadsObserved: 33,
      summary: "Primary backup telemetry is current.",
      dataMode: "seeded_example",
    },
  ],
  isReadOnly: true,
};

const backupFindingsResponse = {
  dataMode: "seeded_example",
  isReadOnly: true,
  items: [
    {
      findingId: "backup-finding-1",
      queueRank: 1,
      dataMode: "seeded_example",
      systemId: "sys-finance-sql",
      systemName: "Finance SQL",
      category: "database",
      siteName: "HQ",
      providerKey: "veeam",
      coverageState: "missing",
      confidenceState: "high_risk",
      matchingConfidence: "confirmed",
      lastSuccessfulBackupAt: null,
      lastRestoreTestAt: null,
      evidenceSource: null,
      summary: "Expected backup coverage is missing for the finance database.",
      suggestedNextStep: "Confirm provider scope and restore backup coverage before approving changes.",
      sourceHealth: backupOverviewResponse.sourceHealth[0],
      isReadOnly: true,
      workloadKind: "sql",
    },
  ],
};

const backupInventoryResponse = {
  dataMode: "seeded_example",
  isReadOnly: true,
  items: [
    {
      dataMode: "seeded_example",
      systemId: "sys-finance-sql",
      systemName: "Finance SQL",
      category: "database",
      siteName: "HQ",
      providerKey: "veeam",
      coverageState: "missing",
      confidenceState: "high_risk",
      matchingConfidence: "confirmed",
      lastSuccessfulBackupAt: null,
      lastRestoreTestAt: null,
      evidenceSource: null,
      summary: "Coverage is missing for the finance workload.",
      suggestedNextStep: "Restore coverage before the next change window.",
      sourceHealth: backupOverviewResponse.sourceHealth[0],
      isReadOnly: true,
      workloadKind: "sql",
      backupFreshnessState: "missing",
      restoreFreshnessState: "missing",
    },
  ],
};

const backupDetails = {
  "sys-finance-sql": {
    dataMode: "seeded_example",
    systemId: "sys-finance-sql",
    systemName: "Finance SQL",
    category: "database",
    siteName: "HQ",
    providerKey: "veeam",
    coverageState: "missing",
    confidenceState: "high_risk",
    matchingConfidence: "confirmed",
    lastSuccessfulBackupAt: null,
    lastRestoreTestAt: null,
    evidenceSource: null,
    summary: "Expected backup coverage is missing for this system.",
    suggestedNextStep: "Confirm provider scope and restore backup coverage before approving changes.",
    sourceHealth: [backupOverviewResponse.sourceHealth[0]],
    isReadOnly: true,
    scopeSummary: "Primary finance database. Policy window: Backup freshness 24h, Restore proof 30d, Grace window 6h.",
    providerEvidence: [],
    restoreProofs: [],
  },
};

const docsDetailRecords = {
  "doc-m365-break-glass": {
    dataMode: "seeded_example",
    writeBoundary: "metadata_review_only",
    documentId: "doc-m365-break-glass",
    title: "Microsoft 365 Break Glass",
    kind: "recovery_procedure",
    summary: "Escalation and recovery steps for tenant break-glass access.",
    contentText: "Confirm the break-glass mailbox, validate MFA bypass, and test the emergency sign-in path.",
    reviewState: "overdue",
    reviewDueAt: "2026-03-21T00:00:00.000Z",
    lastReviewedAt: "2026-02-20T12:00:00.000Z",
    sourceUpdatedAt: "2026-03-25T09:00:00.000Z",
    contentUpdatedAt: "2026-03-24T15:30:00.000Z",
    metadataTags: [
      { dimension: "site", valueKey: "cloud", valueLabel: "Cloud" },
      { dimension: "owner", valueKey: "identity-operations", valueLabel: "Identity Operations" },
      { dimension: "category", valueKey: "recovery", valueLabel: "Recovery" },
    ],
    linkedSystems: [
      { systemId: "sys-sharepoint-tenant", systemName: "SharePoint Online", relationshipLabel: "Recovery dependency", category: "saas", ownerTeam: "Identity Operations", criticality: "critical" },
    ],
    history: [
      {
        revisionId: "doc-revision-1",
        revisionType: "review_completed",
        summary: "Quarterly recovery runbook review completed.",
        changedFields: ["reviewState", "reviewDueAt"],
        actorLabel: "Morgan Admin",
        reviewState: "current",
        reviewDueAt: "2026-03-21T00:00:00.000Z",
        createdAt: "2026-02-20T12:00:00.000Z",
      },
    ],
    metadataCatalog: {
      sites: [{ dimension: "site", valueKey: "cloud", valueLabel: "Cloud" }],
      owners: [{ dimension: "owner", valueKey: "identity-operations", valueLabel: "Identity Operations" }],
      categories: [{ dimension: "category", valueKey: "recovery", valueLabel: "Recovery" }],
      systems: [{ systemId: "sys-sharepoint-tenant", systemName: "SharePoint Online", category: "saas", ownerTeam: "Identity Operations", criticality: "critical" }],
    },
    suggestedNextStep: "Confirm the updated break-glass process and record the next review window.",
  },
};

const docsOverviewResponse = {
  dataMode: "seeded_example",
  generatedAt: fixedNow,
  summary: "Documentation review posture",
  writeBoundary: "metadata_review_only",
  cards: [
    { key: "review_overdue", label: "review_overdue", value: 1, tone: "high", summary: "Records already past review." },
    { key: "metadata_incomplete", label: "metadata_incomplete", value: 0, tone: "watch", summary: "Records missing metadata." },
    { key: "recent_change", label: "recent_change", value: 1, tone: "neutral", summary: "Records updated after review." },
  ],
  queue: [
    {
      queueId: "docs-queue-1",
      documentId: "doc-m365-break-glass",
      title: "Microsoft 365 Break Glass",
      kind: "recovery_procedure",
      reviewState: "overdue",
      reviewDueAt: "2026-03-21T00:00:00.000Z",
      lastReviewedAt: "2026-02-20T12:00:00.000Z",
      sourceUpdatedAt: "2026-03-25T09:00:00.000Z",
      contentUpdatedAt: "2026-03-24T15:30:00.000Z",
      summary: "Escalation and recovery steps for tenant break-glass access.",
      focusReason: { code: "review_overdue", label: "Review overdue", summary: "The review window has passed and the record needs attention." },
      suggestedNextStep: "Confirm the updated break-glass process and record the next review window.",
      queueRank: 1,
      metadataTags: docsDetailRecords["doc-m365-break-glass"].metadataTags,
      linkedSystems: docsDetailRecords["doc-m365-break-glass"].linkedSystems,
    },
  ],
};

const docsSearchResponse = {
  dataMode: "seeded_example",
  generatedAt: fixedNow,
  summary: "Server-driven documentation search inventory",
  writeBoundary: "metadata_review_only",
  filters: {},
  facets: {
    kinds: [{ value: "recovery_procedure", label: "recovery_procedure", count: 1 }],
    reviewStates: [{ value: "overdue", label: "overdue", count: 1 }],
    sites: [{ value: "Cloud", label: "Cloud", count: 1 }],
    owners: [{ value: "Identity Operations", label: "Identity Operations", count: 1 }],
    categories: [{ value: "Recovery", label: "Recovery", count: 1 }],
    systems: [{ value: "SharePoint Online", label: "SharePoint Online", count: 1 }],
  },
  results: [
    {
      documentId: "doc-m365-break-glass",
      title: "Microsoft 365 Break Glass",
      kind: "recovery_procedure",
      summary: "Escalation and recovery steps for tenant break-glass access.",
      reviewState: "overdue",
      reviewDueAt: "2026-03-21T00:00:00.000Z",
      lastReviewedAt: "2026-02-20T12:00:00.000Z",
      sourceUpdatedAt: "2026-03-25T09:00:00.000Z",
      contentUpdatedAt: "2026-03-24T15:30:00.000Z",
      matchedExcerpt: "Validate the emergency sign-in path and document the latest review date.",
      relevanceScore: 0.98,
      reasons: [{ code: "review_overdue", label: "Review overdue", summary: "The review window has passed and the record needs attention." }],
      metadataTags: docsDetailRecords["doc-m365-break-glass"].metadataTags,
      linkedSystems: docsDetailRecords["doc-m365-break-glass"].linkedSystems,
      suggestedNextStep: "Confirm the updated break-glass process and record the next review window.",
    },
  ],
  total: 1,
};

const lifecycleTemplates: LifecycleTemplate[] = [
  {
    templateKey: "employee-onboarding",
    kind: "onboarding",
    version: 1,
    title: "Employee onboarding",
    description: "Identity, licensing, access, and device preparation for new starters.",
    groups: [
      {
        groupKey: "identity",
        title: "Identity setup",
        position: 1,
        steps: [
          { stepId: "identity-create-account", title: "Create Entra account", instructions: "Create the account and verify MFA defaults.", position: 1 },
          { stepId: "identity-assign-groups", title: "Assign baseline access", instructions: "Apply the starter groups for the employee role.", position: 2 },
        ],
      },
      {
        groupKey: "device",
        title: "Device readiness",
        position: 2,
        steps: [{ stepId: "device-prepare-laptop", title: "Prepare laptop", instructions: "Image and verify the standard laptop build.", position: 1 }],
      },
    ],
  },
];

const lifecycleRuns: LifecycleRunDetail[] = [
  {
    runId: "run-1",
    templateKey: "employee-onboarding",
    templateVersion: 1,
    kind: "onboarding",
    subjectDisplayName: "Jordan Lee",
    subjectEmail: "jordan.lee@example.com",
    requestedBy: "Operator review queue",
    status: "active",
    startedAt: "2026-03-28T13:10:00.000Z",
    closedAt: null,
    updatedAt: "2026-03-28T14:10:00.000Z",
    groups: [
      {
        groupKey: "identity",
        title: "Identity setup",
        position: 1,
        steps: [
          {
            stepId: "identity-create-account",
            title: "Create Entra account",
            instructions: "Create the account and verify MFA defaults.",
            groupKey: "identity",
            position: 1,
            status: "manual",
            statusReason: null,
            note: "Created in Entra and validated baseline policies.",
            ticketId: "TCK-1042",
            assetId: null,
            mailboxRef: null,
            handoffRef: null,
            completedAt: "2026-03-28T13:40:00.000Z",
          },
          {
            stepId: "identity-assign-groups",
            title: "Assign baseline access",
            instructions: "Apply the starter groups for the employee role.",
            groupKey: "identity",
            position: 2,
            status: "pending",
            statusReason: null,
            note: null,
            ticketId: null,
            assetId: null,
            mailboxRef: null,
            handoffRef: null,
            completedAt: null,
          },
        ],
      },
      {
        groupKey: "device",
        title: "Device readiness",
        position: 2,
        steps: [
          {
            stepId: "device-prepare-laptop",
            title: "Prepare laptop",
            instructions: "Image and verify the standard laptop build.",
            groupKey: "device",
            position: 1,
            status: "blocked",
            statusReason: "Waiting on procurement confirmation.",
            note: "Asset tag not yet issued.",
            ticketId: null,
            assetId: null,
            mailboxRef: null,
            handoffRef: "PROC-77",
            completedAt: null,
          },
        ],
      },
    ],
  },
];

const networkFindingsResponse = {
  dataMode: "seeded_example",
  items: [
    {
      dataMode: "seeded_example",
      findingId: "network-finding-1",
      resourceId: "firewall-hq-01",
      resourceName: "HQ Firewall 01",
      resourceKind: "firewall",
      kind: "offline_infrastructure",
      severity: "critical",
      queueRank: 1,
      siteName: "HQ",
      scopeLabel: "HQ perimeter",
      operationalStatus: "offline",
      freshnessState: "stale",
      lastSeenAt: "2026-03-28T09:15:00.000Z",
      summary: "Primary perimeter firewall has been offline since the morning maintenance window.",
      suggestedNextStep: "Confirm whether the outage is planned and verify the WAN edge path.",
    },
  ],
};

const networkInventoryResponse = {
  dataMode: "seeded_example",
  items: [
    {
      dataMode: "seeded_example",
      resourceId: "firewall-hq-01",
      resourceName: "HQ Firewall 01",
      resourceKind: "firewall",
      siteName: "HQ",
      operationalStatus: "offline",
      freshnessState: "stale",
      lastSeenAt: "2026-03-28T09:15:00.000Z",
      managementIp: "10.0.0.1",
      cidr: null,
      ownerLabel: "Infrastructure",
      summary: "Primary perimeter firewall is offline and needs immediate review.",
    },
  ],
};

const networkMapResponse = {
  dataMode: "seeded_example",
  sites: [{ siteName: "HQ", resourceIds: ["site-hq", "wan-hq-primary", "lan-hq-core", "firewall-hq-01"], relationshipCount: 3, freshnessState: "healthy" }],
  resources: [
    { resourceId: "site-hq", resourceName: "HQ", resourceKind: "site", siteName: "HQ", operationalStatus: "online", freshnessState: "healthy", lastSeenAt: "2026-03-28T14:40:00.000Z" },
    { resourceId: "wan-hq-primary", resourceName: "HQ Primary WAN", resourceKind: "wan_link", siteName: "HQ", operationalStatus: "online", freshnessState: "healthy", lastSeenAt: "2026-03-28T14:40:00.000Z" },
    { resourceId: "lan-hq-core", resourceName: "HQ Core LAN", resourceKind: "lan_segment", siteName: "HQ", operationalStatus: "online", freshnessState: "healthy", lastSeenAt: "2026-03-28T14:38:00.000Z" },
    { resourceId: "firewall-hq-01", resourceName: "HQ Firewall 01", resourceKind: "firewall", siteName: "HQ", operationalStatus: "offline", freshnessState: "stale", lastSeenAt: "2026-03-28T09:15:00.000Z" },
  ],
  relationships: [
    { relationshipId: "rel-hq-site-wan", fromResourceId: "site-hq", toResourceId: "wan-hq-primary", relationship: "has_uplink", confidence: "confirmed", lastSeenAt: "2026-03-28T14:40:00.000Z" },
    { relationshipId: "rel-hq-wan-firewall", fromResourceId: "wan-hq-primary", toResourceId: "firewall-hq-01", relationship: "connects_to", confidence: "confirmed", lastSeenAt: "2026-03-28T14:40:00.000Z" },
    { relationshipId: "rel-hq-firewall-lan", fromResourceId: "firewall-hq-01", toResourceId: "lan-hq-core", relationship: "protects", confidence: "inferred", lastSeenAt: "2026-03-28T09:15:00.000Z" },
  ],
};

const networkDetails = {
  "firewall-hq-01": {
    dataMode: "seeded_example",
    resourceId: "firewall-hq-01",
    resourceName: "HQ Firewall 01",
    resourceKind: "firewall",
    siteName: "HQ",
    operationalStatus: "offline",
    freshnessState: "stale",
    lastSeenAt: "2026-03-28T09:15:00.000Z",
    managementIp: "10.0.0.1",
    cidr: null,
    ownerLabel: "Infrastructure",
    scopeSummary: "HQ perimeter firewall protecting the core LAN and upstream WAN handoff.",
    summary: "Primary perimeter firewall is offline and needs immediate review.",
    suggestedNextStep: "Verify whether the outage is planned and confirm failover at the WAN edge.",
    findings: networkFindingsResponse.items,
    relatedResources: [
      {
        resourceId: "wan-hq-primary",
        resourceName: "HQ Primary WAN",
        resourceKind: "wan_link",
        siteName: "HQ",
        operationalStatus: "online",
        freshnessState: "healthy",
        lastSeenAt: "2026-03-28T14:40:00.000Z",
        relationship: "connects_to",
        confidence: "confirmed",
        direction: "incoming",
      },
    ],
  },
};

function buildLifecycleSummary(run: LifecycleRunDetail): LifecycleRunSummary {
  const groups = run.groups.map((group) => {
    const summary = {
      groupKey: group.groupKey,
      title: group.title,
      pendingCount: 0,
      completedCount: 0,
      manualCount: 0,
      skippedCount: 0,
      blockedCount: 0,
      unresolvedCount: 0,
    };

    for (const step of group.steps) {
      if (step.status === "pending") summary.pendingCount += 1;
      if (step.status === "automated") summary.completedCount += 1;
      if (step.status === "manual") summary.manualCount += 1;
      if (step.status === "skipped") {
        summary.skippedCount += 1;
        summary.unresolvedCount += 1;
      }
      if (step.status === "blocked") {
        summary.blockedCount += 1;
        summary.unresolvedCount += 1;
      }
    }

    return summary;
  });

  return {
    completedCount: groups.reduce((total, group) => total + group.completedCount, 0),
    manualCount: groups.reduce((total, group) => total + group.manualCount, 0),
    skippedCount: groups.reduce((total, group) => total + group.skippedCount, 0),
    blockedCount: groups.reduce((total, group) => total + group.blockedCount, 0),
    unresolvedFollowUps: run.groups.flatMap((group) =>
      group.steps
        .filter((step) => step.status === "blocked" || step.status === "skipped")
        .map((step) => ({
          stepId: step.stepId,
          title: step.title,
          groupKey: group.groupKey,
          status: step.status,
          statusReason: step.statusReason,
        })),
    ),
    groups,
  };
}

function cloneTemplateIntoRun(template: LifecycleTemplate, input: StartLifecycleRunInput, timestamp: string, runId: string): LifecycleRunDetail {
  return {
    runId,
    templateKey: template.templateKey,
    templateVersion: template.version,
    kind: template.kind,
    subjectDisplayName: input.subjectDisplayName,
    subjectEmail: input.subjectEmail ?? null,
    requestedBy: input.requestedBy,
    status: "active",
    startedAt: timestamp,
    closedAt: null,
    updatedAt: timestamp,
    groups: template.groups.map((group) => ({
      groupKey: group.groupKey,
      title: group.title,
      position: group.position,
      steps: group.steps.map((step) => ({
        stepId: step.stepId,
        title: step.title,
        instructions: step.instructions,
        groupKey: group.groupKey,
        position: step.position,
        status: "pending",
        statusReason: null,
        note: null,
        ticketId: null,
        assetId: null,
        mailboxRef: null,
        handoffRef: null,
        completedAt: null,
      })),
    })),
  };
}

export function createMockApi(options: CreateMockApiOptions = {}) {
  const requestLog: MockRequestLogEntry[] = [];
  let authenticated = options.authenticated ?? true;
  let bootstrapRequired = options.bootstrapRequired ?? false;
  let mutationIndex = 0;
  const docsState = clone(docsDetailRecords);
  const lifecycleState = clone(lifecycleRuns);

  function nextTimestamp() {
    mutationIndex += 1;
    return new Date(new Date(fixedNow).valueOf() + mutationIndex * 60_000).toISOString();
  }

  async function handleRequest(input: string | URL, init: { method?: string; body?: string | null } = {}) {
    const url = toUrl(input);
    const method = (init.method ?? "GET").toUpperCase();
    const body = init.body ?? null;

    requestLog.push({
      method,
      pathname: url.pathname,
      search: url.search,
      body,
    });

    if (method === "GET" && url.pathname === "/api/me") {
      return authenticated
        ? jsonResponse({ authenticated: true, user: mockUser })
        : jsonResponse({ message: "Authentication required" }, 401);
    }

    if (method === "POST" && url.pathname === "/auth/logout") {
      authenticated = false;
      return { status: 204 };
    }

    if (method === "GET" && url.pathname === "/api/bootstrap-status") {
      return jsonResponse({ bootstrapRequired });
    }

    if (method === "POST" && url.pathname === "/api/bootstrap") {
      if (bootstrapRequired) {
        bootstrapRequired = false;
        return jsonResponse({ userId: "bootstrap-admin-1" }, 201);
      }
      return jsonResponse({ error: "bootstrap_already_completed" }, 409);
    }

    if (method === "POST" && url.pathname === "/api/auth/local/login") {
      return jsonResponse({ redirectPath: "/" });
    }

    if (method === "GET" && url.pathname === "/api/assets/queue") return jsonResponse(assetQueueResponse);
    if (method === "GET" && url.pathname === "/api/assets/devices") return jsonResponse(assetInventoryResponse);
    if (method === "GET" && url.pathname.startsWith("/api/assets/devices/")) {
      const deviceId = url.pathname.split("/").pop() ?? "";
      return assetDetails[deviceId as keyof typeof assetDetails]
        ? jsonResponse(assetDetails[deviceId as keyof typeof assetDetails])
        : jsonResponse({ message: "Device not found" }, 404);
    }

    if (method === "GET" && url.pathname === "/api/connectors") return jsonResponse(connectorCards);
    if (method === "POST" && url.pathname === "/api/connectors/intune/sync") {
      return jsonResponse({ ok: true, connectorId: "intune", result: "success" });
    }
    if (method === "GET" && url.pathname === "/api/audit-events") return jsonResponse(auditEvents);
    if (method === "GET" && url.pathname === "/api/backup/overview") return jsonResponse(backupOverviewResponse);
    if (method === "GET" && url.pathname === "/api/backup/findings") return jsonResponse(backupFindingsResponse);
    if (method === "GET" && url.pathname === "/api/backup/systems") return jsonResponse(backupInventoryResponse);
    if (method === "GET" && url.pathname.startsWith("/api/backup/systems/")) {
      const systemId = url.pathname.split("/").pop() ?? "";
      return backupDetails[systemId as keyof typeof backupDetails]
        ? jsonResponse(backupDetails[systemId as keyof typeof backupDetails])
        : jsonResponse({ message: "Backup system not found" }, 404);
    }

    if (method === "GET" && url.pathname === "/api/docs/overview") return jsonResponse(docsOverviewResponse);
    if (method === "GET" && url.pathname === "/api/docs/search") return jsonResponse(docsSearchResponse);
    if (method === "GET" && url.pathname.startsWith("/api/docs/") && !url.pathname.endsWith("/metadata-review")) {
      const documentId = url.pathname.split("/").pop() ?? "";
      return docsState[documentId as keyof typeof docsState]
        ? jsonResponse(docsState[documentId as keyof typeof docsState])
        : jsonResponse({ message: "Documentation record not found" }, 404);
    }

    if (method === "POST" && url.pathname.endsWith("/metadata-review")) {
      const documentId = url.pathname.split("/")[3] ?? "";
      const detail = docsState[documentId as keyof typeof docsState];
      const payload = body ? (JSON.parse(body) as DocumentationMetadataReviewRequest) : null;

      if (!detail || !payload) {
        return jsonResponse({ message: "Documentation record not found" }, 404);
      }

      const timestamp = nextTimestamp();
      detail.reviewState = "current";
      detail.reviewDueAt = payload.reviewDueAt;
      detail.lastReviewedAt = timestamp;
      detail.history.unshift({
        revisionId: `doc-revision-${detail.history.length + 1}`,
        revisionType: "metadata_review",
        summary: payload.reviewSummary,
        changedFields: ["metadataTags", "reviewDueAt"],
        actorLabel: payload.actorLabel,
        reviewState: "current",
        reviewDueAt: payload.reviewDueAt,
        createdAt: timestamp,
      });

      const result: DocumentationMetadataReviewResponse = {
        documentId,
        changedFields: ["metadataTags", "reviewDueAt"],
        historyEntryId: detail.history[0]?.revisionId ?? "doc-revision-latest",
        auditAction: "docs.metadata.reviewed",
        reviewDueAt: detail.reviewDueAt,
        lastReviewedAt: detail.lastReviewedAt,
      };

      return jsonResponse(result);
    }

    if (method === "GET" && url.pathname === "/api/lifecycle/templates") return jsonResponse({ items: lifecycleTemplates });
    if (method === "GET" && url.pathname === "/api/lifecycle/runs") {
      return jsonResponse({
        items: lifecycleState.map((run) => ({
          runId: run.runId,
          templateKey: run.templateKey,
          templateVersion: run.templateVersion,
          kind: run.kind,
          subjectDisplayName: run.subjectDisplayName,
          subjectEmail: run.subjectEmail,
          requestedBy: run.requestedBy,
          status: run.status,
          startedAt: run.startedAt,
          closedAt: run.closedAt,
          updatedAt: run.updatedAt,
        })),
      });
    }
    if (method === "POST" && url.pathname === "/api/lifecycle/runs") {
      const payload = body ? (JSON.parse(body) as StartLifecycleRunInput) : null;
      const template = lifecycleTemplates[0];
      if (!payload || !template) return jsonResponse({ message: "Lifecycle template not found" }, 404);
      const runId = `run-${lifecycleState.length + 1}`;
      const run = cloneTemplateIntoRun(template, payload, nextTimestamp(), runId);
      lifecycleState.unshift(run);
      return jsonResponse(run);
    }
    if (method === "GET" && url.pathname.startsWith("/api/lifecycle/runs/") && url.pathname.endsWith("/summary")) {
      const runId = url.pathname.split("/")[4] ?? "";
      const run = lifecycleState.find((item) => item.runId === runId);
      return run ? jsonResponse(buildLifecycleSummary(run)) : jsonResponse({ message: "Lifecycle run not found" }, 404);
    }
    if (method === "GET" && url.pathname.startsWith("/api/lifecycle/runs/") && !url.pathname.includes("/steps/") && !url.pathname.endsWith("/close")) {
      const runId = url.pathname.split("/")[4] ?? "";
      const run = lifecycleState.find((item) => item.runId === runId);
      return run ? jsonResponse(run) : jsonResponse({ message: "Lifecycle run not found" }, 404);
    }
    if (method === "PATCH" && url.pathname.includes("/api/lifecycle/runs/") && url.pathname.includes("/steps/")) {
      const runId = url.pathname.split("/")[4] ?? "";
      const stepId = url.pathname.split("/")[6] ?? "";
      const payload = body ? (JSON.parse(body) as UpdateLifecycleStepInput) : null;
      const run = lifecycleState.find((item) => item.runId === runId);
      const step = run?.groups.flatMap((group) => group.steps).find((item) => item.stepId === stepId);
      if (!run || !step || !payload) return jsonResponse({ message: "Lifecycle step not found" }, 404);
      if ((payload.status === "blocked" || payload.status === "skipped") && !(payload.statusReason ?? "").trim()) {
        return jsonResponse({ message: "statusReason is required when a step is skipped or blocked." }, 400);
      }
      step.status = payload.status;
      step.statusReason = payload.statusReason ?? null;
      step.note = payload.note ?? null;
      step.ticketId = payload.ticketId ?? null;
      step.assetId = payload.assetId ?? null;
      step.mailboxRef = payload.mailboxRef ?? null;
      step.handoffRef = payload.handoffRef ?? null;
      step.completedAt = payload.status === "blocked" || payload.status === "skipped" ? null : nextTimestamp();
      run.updatedAt = nextTimestamp();
      return jsonResponse(run);
    }
    if (method === "POST" && url.pathname.startsWith("/api/lifecycle/runs/") && url.pathname.endsWith("/close")) {
      const runId = url.pathname.split("/")[4] ?? "";
      const run = lifecycleState.find((item) => item.runId === runId);
      if (!run) return jsonResponse({ message: "Lifecycle run not found" }, 404);
      run.status = "completed";
      run.closedAt = nextTimestamp();
      run.updatedAt = nextTimestamp();
      return jsonResponse(buildLifecycleSummary(run));
    }

    if (method === "GET" && url.pathname === "/api/network/findings") return jsonResponse(networkFindingsResponse);
    if (method === "GET" && url.pathname === "/api/network/resources") return jsonResponse(networkInventoryResponse);
    if (method === "GET" && url.pathname === "/api/network/map") return jsonResponse(networkMapResponse);
    if (method === "GET" && url.pathname.startsWith("/api/network/resources/")) {
      const resourceId = url.pathname.split("/").pop() ?? "";
      return networkDetails[resourceId as keyof typeof networkDetails]
        ? jsonResponse(networkDetails[resourceId as keyof typeof networkDetails])
        : jsonResponse({ message: "Network resource not found" }, 404);
    }

    if (method === "GET" && url.pathname === "/api/integrations/intune") {
      return jsonResponse({
        configured: true,
        tenantId: "mock-tenant-id",
        clientId: "mock-client-id",
        lastTestedAt: null,
        lastTestResult: null,
      });
    }

    if (method === "PUT" && url.pathname === "/api/integrations/intune") {
      return jsonResponse({ ok: true });
    }

    if (method === "POST" && url.pathname === "/api/integrations/intune/test") {
      return jsonResponse({ ok: true, message: "Connected successfully" });
    }

    if (method === "GET" && url.pathname === "/api/integrations/openai") {
      return jsonResponse({
        configured: false,
        lastTestedAt: null,
        lastTestResult: null,
      });
    }

    if (method === "PUT" && url.pathname === "/api/integrations/openai") {
      return jsonResponse({ ok: true });
    }

    if (method === "POST" && url.pathname === "/api/integrations/openai/test") {
      return jsonResponse({ ok: true, message: "Connected successfully" });
    }

    if (method === "GET" && url.pathname === "/api/settings") {
      return jsonResponse({});
    }

    if (method === "PUT" && url.pathname === "/api/settings") {
      return jsonResponse({ ok: true });
    }

    if (method === "POST" && url.pathname === "/api/ingest/run") {
      return jsonResponse({ runId: "mock-run-id" });
    }

    if (method === "GET" && url.pathname === "/api/ingest/status") {
      return jsonResponse({ run: null });
    }

    return {
      status: 404,
      headers: {
        "content-type": "text/plain",
      },
      text: `No mock handler for ${method} ${url.pathname}`,
    };
  }

  async function fetch(input: RequestInfo | URL, init?: RequestInit) {
    const target = input instanceof Request ? input.url : input;
    const descriptor = await handleRequest(target, {
      method: init?.method ?? (input instanceof Request ? input.method : undefined),
      body: await readRequestBody(input, init),
    });
    const headers = new Headers(descriptor.headers);

    if (descriptor.status === 204) {
      return new Response(null, { status: 204, headers });
    }

    const body = descriptor.json !== undefined ? JSON.stringify(descriptor.json) : descriptor.text ?? "";
    return new Response(body, { status: descriptor.status, headers });
  }

  return {
    requestLog,
    handleRequest,
    fetch,
  };
}
