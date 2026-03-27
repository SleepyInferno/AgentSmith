import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type {
  NetworkDataMode,
  NetworkFindingItem,
  NetworkInventoryFilters,
  NetworkInventoryRow,
  NetworkMapResponse,
  NetworkResourceDetail,
} from "../modules/network/network.types.js";
import { buildServer } from "../server.js";

const testEnv: ServerEnv = {
  DATABASE_URL: "postgresql://agentsmith:agentsmith@localhost:5432/agentsmith",
  PORT: 3001,
  WEB_ORIGIN: "http://localhost:3000",
  ENTRA_TENANT_ID: "tenant-id",
  ENTRA_CLIENT_ID: "client-id",
  ENTRA_CLIENT_SECRET: "client-secret",
  ENTRA_REDIRECT_URI: "http://localhost:3001/auth/callback",
  SESSION_SECRET: "session-secret",
};

function makeInventoryRow(dataMode: NetworkDataMode, overrides: Partial<NetworkInventoryRow> = {}): NetworkInventoryRow {
  return {
    resourceId: "firewall-hq-01",
    resourceName: "HQ Edge Firewall",
    resourceKind: "firewall",
    sourceSystem: dataMode,
    sourceId: "firewall-hq-01",
    siteName: "HQ",
    operationalStatus: "offline",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:50:00.000Z",
    managementIp: "10.10.0.1",
    cidr: null,
    ownerLabel: "Network Operations",
    dataMode,
    ...overrides,
  };
}

function makeFindingItem(dataMode: NetworkDataMode, overrides: Partial<NetworkFindingItem> = {}): NetworkFindingItem {
  return {
    findingId: "finding-firewall-offline",
    resourceId: "firewall-hq-01",
    resourceName: "HQ Edge Firewall",
    resourceKind: "firewall",
    kind: "offline_infrastructure",
    severity: "critical",
    queueRank: 1,
    siteName: "HQ",
    scopeLabel: "HQ perimeter",
    operationalStatus: "offline",
    freshnessState: "healthy",
    lastSeenAt: "2026-03-27T11:50:00.000Z",
    summary: "HQ Edge Firewall is offline.",
    suggestedNextStep: "Investigate edge firewall reachability.",
    dataMode,
    ...overrides,
  };
}

function makeMapResponse(dataMode: NetworkDataMode): NetworkMapResponse {
  return {
    dataMode,
    sites: [
      {
        siteName: "HQ",
        resourceIds: ["site-hq", "firewall-hq-01", "wan-primary"],
        relationshipCount: 2,
        freshnessState: "healthy",
      },
      {
        siteName: "Branch Office",
        resourceIds: ["site-branch", "vpn-hub-01"],
        relationshipCount: 1,
        freshnessState: "warning",
      },
    ],
    resources: [
      {
        resourceId: "firewall-hq-01",
        resourceName: "HQ Edge Firewall",
        resourceKind: "firewall",
        siteName: "HQ",
        operationalStatus: "offline",
        freshnessState: "healthy",
        lastSeenAt: "2026-03-27T11:50:00.000Z",
      },
      {
        resourceId: "vpn-hub-01",
        resourceName: "HQ VPN Hub",
        resourceKind: "vpn_service",
        siteName: "HQ",
        operationalStatus: "online",
        freshnessState: "warning",
        lastSeenAt: "2026-03-27T10:45:00.000Z",
      },
    ],
    relationships: [
      {
        relationshipId: "rel-firewall-wan",
        fromResourceId: "firewall-hq-01",
        toResourceId: "wan-primary",
        relationship: "protects_uplink",
        confidence: "confirmed",
        sourceSystem: dataMode,
        lastSeenAt: "2026-03-27T11:50:00.000Z",
      },
      {
        relationshipId: "rel-vpn-wan",
        fromResourceId: "vpn-hub-01",
        toResourceId: "wan-primary",
        relationship: "terminates_vpn",
        confidence: "inferred",
        sourceSystem: dataMode,
        lastSeenAt: "2026-03-27T10:45:00.000Z",
      },
    ],
  };
}

