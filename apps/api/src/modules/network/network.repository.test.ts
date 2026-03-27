import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { networkFixtureFindings, networkFixtureRelationships, networkFixtureResources } from "./network.fixtures.js";
import { NetworkRepository } from "./network.repository.js";

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function buildLiveResources() {
  return networkFixtureResources.map((resource) => ({
    ...resource,
    lastSeenAt: toDate(resource.lastSeenAt),
  }));
}

function buildLiveRelationships() {
  return networkFixtureRelationships.map((relationship) => ({
    ...relationship,
    lastSeenAt: toDate(relationship.lastSeenAt),
  }));
}

function buildLiveFindings() {
  return networkFixtureFindings.map((finding) => ({
    ...finding,
    lastSeenAt: toDate(finding.lastSeenAt),
  }));
}

function createPrismaMock(options?: {
  resources?: ReturnType<typeof buildLiveResources>;
  relationships?: ReturnType<typeof buildLiveRelationships>;
  findings?: ReturnType<typeof buildLiveFindings>;
}): PrismaClient {
  const resources = options?.resources ?? buildLiveResources();
  const relationships = options?.relationships ?? buildLiveRelationships();
  const findings = options?.findings ?? buildLiveFindings();

  return {
    networkResource: {
      findMany: async () => resources,
    },
    networkRelationship: {
      findMany: async () => relationships,
    },
    networkFinding: {
      findMany: async () => findings,
    },
  } as unknown as PrismaClient;
}

test("listInventory filters live rows by kind, siteName, and freshnessState", async () => {
  const repository = new NetworkRepository(createPrismaMock());

  const rows = await repository.listInventory({
    kind: "lan_segment",
    siteName: "Branch Office",
    freshnessState: "warning",
  });

  assert.deepEqual(rows.map((row) => row.resourceId), ["lan-branch-users"]);
  assert.equal(rows[0]?.resourceKind, "lan_segment");
  assert.equal(rows[0]?.dataMode, "live");
});

test("getMap returns grouped site scope with confirmed and inferred relationships", async () => {
  const repository = new NetworkRepository(createPrismaMock());

  const map = await repository.getMap();

  assert.equal(map.dataMode, "live");
  assert.deepEqual(
    map.sites.map((site) => site.siteName).sort(),
    ["Branch Office", "HQ"],
  );
  assert.equal(map.relationships.some((relationship) => relationship.confidence === "confirmed"), true);
  assert.equal(map.relationships.some((relationship) => relationship.confidence === "inferred"), true);
});

test("getResourceDetail returns related resources, freshness, confidence context, and suggested next-step text", async () => {
  const repository = new NetworkRepository(createPrismaMock());

  const detail = await repository.getResourceDetail("vpn-hub-01");

  assert.ok(detail);
  assert.equal(detail?.dataMode, "live");
  assert.equal(detail?.resource.freshnessState, "warning");
  assert.equal(detail?.relatedResources.length > 0, true);
  assert.equal(detail?.relatedResources.some((resource) => resource.confidence === "inferred"), true);
  assert.equal(typeof detail?.suggestedNextStep, "string");
});

test("repository falls back to seeded_example data mode when live rows do not exist", async () => {
  const repository = new NetworkRepository(
    createPrismaMock({
      resources: [],
      relationships: [],
      findings: [],
    }),
  );

  const inventory = await repository.listInventory();
  const findings = await repository.listFindings(2);
  const map = await repository.getMap();
  const detail = await repository.getResourceDetail("firewall-hq-01");

  assert.equal(inventory[0]?.dataMode, "seeded_example");
  assert.equal(findings[0]?.dataMode, "seeded_example");
  assert.equal(map.dataMode, "seeded_example");
  assert.equal(detail?.dataMode, "seeded_example");
  assert.equal(map.relationships.some((relationship) => relationship.confidence === "confirmed"), true);
  assert.equal(map.relationships.some((relationship) => relationship.confidence === "inferred"), true);
});
