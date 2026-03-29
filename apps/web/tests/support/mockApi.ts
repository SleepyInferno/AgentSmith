import type { Page, Route } from "@playwright/test";

type MockOperatorAppOptions = {
  authenticated?: boolean;
  docsReviewFails?: boolean;
  logoutFails?: boolean;
};

type LifecycleRunDetail = {
  runId: string;
  templateKey: string;
  templateVersion: number;
  kind: string;
  subjectDisplayName: string;
  subjectEmail: string | null;
  requestedBy: string;
  status: string;
  startedAt: string;
  closedAt: string | null;
  updatedAt: string;
  groups: Array<{
    groupKey: string;
    title: string;
    position: number;
    steps: Array<{
      stepId: string;
      title: string;
      instructions: string;
      groupKey: string;
      position: number;
      status: string;
      statusReason: string | null;
      note: string | null;
      ticketId: string | null;
      assetId: string | null;
      mailboxRef: string | null;
      handoffRef: string | null;
      completedAt: string | null;
    }>;
  }>;
};

type DocumentationDetail = {
  dataMode: string;
  writeBoundary: string;
  documentId: string;
  title: string;
  kind: string;
  summary: string | null;
  contentText: string;
  reviewState: string;
  reviewDueAt: string | null;
  lastReviewedAt: string | null;
  sourceUpdatedAt: string | null;
  contentUpdatedAt: string | null;
  metadataTags: Array<{
    dimension: string;
    valueKey: string;
    valueLabel: string;
  }>;
  linkedSystems: Array<{
    systemId: string;
    systemName: string;
    relationshipLabel: string;
    category: string | null;
    ownerTeam: string | null;
    criticality: string | null;
  }>;
  history: Array<{
    revisionId: string;
    revisionType: string;
    summary: string;
    changedFields: string[];
    actorLabel: string | null;
    reviewState: string;
    reviewDueAt: string | null;
    createdAt: string;
  }>;
  metadataCatalog: {
    sites: Array<{ dimension: string; valueKey: string; valueLabel: string }>;
    owners: Array<{ dimension: string; valueKey: string; valueLabel: string }>;
    categories: Array<{ dimension: string; valueKey: string; valueLabel: string }>;
    systems: Array<{
      systemId: string;
      systemName: string;
      category: string | null;
      ownerTeam: string | null;
      criticality: string | null;
    }>;
  };
  suggestedNextStep: string | null;
};

type MockState = {
  deviceInventory: Array<Record<string, unknown>>;
  deviceDetails: Record<string, Record<string, unknown>>;
  connectors: Array<Record<string, unknown>>;
  auditEvents: Array<Record<string, unknown>>;
  lifecycleTemplates: Array<Record<string, unknown>>;
  lifecycleRuns: Record<string, LifecycleRunDetail>;
  nextLifecycleRunId: number;
  networkFindings: Array<Record<string, unknown>>;
  networkMap: Record<string, unknown>;
  networkInventory: Array<Record<string, unknown>>;
  networkDetails: Record<string, Record<string, unknown>>;
  backupOverview: Record<string, unknown>;
  backupFindings: Array<Record<string, unknown>>;
  backupInventory: Array<Record<string, unknown>>;
  backupDetails: Record<string, Record<string, unknown>>;
  docsOverview: Record<string, unknown>;
  docsSearch: Record<string, unknown>;
  docsDetails: Record<string, DocumentationDetail>;
  nextDocHistoryId: number;
};

export async function mockOperatorApp(page: Page, options: MockOperatorAppOptions = {}) {
  const state = createMockState();
  let isAuthenticated = options.authenticated !== false;

  await page.route("**/auth/logout", async (route) => {
    if (options.logoutFails) {
      return json(route, { message: "Sign-out failed" }, 500);
    }

    isAuthenticated = false;

    return route.fulfill({
      status: 204,
      body: "",
    });
  });

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;
    const method = route.request().method();

    if (pathname === "/api/me") {
      if (!isAuthenticated) {
        return json(route, { authenticated: false }, 401);
      }

      return json(route, {
        authenticated: true,
        user: {
          id: "user-1",
          email: "operator@example.com",
          displayName: "Operator One",
        },
      });
    }

    return handleApiRoute(route, pathname, searchParams, method, state, options);
  });
}