function makeResourceDetail(dataMode: NetworkDataMode): NetworkResourceDetail {
  return {
    dataMode,
    resource: makeInventoryRow(dataMode),
    relatedResources: [
      {
        resourceId: "wan-primary",
        resourceName: "Primary WAN",
        resourceKind: "wan_link",
        siteName: "HQ",
        operationalStatus: "degraded",
        freshnessState: "healthy",
        lastSeenAt: "2026-03-27T11:58:00.000Z",
        relationship: "protects_uplink",
        confidence: "confirmed",
        direction: "outgoing",
      },
      {
        resourceId: "vpn-hub-01",
        resourceName: "HQ VPN Hub",
        resourceKind: "vpn_service",
        siteName: "HQ",
        operationalStatus: "online",
        freshnessState: "warning",
        lastSeenAt: "2026-03-27T10:45:00.000Z",
        relationship: "supports_remote_access",
        confidence: "inferred",
        direction: "incoming",
      },
    ],
    findings: [
      makeFindingItem(dataMode, {
        summary: "HQ Edge Firewall is offline.",
        suggestedNextStep: "Investigate edge firewall reachability.",
      }),
    ],
    scopeSummary: "HQ perimeter coverage includes the primary WAN handoff and remote access path.",
    suggestedNextStep: "Investigate edge firewall reachability.",
  };
}

function makeRepository(dataMode: NetworkDataMode = "seeded_example") {
  const findingItems = [
    makeFindingItem(dataMode),
    makeFindingItem(dataMode, {
      findingId: "finding-branch-gap",
      resourceId: "lan-branch-users",
      resourceName: "Branch Users LAN",
      resourceKind: "lan_segment",
      kind: "topology_gap",
      severity: "watch",
      queueRank: 4,
      siteName: "Branch Office",
      scopeLabel: "Branch Office LAN",
      operationalStatus: "online",
      freshnessState: "warning",
      lastSeenAt: "2026-03-27T09:10:00.000Z",
      summary: "Branch Users LAN lacks a confirmed uplink relationship.",
      suggestedNextStep: "Review site mapping.",
    }),
  ];
  const inventoryRows = [
    makeInventoryRow(dataMode),
    makeInventoryRow(dataMode, {
      resourceId: "vpn-hub-01",
      resourceName: "HQ VPN Hub",
      resourceKind: "vpn_service",
      sourceId: "vpn-hub-01",
      siteName: "HQ",
      operationalStatus: "online",
      freshnessState: "warning",
      lastSeenAt: "2026-03-27T10:45:00.000Z",
      managementIp: "10.10.0.30",
      ownerLabel: null,
    }),
  ];
  let lastLimit: number | null = null;
  let lastFilters: NetworkInventoryFilters | undefined;

  return {
    repository: {
      async listFindings(limit = 10) {
        lastLimit = limit;
        return findingItems.slice(0, limit);
      },
      async listInventory(filters: NetworkInventoryFilters = {}) {
        lastFilters = filters;
        return inventoryRows.filter((row) => {
          if (filters.search && ![row.resourceName, row.siteName, row.operationalStatus].some((value) => value?.includes(filters.search!))) {
            return false;
          }
          if (filters.kind && row.resourceKind !== filters.kind) {
            return false;
          }
          if (filters.siteName && row.siteName !== filters.siteName) {
            return false;
          }
          if (filters.operationalStatus && row.operationalStatus !== filters.operationalStatus) {
            return false;
          }
          if (filters.freshnessState && row.freshnessState !== filters.freshnessState) {
            return false;
          }
          return true;
        });
      },
      async getMap() {
        return makeMapResponse(dataMode);
      },
      async getResourceDetail(resourceId: string) {
        return resourceId === "firewall-hq-01" ? makeResourceDetail(dataMode) : null;
      },
    },
    getLastLimit() {
      return lastLimit;
    },
    getLastFilters() {
      return lastFilters;
    },
  };
}

test("GET /api/network/findings returns ranked findings with resourceId, summary, and suggestedNextStep", async (t) => {
  const network = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    networkRoutes: {
      networkRepository: network.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/network/findings?limit=1",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    items: Array<{ dataMode: string; resourceId: string; summary: string; suggestedNextStep: string }>;
  };

  assert.equal(network.getLastLimit(), 1);
  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.items[0]?.dataMode, "seeded_example");
  assert.equal(body.items[0]?.resourceId, "firewall-hq-01");
  assert.equal(body.items[0]?.summary, "HQ Edge Firewall is offline.");
  assert.equal(body.items[0]?.suggestedNextStep, "Investigate edge firewall reachability.");
});

