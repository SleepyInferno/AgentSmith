import assert from "node:assert/strict";
import test from "node:test";
import { networkFixtureFindings, networkFixtureRelationships, networkFixtureResources } from "./network.fixtures.js";
import { buildNetworkFindingQueue, buildNetworkScopeSummary } from "./network.findings.js";

test("buildNetworkFindingQueue keeps offline and stale infrastructure ahead of topology gaps", () => {
  const queue = buildNetworkFindingQueue(networkFixtureResources, networkFixtureRelationships, networkFixtureFindings);

  assert.deepEqual(
    queue.map((item) => [item.resourceId, item.queueRank]).slice(0, 3),
    [
      ["firewall-hq-01", 1],
      ["ap-branch-01", 2],
      ["vpn-hub-01", 3],
    ],
  );
  assert.equal(queue.at(-1)?.kind, "topology_gap");
});

test("topology-gap findings produce Review site mapping or Confirm uplink relationship guidance", () => {
  const inferredGap = buildNetworkFindingQueue(networkFixtureResources, networkFixtureRelationships, [
    {
      ...networkFixtureFindings[3]!,
      id: "finding-inferred-gap",
      resourceId: "vpn-hub-01",
      kind: "topology_gap",
      summary: "",
      suggestedNextStep: "",
      queueRank: 1,
    },
  ]);
  const mappedGap = buildNetworkFindingQueue(networkFixtureResources, networkFixtureRelationships, [
    {
      ...networkFixtureFindings[3]!,
      id: "finding-mapped-gap",
      resourceId: "lan-branch-users",
      kind: "topology_gap",
      summary: "",
      suggestedNextStep: "",
      queueRank: 2,
    },
  ]);

  assert.equal(inferredGap[0]?.suggestedNextStep, "Confirm uplink relationship");
  assert.equal(mappedGap[0]?.suggestedNextStep, "Review site mapping");
});

test("buildNetworkScopeSummary describes related-resource confidence by site", () => {
  const resource = networkFixtureResources.find((item) => item.id === "vpn-hub-01");

  assert.ok(resource);

  const summary = buildNetworkScopeSummary(resource, [
    {
      resourceId: "wan-primary",
      resourceName: "Primary WAN",
      resourceKind: "wan_link",
      siteName: "HQ",
      operationalStatus: "degraded",
      freshnessState: "healthy",
      lastSeenAt: "2026-03-27T11:58:00.000Z",
      relationship: "terminates_vpn",
      confidence: "inferred",
      direction: "outgoing",
    },
  ]);

  assert.match(summary, /HQ/i);
  assert.match(summary, /inferred/i);
});