async function handleApiRoute(
  route: Route,
  pathname: string,
  searchParams: URLSearchParams,
  method: string,
  state: MockState,
  options: MockOperatorAppOptions,
) {
  if (pathname === "/api/connectors" && method === "GET") {
    return json(route, state.connectors);
  }

  if (pathname === "/api/audit-events" && method === "GET") {
    return json(route, state.auditEvents);
  }

  if (pathname === "/api/assets/devices" && method === "GET") {
    return json(route, { items: state.deviceInventory });
  }

  if (pathname.startsWith("/api/assets/devices/") && method === "GET") {
    const deviceId = pathname.replace("/api/assets/devices/", "");
    const detail = state.deviceDetails[deviceId];
    return detail ? json(route, detail) : json(route, { message: "Device not found" }, 404);
  }

  if (pathname === "/api/lifecycle/templates" && method === "GET") {
    return json(route, { items: state.lifecycleTemplates });
  }

  if (pathname === "/api/lifecycle/runs" && method === "GET") {
    return json(route, { items: Object.values(state.lifecycleRuns).map(toLifecycleRunListItem) });
  }

  if (pathname === "/api/lifecycle/runs" && method === "POST") {
    return handleLifecycleStart(route, state);
  }

  if (pathname.startsWith("/api/lifecycle/runs/") && pathname.endsWith("/summary") && method === "GET") {
    const runId = pathname.replace("/api/lifecycle/runs/", "").replace("/summary", "");
    const detail = state.lifecycleRuns[runId];
    return detail ? json(route, buildLifecycleSummary(detail)) : json(route, { message: "Lifecycle run not found" }, 404);
  }

  if (pathname.startsWith("/api/lifecycle/runs/") && pathname.endsWith("/close") && method === "POST") {
    return handleLifecycleClose(route, pathname, state);
  }

  if (pathname.includes("/steps/") && method === "PATCH") {
    return handleLifecycleStepUpdate(route, pathname, state);
  }

  if (pathname.startsWith("/api/lifecycle/runs/") && method === "GET") {
    const runId = pathname.replace("/api/lifecycle/runs/", "");
    const detail = state.lifecycleRuns[runId];
    return detail ? json(route, detail) : json(route, { message: "Lifecycle run not found" }, 404);
  }

  if (pathname === "/api/network/findings" && method === "GET") {
    return json(route, { dataMode: "seeded_example", items: state.networkFindings });
  }

  if (pathname === "/api/network/map" && method === "GET") {
    return json(route, state.networkMap);
  }

  if (pathname === "/api/network/resources" && method === "GET") {
    return json(route, { dataMode: "seeded_example", items: state.networkInventory });
  }

  if (pathname.startsWith("/api/network/resources/") && method === "GET") {
    const resourceId = pathname.replace("/api/network/resources/", "");
    const detail = state.networkDetails[resourceId];
    return detail ? json(route, detail) : json(route, { message: "Network resource not found" }, 404);
  }

  if (pathname === "/api/backup/overview" && method === "GET") {
    return json(route, state.backupOverview);
  }

  if (pathname === "/api/backup/findings" && method === "GET") {
    return json(route, { dataMode: "seeded_example", isReadOnly: true, items: state.backupFindings });
  }

  if (pathname === "/api/backup/systems" && method === "GET") {
    return json(route, { dataMode: "seeded_example", isReadOnly: true, items: state.backupInventory });
  }

  if (pathname.startsWith("/api/backup/systems/") && method === "GET") {
    const systemId = pathname.replace("/api/backup/systems/", "");
    const detail = state.backupDetails[systemId];
    return detail ? json(route, detail) : json(route, { message: "Backup system not found" }, 404);
  }

  if (pathname === "/api/docs/overview" && method === "GET") {
    return json(route, state.docsOverview);
  }

  if (pathname === "/api/docs/search" && method === "GET") {
    return json(route, {
      ...state.docsSearch,
      filters: {
        q: searchParams.get("q") ?? undefined,
        kind: searchParams.get("kind") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        site: searchParams.get("site") ?? undefined,
        owner: searchParams.get("owner") ?? undefined,
        systemId: searchParams.get("systemId") ?? undefined,
        reviewState: searchParams.get("reviewState") ?? undefined,
        staleOnly: searchParams.get("staleOnly") === "true" ? true : undefined,
      },
    });
  }

  if (pathname.startsWith("/api/docs/") && pathname.endsWith("/metadata-review") && method === "POST") {
    return handleDocsReview(route, pathname, state, options);
  }

  if (pathname.startsWith("/api/docs/") && method === "GET") {
    const documentId = pathname.replace("/api/docs/", "");
    const detail = state.docsDetails[documentId];
    return detail ? json(route, detail) : json(route, { message: "Documentation record not found" }, 404);
  }

  return json(route, { message: `Unhandled mock route: ${method} ${pathname}` }, 500);
}

function readBody(route: Route) {
  return route.request().postDataJSON() as Record<string, unknown>;
}

function nowIso() {
  return new Date().toISOString();
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").sort((left, right) => left.localeCompare(right))
    : [];
}

function buildMetadataTags(dimension: string, values: string[]) {
  return values.map((value) => ({
    dimension,
    valueKey: value.toLowerCase().replace(/\s+/g, "-"),
    valueLabel: value,
  }));
}

function getMetadataLabels(detail: DocumentationDetail, dimension: string) {
  return detail.metadataTags
    .filter((tag) => tag.dimension === dimension)
    .map((tag) => tag.valueLabel)
    .sort((left, right) => left.localeCompare(right));
}