test("GET /api/network/resources returns typed inventory rows with resourceKind, siteName, and freshnessState", async (t) => {
  const network = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    networkRoutes: {
      networkRepository: network.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/network/resources?search=HQ&kind=firewall&site=HQ&operationalStatus=offline&freshnessState=healthy",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    items: Array<{ dataMode: string; resourceId: string; resourceKind: string; siteName: string | null; freshnessState: string }>;
  };

  assert.deepEqual(network.getLastFilters(), {
    search: "HQ",
    kind: "firewall",
    siteName: "HQ",
    operationalStatus: "offline",
    freshnessState: "healthy",
  });
  assert.equal(body.dataMode, "seeded_example");
  assert.equal(body.items[0]?.dataMode, "seeded_example");
  assert.equal(body.items[0]?.resourceId, "firewall-hq-01");
  assert.equal(body.items[0]?.resourceKind, "firewall");
  assert.equal(body.items[0]?.siteName, "HQ");
  assert.equal(body.items[0]?.freshnessState, "healthy");
});

test("GET /api/network/map returns relationships with both confirmed and inferred confidence values", async (t) => {
  const network = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    networkRoutes: {
      networkRepository: network.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/network/map",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    dataMode: string;
    relationships: Array<{ confidence: string }>;
  };

  assert.equal(body.dataMode, "seeded_example");
  assert.deepEqual(
    body.relationships.map((relationship) => relationship.confidence),
    ["confirmed", "inferred"],
  );
});

test("GET /api/network/resources/:resourceId returns detail scope and 404 on missing resource", async (t) => {
  const network = makeRepository("live");
  const { app } = buildServer({
    env: testEnv,
    networkRoutes: {
      networkRepository: network.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const detailResponse = await app.inject({
    method: "GET",
    url: "/api/network/resources/firewall-hq-01",
  });

  assert.equal(detailResponse.statusCode, 200);
  const detailBody = detailResponse.json() as {
    dataMode: string;
    resourceId: string;
    resourceName: string;
    resourceKind: string;
    siteName: string | null;
    freshnessState: string;
    summary: string;
    suggestedNextStep: string | null;
    scopeSummary: string;
    relatedResources: Array<{ confidence: string }>;
  };

  assert.equal(detailBody.dataMode, "live");
  assert.equal(detailBody.resourceId, "firewall-hq-01");
  assert.equal(detailBody.resourceName, "HQ Edge Firewall");
  assert.equal(detailBody.resourceKind, "firewall");
  assert.equal(detailBody.siteName, "HQ");
  assert.equal(detailBody.freshnessState, "healthy");
  assert.equal(detailBody.summary, "HQ Edge Firewall is offline.");
  assert.equal(detailBody.suggestedNextStep, "Investigate edge firewall reachability.");
  assert.equal(detailBody.scopeSummary.includes("HQ perimeter"), true);
  assert.equal(detailBody.relatedResources[0]?.confidence, "confirmed");
  assert.equal(detailBody.relatedResources[1]?.confidence, "inferred");

  const missingResponse = await app.inject({
    method: "GET",
    url: "/api/network/resources/missing-resource",
  });

  assert.equal(missingResponse.statusCode, 404);
  assert.deepEqual(missingResponse.json(), {
    message: "Network resource not found",
  });
});

test("network route responses surface dataMode as live or seeded_example", async (t) => {
  const seededNetwork = makeRepository("seeded_example");
  const liveNetwork = makeRepository("live");
  const { app: seededApp } = buildServer({
    env: testEnv,
    networkRoutes: {
      networkRepository: seededNetwork.repository,
    },
  });
  const { app: liveApp } = buildServer({
    env: { ...testEnv, PORT: 3002 },
    networkRoutes: {
      networkRepository: liveNetwork.repository,
    },
  });

  t.after(async () => {
    await Promise.all([seededApp.close(), liveApp.close()]);
  });

  const seededResponse = await seededApp.inject({
    method: "GET",
    url: "/api/network/map",
  });
  const liveResponse = await liveApp.inject({
    method: "GET",
    url: "/api/network/resources/firewall-hq-01",
  });

  assert.equal(seededResponse.statusCode, 200);
  assert.equal(liveResponse.statusCode, 200);
  assert.equal((seededResponse.json() as { dataMode: string }).dataMode, "seeded_example");
  assert.equal((liveResponse.json() as { dataMode: string }).dataMode, "live");
});
