import type { NetworkFixtureFinding, NetworkFixtureRelationship, NetworkFixtureResource } from "./network.fixtures.js";
import type { NetworkFindingItem, NetworkRelatedResource } from "./network.types.js";

type NetworkQueueFinding = Omit<NetworkFindingItem, "dataMode">;

const severityOrder: Record<NetworkQueueFinding["severity"], number> = {
  critical: 0,
  high: 1,
  watch: 2,
  low: 3,
};

export function buildNetworkFindingQueue(
  resources: NetworkFixtureResource[],
  relationships: NetworkFixtureRelationship[],
  findings: NetworkFixtureFinding[],
): NetworkQueueFinding[] {
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));

  return findings
    .flatMap((finding) => {
      const resource = resourceById.get(finding.resourceId);
      if (!resource) {
        return [];
      }

      const relatedResources = buildRelatedResources(resource.id, resources, relationships);

      return [
        {
          findingId: finding.id,
          resourceId: resource.id,
          resourceName: resource.name,
          resourceKind: resource.kind,
          kind: finding.kind,
          severity: finding.severity,
          queueRank: finding.queueRank,
          siteName: finding.siteName ?? resource.siteName,
          scopeLabel: finding.scopeLabel ?? buildScopeLabel(resource, relatedResources),
          operationalStatus: resource.operationalStatus,
          freshnessState: finding.freshnessState ?? resource.freshnessState,
          lastSeenAt: finding.lastSeenAt ?? resource.lastSeenAt,
          summary: buildSummary(resource, finding),
          suggestedNextStep: buildSuggestedNextStep(finding, relatedResources),
        },
      ];
    })
    .sort((left, right) => {
      if (left.queueRank !== right.queueRank) {
        return left.queueRank - right.queueRank;
      }

      if (severityOrder[left.severity] !== severityOrder[right.severity]) {
        return severityOrder[left.severity] - severityOrder[right.severity];
      }

      return left.resourceName.localeCompare(right.resourceName);
    });
}

export function buildNetworkScopeSummary(
  resource: Pick<NetworkFixtureResource, "name" | "siteName">,
  relatedResources: NetworkRelatedResource[],
): string {
  const siteLabel = resource.siteName ?? resource.name;
  if (relatedResources.length === 0) {
    return `${siteLabel} scope has no mapped related resources yet.`;
  }

  const confirmedCount = relatedResources.filter((item) => item.confidence === "confirmed").length;
  const inferredCount = relatedResources.filter((item) => item.confidence === "inferred").length;
  const relationshipParts: string[] = [];

  if (confirmedCount > 0) {
    relationshipParts.push(`${confirmedCount} confirmed`);
  }

  if (inferredCount > 0) {
    relationshipParts.push(`${inferredCount} inferred`);
  }

  return `${siteLabel} scope includes ${relatedResources.length} related resource${relatedResources.length === 1 ? "" : "s"} (${relationshipParts.join(", ")} relationships).`;
}

function buildSummary(resource: NetworkFixtureResource, finding: NetworkFixtureFinding): string {
  if (finding.summary.trim()) {
    return finding.summary.trim();
  }

  switch (finding.kind) {
    case "offline_infrastructure":
      return `${resource.name} is offline.`;
    case "stale_telemetry":
      return `${resource.name} has stale telemetry.`;
    case "topology_gap":
      return `${resource.name} needs confirmed topology mapping.`;
    case "unclear_ownership":
      return `${resource.name} does not have a confirmed owner.`;
  }
}

function buildSuggestedNextStep(finding: NetworkFixtureFinding, relatedResources: NetworkRelatedResource[]): string {
  switch (finding.kind) {
    case "topology_gap":
      return relatedResources.some((resource) => resource.confidence === "inferred")
        ? "Confirm uplink relationship"
        : "Review site mapping";
    case "offline_infrastructure":
      return finding.suggestedNextStep.trim() || "Investigate device reachability";
    case "stale_telemetry":
      return finding.suggestedNextStep.trim() || "Refresh telemetry from the source connector";
    case "unclear_ownership":
      return finding.suggestedNextStep.trim() || "Confirm service ownership";
  }
}

function buildScopeLabel(resource: NetworkFixtureResource, relatedResources: NetworkRelatedResource[]): string {
  if (resource.siteName && relatedResources.length > 0) {
    return `${resource.siteName} scope`;
  }

  return resource.siteName ?? resource.name;
}

function buildRelatedResources(
  resourceId: string,
  resources: NetworkFixtureResource[],
  relationships: NetworkFixtureRelationship[],
): NetworkRelatedResource[] {
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));

  return relationships
    .flatMap((relationship) => {
      if (relationship.fromResourceId !== resourceId && relationship.toResourceId !== resourceId) {
        return [];
      }

      const isOutgoing = relationship.fromResourceId === resourceId;
      const relatedId = isOutgoing ? relationship.toResourceId : relationship.fromResourceId;
      const resource = resourceById.get(relatedId);

      if (!resource) {
        return [];
      }

      return [
        {
          resourceId: resource.id,
          resourceName: resource.name,
          resourceKind: resource.kind,
          siteName: resource.siteName,
          operationalStatus: resource.operationalStatus,
          freshnessState: resource.freshnessState,
          lastSeenAt: resource.lastSeenAt,
          relationship: relationship.relationship,
          confidence: relationship.confidence,
          direction: isOutgoing ? "outgoing" : "incoming",
        } satisfies NetworkRelatedResource,
      ];
    })
    .sort((left, right) => left.resourceName.localeCompare(right.resourceName));
}