function sameValues(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function createMockState(): MockState {
  const onboardingTemplate = {
    templateKey: "employee-onboarding",
    kind: "onboarding",
    version: 1,
    title: "Employee onboarding",
    description: "Identity, licensing, access, device, and handoff tracking for new starters.",
    groups: [
      {
        groupKey: "identity",
        title: "Identity setup",
        position: 1,
        steps: [
          {
            stepId: "identity-create-account",
            title: "Create primary account",
            instructions: "Create the user account and confirm sign-in readiness.",
            position: 1,
          },
        ],
      },
      {
        groupKey: "access",
        title: "Access handoff",
        position: 2,
        steps: [
          {
            stepId: "access-confirm-groups",
            title: "Confirm group memberships",
            instructions: "Verify the minimum group access required for day one.",
            position: 1,
          },
        ],
      },
    ],
  };

  const offboardingTemplate = {
    templateKey: "employee-offboarding",
    kind: "offboarding",
    version: 1,
    title: "Employee offboarding",
    description: "Account recovery, device return, mailbox handoff, and follow-up coverage.",
    groups: [
      {
        groupKey: "access",
        title: "Account recovery",
        position: 1,
        steps: [
          {
            stepId: "access-disable-account",
            title: "Disable primary account",
            instructions: "Disable sign-in and capture the ticket reference.",
            position: 1,
          },
        ],
      },
      {
        groupKey: "handoff",
        title: "Handoff",
        position: 2,
        steps: [
          {
            stepId: "handoff-transfer-mailbox",
            title: "Transfer mailbox ownership",
            instructions: "Confirm mailbox and shared access handoff.",
            position: 1,
          },
        ],
      },
    ],
  };

  const initialRun: LifecycleRunDetail = {
    runId: "run-1",
    templateKey: "employee-offboarding",
    templateVersion: 1,
    kind: "offboarding",
    subjectDisplayName: "Alex Morgan",
    subjectEmail: "alex.morgan@contoso.example",
    requestedBy: "Operator review queue",
    status: "active",
    startedAt: "2026-03-28T13:30:00.000Z",
    closedAt: null,
    updatedAt: "2026-03-28T13:45:00.000Z",
    groups: [
      {
        groupKey: "access",
        title: "Account recovery",
        position: 1,
        steps: [
          {
            stepId: "access-disable-account",
            title: "Disable primary account",
            instructions: "Disable sign-in and capture the ticket reference.",
            groupKey: "access",
            position: 1,
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
        groupKey: "handoff",
        title: "Handoff",
        position: 2,
        steps: [
          {
            stepId: "handoff-transfer-mailbox",
            title: "Transfer mailbox ownership",
            instructions: "Confirm mailbox and shared access handoff.",
            groupKey: "handoff",
            position: 1,
            status: "manual",
            statusReason: null,
            note: "Shared mailbox handed to manager.",
            ticketId: "TCK-9001",
            assetId: null,
            mailboxRef: "shared-support",
            handoffRef: "HD-44",
            completedAt: "2026-03-28T13:40:00.000Z",
          },
        ],
      },
    ],
  };

  const documentationDetail: DocumentationDetail = {
    dataMode: "seeded_example",
    writeBoundary: "metadata_review_only",
    documentId: "doc-m365-break-glass",
    title: "M365 Break Glass Procedure",
    kind: "recovery_procedure",
    summary: "Emergency access recovery steps for the tenant break-glass accounts.",
    contentText: "Validate break-glass access, rotate credentials, and capture ticket evidence.",
    reviewState: "overdue",
    reviewDueAt: "2026-03-15T00:00:00.000Z",
    lastReviewedAt: "2026-02-15T00:00:00.000Z",
    sourceUpdatedAt: "2026-03-20T09:30:00.000Z",
    contentUpdatedAt: "2026-03-21T08:00:00.000Z",
    metadataTags: [
      { dimension: "category", valueKey: "recovery", valueLabel: "Recovery" },
      { dimension: "site", valueKey: "cloud", valueLabel: "Cloud" },
      { dimension: "owner", valueKey: "identity-ops", valueLabel: "Identity Operations" },
    ],
    linkedSystems: [
      {
        systemId: "sys-sharepoint-tenant",
        systemName: "SharePoint Tenant",
        relationshipLabel: "Protects",
        category: "Collaboration",
        ownerTeam: "Identity Operations",
        criticality: "critical",
      },
    ],
    history: [
      {
        revisionId: "rev-1",
        revisionType: "metadata_review",
        summary: "Reviewed after tenant policy update.",
        changedFields: ["reviewDueAt"],
        actorLabel: "Operator One",
        reviewState: "overdue",
        reviewDueAt: "2026-03-15T00:00:00.000Z",
        createdAt: "2026-02-15T00:00:00.000Z",
      },
    ],
    metadataCatalog: {
      sites: [
        { dimension: "site", valueKey: "cloud", valueLabel: "Cloud" },
        { dimension: "site", valueKey: "hq", valueLabel: "HQ" },
      ],
      owners: [
        { dimension: "owner", valueKey: "identity-ops", valueLabel: "Identity Operations" },
        { dimension: "owner", valueKey: "infrastructure", valueLabel: "Infrastructure" },
      ],
      categories: [
        { dimension: "category", valueKey: "recovery", valueLabel: "Recovery" },
        { dimension: "category", valueKey: "identity", valueLabel: "Identity" },
      ],
      systems: [
        {
          systemId: "sys-sharepoint-tenant",
          systemName: "SharePoint Tenant",
          category: "Collaboration",
          ownerTeam: "Identity Operations",
          criticality: "critical",
        },
        {
          systemId: "sys-entra-admin",
          systemName: "Entra Admin Portal",
          category: "Identity",
          ownerTeam: "Identity Operations",
          criticality: "critical",
        },
      ],
    },
    suggestedNextStep: "Review whether the recovery checklist still matches current tenant policy.",
  };

  return {
    deviceInventory: [
      {
        deviceId: "agentsmith-1",
        deviceName: "HQ-LT-01",
        ownerDisplayName: "Jordan Lee",
        department: "Operations",
        site: "HQ",
        operatingSystem: "Windows 11",
        encryptionStatus: "missing",
        antivirusStatus: "healthy",
        patchStatus: "warning",
        lastCheckInAt: "2026-03-27T15:00:00.000Z",
        riskScore: 91,
        riskLevel: "critical",
        summary: "Encryption is missing and the device has not checked in recently.",
        signals: [
          {
            code: "missing_encryption",
            label: "Missing encryption",
            severity: "critical",
            explanation: "BitLocker compliance was not reported by the source inventory.",
          },
        ],
        sourceFreshnessState: "warning",
      },
    ],
    deviceDetails: {
      "agentsmith-1": {
        deviceId: "agentsmith-1",
        deviceName: "HQ-LT-01",
        ownerDisplayName: "Jordan Lee",
        ownerEmail: "jordan.lee@contoso.example",
        department: "Operations",
        site: "HQ",
        operatingSystem: "Windows 11",
        encryptionStatus: "missing",
        antivirusStatus: "healthy",
        patchStatus: "warning",
        lastCheckInAt: "2026-03-27T15:00:00.000Z",
        riskScore: 91,
        riskLevel: "critical",
        summary: "Encryption is missing and the device has not checked in recently.",
        signals: [
          {
            code: "missing_encryption",
            label: "Missing encryption",
            severity: "critical",
            explanation: "BitLocker compliance was not reported by the source inventory.",
          },
        ],
        sourceFreshnessState: "warning",
        diskFreePercent: 12,
        deviceAgeDays: 940,
        supportStatus: "aging",
        serialNumber: "AS-0001",
        complianceState: "noncompliant",
        sourceSystem: "intune",
        sourceId: "intune-asset-1",
        calculatedAt: "2026-03-28T12:00:00.000Z",
        queueRank: 1,
      },
    },
    connectors: [
      {
        id: "entra",
        label: "Microsoft Entra ID",
        health: "healthy",
        freshnessState: "healthy",
        lastSuccessfulSyncAt: "2026-03-28T11:45:00.000Z",
        lastAttemptedSyncAt: "2026-03-28T11:45:00.000Z",
        lastResult: "Completed",
      },
      {
        id: "intune",
        label: "Microsoft Intune",
        health: "warning",
        freshnessState: "warning",
        lastSuccessfulSyncAt: "2026-03-28T10:15:00.000Z",
        lastAttemptedSyncAt: "2026-03-28T11:30:00.000Z",
        lastResult: "Rate limited",
      },
    ],
    auditEvents: [
      {
        timestamp: "2026-03-28T12:15:00.000Z",
        action: "docs.metadata.reviewed",
        actorId: "user-1",
        targetType: "document",
        targetId: "doc-m365-break-glass",
        result: "success",
        metadata: {
          changedFields: "reviewDueAt",
          actorLabel: "Operator One",
        },
      },
      {
        timestamp: "2026-03-28T11:00:00.000Z",
        action: "auth.login",
        actorId: "user-1",
        targetType: "session",
        targetId: "session-1",
        result: "success",
        metadata: {
          provider: "microsoft-entra-id",
        },
      },
    ],
    lifecycleTemplates: [onboardingTemplate, offboardingTemplate],
    lifecycleRuns: {
      "run-1": initialRun,
    },
    nextLifecycleRunId: 2,
    networkFindings: [
      {
        dataMode: "seeded_example",
        findingId: "nf-1",
        resourceId: "firewall-hq-01",
        resourceName: "Firewall HQ 01",
        resourceKind: "firewall",
        kind: "offline",
        severity: "high",
        queueRank: 1,
        siteName: "HQ",
        scopeLabel: "HQ edge",
        operationalStatus: "offline",
        freshnessState: "stale",
        lastSeenAt: "2026-03-28T10:20:00.000Z",
        summary: "Firewall HQ 01 lost heartbeat and needs operator review.",
        suggestedNextStep: "Confirm the uplink state and validate whether the outage is expected.",
      },
    ],
    networkMap: {
      dataMode: "seeded_example",
      sites: [
        {
          siteName: "HQ",
          resourceIds: ["site-hq", "wan-hq-01", "lan-hq-core", "firewall-hq-01"],
          relationshipCount: 3,
          freshnessState: "healthy",
        },
      ],
      resources: [
        {
          resourceId: "site-hq",
          resourceName: "HQ",
          resourceKind: "site",
          siteName: "HQ",
          operationalStatus: "online",
          freshnessState: "healthy",
          lastSeenAt: "2026-03-28T11:00:00.000Z",
        },
        {
          resourceId: "wan-hq-01",
          resourceName: "HQ MPLS",
          resourceKind: "wan_link",
          siteName: "HQ",
          operationalStatus: "online",
          freshnessState: "healthy",
          lastSeenAt: "2026-03-28T11:00:00.000Z",
        },
        {
          resourceId: "lan-hq-core",
          resourceName: "HQ Core LAN",
          resourceKind: "lan_segment",
          siteName: "HQ",
          operationalStatus: "online",
          freshnessState: "healthy",
          lastSeenAt: "2026-03-28T11:00:00.000Z",
        },
        {
          resourceId: "firewall-hq-01",
          resourceName: "Firewall HQ 01",
          resourceKind: "firewall",
          siteName: "HQ",
          operationalStatus: "offline",
          freshnessState: "stale",
          lastSeenAt: "2026-03-28T10:20:00.000Z",
        },
      ],
      relationships: [
        {
          relationshipId: "rel-1",
          fromResourceId: "site-hq",
          toResourceId: "wan-hq-01",
          relationship: "connects_to",
          confidence: "confirmed",
          lastSeenAt: "2026-03-28T11:00:00.000Z",
        },
        {
          relationshipId: "rel-2",
          fromResourceId: "wan-hq-01",
          toResourceId: "firewall-hq-01",
          relationship: "feeds",
          confidence: "inferred",
          lastSeenAt: "2026-03-28T11:00:00.000Z",
        },
        {
          relationshipId: "rel-3",
          fromResourceId: "firewall-hq-01",
          toResourceId: "lan-hq-core",
          relationship: "protects",
          confidence: "confirmed",
          lastSeenAt: "2026-03-28T11:00:00.000Z",
        },
      ],
    },
    networkInventory: [
      {
        dataMode: "seeded_example",
        resourceId: "firewall-hq-01",
        resourceName: "Firewall HQ 01",
        resourceKind: "firewall",
        siteName: "HQ",
        operationalStatus: "offline",
        freshnessState: "stale",
        lastSeenAt: "2026-03-28T10:20:00.000Z",
        managementIp: "10.0.0.1",
        cidr: null,
        ownerLabel: "Infrastructure",
        summary: "Primary edge firewall for HQ.",
      },
      {
        dataMode: "seeded_example",
        resourceId: "wan-hq-01",
        resourceName: "HQ MPLS",
        resourceKind: "wan_link",
        siteName: "HQ",
        operationalStatus: "online",
        freshnessState: "healthy",
        lastSeenAt: "2026-03-28T11:00:00.000Z",
        managementIp: null,
        cidr: "10.0.0.0/24",
        ownerLabel: "Carrier",
        summary: "Primary WAN circuit for HQ.",
      },
    ],
    networkDetails: {
      "firewall-hq-01": {
        dataMode: "seeded_example",
        resourceId: "firewall-hq-01",
        resourceName: "Firewall HQ 01",
        resourceKind: "firewall",
        siteName: "HQ",
        operationalStatus: "offline",
        freshnessState: "stale",
        lastSeenAt: "2026-03-28T10:20:00.000Z",
        managementIp: "10.0.0.1",
        cidr: null,
        ownerLabel: "Infrastructure",
        scopeSummary: "HQ edge firewall with one inferred upstream WAN dependency.",
        summary: "Primary edge firewall for HQ.",
        suggestedNextStep: "Confirm whether the edge circuit or the firewall itself is down.",
        findings: [
          {
            dataMode: "seeded_example",
            findingId: "nf-1",
            resourceId: "firewall-hq-01",
            resourceName: "Firewall HQ 01",
            resourceKind: "firewall",
            kind: "offline",
            severity: "high",
            queueRank: 1,
            siteName: "HQ",
            scopeLabel: "HQ edge",
            operationalStatus: "offline",
            freshnessState: "stale",
            lastSeenAt: "2026-03-28T10:20:00.000Z",
            summary: "Firewall HQ 01 lost heartbeat and needs operator review.",
            suggestedNextStep: "Confirm the uplink state and validate whether the outage is expected.",
          },
        ],
        relatedResources: [
          {
            resourceId: "wan-hq-01",
            resourceName: "HQ MPLS",
            resourceKind: "wan_link",
            siteName: "HQ",
            operationalStatus: "online",
            freshnessState: "healthy",
            lastSeenAt: "2026-03-28T11:00:00.000Z",
            relationship: "feeds",
            confidence: "inferred",
            direction: "incoming",
          },
        ],
      },
    },
    backupOverview: {
      dataMode: "seeded_example",
      generatedAt: "2026-03-28T11:30:00.000Z",
      summary: "Backup review posture",
      cards: [
        { key: "high_risk", label: "High risk", value: 1, tone: "high_risk", summary: "Missing backup coverage" },
        { key: "watch", label: "Watch", value: 1, tone: "watch", summary: "Restore proof is stale" },
        { key: "unknown", label: "Unknown", value: 0, tone: "unknown", summary: "Telemetry unavailable" },
      ],
      findings: [],
      sourceHealth: [
        {
          providerKey: "veeam",
          providerLabel: "Veeam",
          state: "current",
          connectorFreshnessState: "current",
          lastObservedAt: "2026-03-28T11:25:00.000Z",
          systemsObserved: 12,
          workloadsObserved: 18,
          summary: "Provider telemetry is current",
          dataMode: "seeded_example",
        },
      ],
      isReadOnly: true,
    },
    backupFindings: [
      {
        dataMode: "seeded_example",
        findingId: "bf-1",
        queueRank: 1,
        systemId: "sys-branch-nas",
        systemName: "Branch File Server",
        category: "file_service",
        siteName: "Branch",
        providerKey: "veeam",
        coverageState: "missing",
        confidenceState: "high_risk",
        matchingConfidence: "confirmed",
        lastSuccessfulBackupAt: null,
        lastRestoreTestAt: null,
        evidenceSource: "provider_sync",
        summary: "Expected backup coverage is missing for this system.",
        suggestedNextStep: "Confirm whether this server is intentionally out of scope or missing protection.",
        sourceHealth: {
          providerKey: "veeam",
          providerLabel: "Veeam",
          state: "current",
          connectorFreshnessState: "current",
          lastObservedAt: "2026-03-28T11:25:00.000Z",
          systemsObserved: 12,
          workloadsObserved: 18,
          summary: "Provider telemetry is current",
          dataMode: "seeded_example",
        },
        isReadOnly: true,
        workloadKind: "vm",
      },
    ],
    backupInventory: [
      {
        dataMode: "seeded_example",
        systemId: "sys-branch-nas",
        systemName: "Branch File Server",
        category: "file_service",
        siteName: "Branch",
        providerKey: "veeam",
        coverageState: "missing",
        confidenceState: "high_risk",
        matchingConfidence: "confirmed",
        lastSuccessfulBackupAt: null,
        lastRestoreTestAt: null,
        evidenceSource: "provider_sync",
        summary: "Expected backup coverage is missing for this system.",
        suggestedNextStep: "Confirm whether this server is intentionally out of scope or missing protection.",
        sourceHealth: {
          providerKey: "veeam",
          providerLabel: "Veeam",
          state: "current",
          connectorFreshnessState: "current",
          lastObservedAt: "2026-03-28T11:25:00.000Z",
          systemsObserved: 12,
          workloadsObserved: 18,
          summary: "Provider telemetry is current",
          dataMode: "seeded_example",
        },
        isReadOnly: true,
        workloadKind: "vm",
        backupFreshnessState: "missing",
        restoreFreshnessState: "missing",
      },
    ],
    backupDetails: {
      "sys-branch-nas": {
        dataMode: "seeded_example",
        systemId: "sys-branch-nas",
        systemName: "Branch File Server",
        category: "file_service",
        siteName: "Branch",
        providerKey: "veeam",
        coverageState: "missing",
        confidenceState: "high_risk",
        matchingConfidence: "confirmed",
        lastSuccessfulBackupAt: null,
        lastRestoreTestAt: null,
        evidenceSource: "provider_sync",
        summary: "Expected backup coverage is missing for this system.",
        suggestedNextStep: "Confirm whether this server is intentionally out of scope or missing protection.",
        sourceHealth: [
          {
            providerKey: "veeam",
            providerLabel: "Veeam",
            state: "current",
            connectorFreshnessState: "current",
            lastObservedAt: "2026-03-28T11:25:00.000Z",
            systemsObserved: 12,
            workloadsObserved: 18,
            summary: "Provider telemetry is current",
            dataMode: "seeded_example",
          },
        ],
        isReadOnly: true,
        scopeSummary: "Branch file server. Policy window: backup freshness target 24h, restore proof target 30d, grace window 6h.",
        providerEvidence: [
          {
            evidenceId: "be-1",
            providerKey: "veeam",
            workloadKind: "vm",
            sourceSystem: "veeam",
            sourceId: "veeam-1",
            coverageState: "missing",
            backupFreshnessState: "missing",
            connectorFreshnessState: "current",
            confidenceState: "high_risk",
            lastSuccessfulBackupAt: null,
            lastFailedBackupAt: "2026-03-28T02:15:00.000Z",
            lastObservedAt: "2026-03-28T11:25:00.000Z",
            summary: "The provider sees the system but no current protected workload is attached.",
            metadata: null,
          },
        ],
        restoreProofs: [],
      },
    },
    docsOverview: {
      dataMode: "seeded_example",
      generatedAt: "2026-03-28T11:00:00.000Z",
      summary: "Documentation review posture",
      writeBoundary: "metadata_review_only",
      cards: [
        { key: "review_overdue", label: "review_overdue", value: 1, tone: "high_risk", summary: "Past due" },
        { key: "metadata_incomplete", label: "metadata_incomplete", value: 0, tone: "neutral", summary: "Complete" },
        { key: "recent_change", label: "recent_change", value: 1, tone: "watch", summary: "Needs re-review" },
      ],
      queue: [
        {
          queueId: "dq-1",
          documentId: "doc-m365-break-glass",
          title: "M365 Break Glass Procedure",
          kind: "recovery_procedure",
          reviewState: "overdue",
          reviewDueAt: "2026-03-15T00:00:00.000Z",
          lastReviewedAt: "2026-02-15T00:00:00.000Z",
          sourceUpdatedAt: "2026-03-20T09:30:00.000Z",
          contentUpdatedAt: "2026-03-21T08:00:00.000Z",
          summary: "Emergency access recovery steps for the tenant break-glass accounts.",
          focusReason: {
            code: "review_overdue",
            label: "Review overdue",
            summary: "The review date is in the past.",
          },
          suggestedNextStep: "Confirm the emergency access sequence still matches the tenant.",
          queueRank: 1,
          metadataTags: documentationDetail.metadataTags,
          linkedSystems: documentationDetail.linkedSystems,
        },
      ],
    },
    docsSearch: {
      dataMode: "seeded_example",
      generatedAt: "2026-03-28T11:00:00.000Z",
      summary: "Search coverage",
      writeBoundary: "metadata_review_only",
      filters: {},
      facets: {
        kinds: [{ value: "recovery_procedure", label: "Recovery procedure", count: 1 }],
        reviewStates: [{ value: "overdue", label: "Overdue", count: 1 }],
        sites: [{ value: "Cloud", label: "Cloud", count: 1 }],
        owners: [{ value: "Identity Operations", label: "Identity Operations", count: 1 }],
        categories: [{ value: "Recovery", label: "Recovery", count: 1 }],
        systems: [{ value: "sys-sharepoint-tenant", label: "SharePoint Tenant", count: 1 }],
      },
      results: [
        {
          documentId: "doc-m365-break-glass",
          title: "M365 Break Glass Procedure",
          kind: "recovery_procedure",
          summary: "Emergency access recovery steps for the tenant break-glass accounts.",
          reviewState: "overdue",
          reviewDueAt: "2026-03-15T00:00:00.000Z",
          lastReviewedAt: "2026-02-15T00:00:00.000Z",
          sourceUpdatedAt: "2026-03-20T09:30:00.000Z",
          contentUpdatedAt: "2026-03-21T08:00:00.000Z",
          matchedExcerpt: "Validate break-glass access before rotating credentials.",
          relevanceScore: 0.98,
          reasons: [
            {
              code: "review_overdue",
              label: "Review overdue",
              summary: "The review date is in the past.",
            },
          ],
          metadataTags: documentationDetail.metadataTags,
          linkedSystems: documentationDetail.linkedSystems,
          suggestedNextStep: "Review whether the recovery checklist still matches current tenant policy.",
        },
      ],
      total: 1,
    },
    docsDetails: {
      "doc-m365-break-glass": documentationDetail,
    },
    nextDocHistoryId: 2,
  };
}

function buildLifecycleSummary(_detail: LifecycleRunDetail) {
  const detail = _detail;
  const steps = detail.groups.flatMap((group) => group.steps);
  const unresolvedFollowUps = steps
    .filter((step) => ["pending", "blocked", "skipped"].includes(step.status))
    .map((step) => ({
      stepId: step.stepId,
      title: step.title,
      groupKey: step.groupKey,
      status: step.status,
      statusReason: step.statusReason,
    }));

  return {
    completedCount: steps.filter((step) => step.status === "manual" || step.status === "automated").length,
    manualCount: steps.filter((step) => step.status === "manual").length,
    skippedCount: steps.filter((step) => step.status === "skipped").length,
    blockedCount: steps.filter((step) => step.status === "blocked").length,
    unresolvedFollowUps,
    groups: detail.groups.map((group) => ({
      groupKey: group.groupKey,
      title: group.title,
      pendingCount: group.steps.filter((step) => step.status === "pending").length,
      completedCount: group.steps.filter((step) => step.status === "manual" || step.status === "automated").length,
      manualCount: group.steps.filter((step) => step.status === "manual").length,
      skippedCount: group.steps.filter((step) => step.status === "skipped").length,
      blockedCount: group.steps.filter((step) => step.status === "blocked").length,
      unresolvedCount: group.steps.filter((step) => ["pending", "blocked", "skipped"].includes(step.status)).length,
    })),
  };
}

function toLifecycleRunListItem(_detail: LifecycleRunDetail) {
  const detail = _detail;

  return {
    runId: detail.runId,
    templateKey: detail.templateKey,
    templateVersion: detail.templateVersion,
    kind: detail.kind,
    subjectDisplayName: detail.subjectDisplayName,
    subjectEmail: detail.subjectEmail,
    requestedBy: detail.requestedBy,
    status: detail.status,
    startedAt: detail.startedAt,
    closedAt: detail.closedAt,
    updatedAt: detail.updatedAt,
  };
}

function handleLifecycleStart(_route: Route, _state: MockState) {
  const route = _route;
  const state = _state;
  const body = readBody(route);
  const template = state.lifecycleTemplates.find((item) => item.templateKey === body.templateKey);

  if (!template) {
    return json(route, { message: "Lifecycle template not found" }, 404);
  }

  const runId = `run-${state.nextLifecycleRunId++}`;
  const now = nowIso();
  const detail: LifecycleRunDetail = {
    runId,
    templateKey: String(template.templateKey),
    templateVersion: Number(template.version),
    kind: String(template.kind),
    subjectDisplayName: String(body.subjectDisplayName ?? ""),
    subjectEmail: typeof body.subjectEmail === "string" ? body.subjectEmail : null,
    requestedBy: String(body.requestedBy ?? "Operator review queue"),
    status: "active",
    startedAt: now,
    closedAt: null,
    updatedAt: now,
    groups: (template.groups as Array<Record<string, unknown>>).map((group) => ({
      groupKey: String(group.groupKey),
      title: String(group.title),
      position: Number(group.position),
      steps: (group.steps as Array<Record<string, unknown>>).map((step) => ({
        stepId: String(step.stepId),
        title: String(step.title),
        instructions: String(step.instructions),
        groupKey: String(group.groupKey),
        position: Number(step.position),
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

  state.lifecycleRuns[runId] = detail;
  return json(route, detail);
}

function handleLifecycleClose(_route: Route, _pathname: string, _state: MockState) {
  const route = _route;
  const pathname = _pathname;
  const state = _state;
  const runId = pathname.replace("/api/lifecycle/runs/", "").replace("/close", "");
  const detail = state.lifecycleRuns[runId];

  if (!detail) {
    return json(route, { message: "Lifecycle run not found" }, 404);
  }

  detail.status = "completed";
  detail.closedAt = nowIso();
  detail.updatedAt = detail.closedAt;

  return json(route, buildLifecycleSummary(detail));
}

function handleLifecycleStepUpdate(_route: Route, _pathname: string, _state: MockState) {
  const route = _route;
  const pathname = _pathname;
  const state = _state;
  const [, runId, stepId] = pathname.match(/^\/api\/lifecycle\/runs\/([^/]+)\/steps\/([^/]+)$/) ?? [];
  const detail = runId ? state.lifecycleRuns[runId] : undefined;

  if (!detail || !stepId) {
    return json(route, { message: "Lifecycle step not found" }, 404);
  }

  const body = readBody(route);
  if ((body.status === "blocked" || body.status === "skipped") && typeof body.statusReason !== "string") {
    return json(route, { message: "statusReason is required when a step is skipped or blocked." }, 400);
  }

  for (const group of detail.groups) {
    const step = group.steps.find((item) => item.stepId === stepId);

    if (!step) {
      continue;
    }

    step.status = String(body.status);
    step.statusReason = typeof body.statusReason === "string" ? body.statusReason : null;
    step.note = typeof body.note === "string" ? body.note : null;
    step.ticketId = typeof body.ticketId === "string" ? body.ticketId : null;
    step.assetId = typeof body.assetId === "string" ? body.assetId : null;
    step.mailboxRef = typeof body.mailboxRef === "string" ? body.mailboxRef : null;
    step.handoffRef = typeof body.handoffRef === "string" ? body.handoffRef : null;
    step.completedAt = nowIso();
    detail.updatedAt = step.completedAt;

    return json(route, detail);
  }

  return json(route, { message: "Lifecycle step not found" }, 404);
}

function handleDocsReview(
  _route: Route,
  _pathname: string,
  _state: MockState,
  _options: MockOperatorAppOptions,
) {
  const route = _route;
  const pathname = _pathname;
  const state = _state;
  const options = _options;

  if (options.docsReviewFails) {
    return json(route, { message: "Metadata review failed" }, 500);
  }

  const documentId = pathname.replace("/api/docs/", "").replace("/metadata-review", "");
  const detail = state.docsDetails[documentId];

  if (!detail) {
    return json(route, { message: "Documentation record not found" }, 404);
  }

  const body = readBody(route);
  const nextCategoryLabels = toStringArray(body.categoryLabels);
  const nextSiteLabels = toStringArray(body.siteLabels);
  const nextOwnerLabels = toStringArray(body.ownerLabels);
  const nextSystemIds = toStringArray(body.systemIds);
  const nextReviewDueAt = typeof body.reviewDueAt === "string" ? body.reviewDueAt : null;
  const reviewSummary = typeof body.reviewSummary === "string" ? body.reviewSummary.trim() : "";
  const actorLabel = typeof body.actorLabel === "string" ? body.actorLabel.trim() : "";

  if (!reviewSummary || !actorLabel) {
    return json(route, { message: "reviewSummary and actorLabel are required." }, 400);
  }

  const changedFields: string[] = [];
  if (!sameValues(getMetadataLabels(detail, "category"), nextCategoryLabels)) {
    changedFields.push("categoryLabels");
  }
  if (!sameValues(getMetadataLabels(detail, "site"), nextSiteLabels)) {
    changedFields.push("siteLabels");
  }
  if (!sameValues(getMetadataLabels(detail, "owner"), nextOwnerLabels)) {
    changedFields.push("ownerLabels");
  }
  if (!sameValues(detail.linkedSystems.map((item) => item.systemId), nextSystemIds)) {
    changedFields.push("systemIds");
  }
  if ((detail.reviewDueAt ?? null) !== nextReviewDueAt) {
    changedFields.push("reviewDueAt");
  }

  detail.metadataTags = [
    ...buildMetadataTags("category", nextCategoryLabels),
    ...buildMetadataTags("site", nextSiteLabels),
    ...buildMetadataTags("owner", nextOwnerLabels),
  ];
  detail.linkedSystems = detail.metadataCatalog.systems
    .filter((system) => nextSystemIds.includes(system.systemId))
    .map((system) => ({
      systemId: system.systemId,
      systemName: system.systemName,
      relationshipLabel: "Supports",
      category: system.category,
      ownerTeam: system.ownerTeam,
      criticality: system.criticality,
    }));
  detail.reviewDueAt = nextReviewDueAt;
  detail.lastReviewedAt = nowIso();
  detail.reviewState = "current";
  detail.history = [
    {
      revisionId: `rev-${state.nextDocHistoryId++}`,
      revisionType: "metadata_review",
      summary: reviewSummary,
      changedFields,
      actorLabel,
      reviewState: detail.reviewState,
      reviewDueAt: detail.reviewDueAt,
      createdAt: detail.lastReviewedAt,
    },
    ...detail.history,
  ];

  return json(route, {
    documentId,
    changedFields,
    historyEntryId: detail.history[0].revisionId,
    auditAction: "docs.metadata.reviewed",
    reviewDueAt: detail.reviewDueAt,
    lastReviewedAt: detail.lastReviewedAt,
  });
}
