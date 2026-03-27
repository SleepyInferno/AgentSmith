import type { PrismaClient } from "@prisma/client";
import {
  networkFixtureFindings,
  networkFixtureRelationships,
  networkFixtureResources,
  type NetworkFixtureFinding,
  type NetworkFixtureRelationship,
  type NetworkFixtureResource,
} from "./network.fixtures.js";
import { buildNetworkFindingQueue, buildNetworkScopeSummary } from "./network.findings.js";
import type {
  NetworkDataMode,
  NetworkFindingItem,
  NetworkInventoryFilters,
  NetworkInventoryRow,
  NetworkMapRelationship,
  NetworkMapResponse,
  NetworkMapSiteScope,
  NetworkRelatedResource,
  NetworkResourceDetail,
} from "./network.types.js";

type NetworkDateValue = Date | string | null;

type NetworkPrismaClient = {
  networkResource: {
    findMany: () => Promise<Array<Omit<NetworkFixtureResource, "lastSeenAt"> & { lastSeenAt: NetworkDateValue }>>;
  };
  networkRelationship: {
    findMany: () => Promise<Array<Omit<NetworkFixtureRelationship, "lastSeenAt"> & { lastSeenAt: NetworkDateValue }>>;
  };
  networkFinding: {
    findMany: () => Promise<Array<Omit<NetworkFixtureFinding, "lastSeenAt"> & { lastSeenAt: NetworkDateValue }>>;
  };
};

type NetworkDataset = {
  dataMode: NetworkDataMode;
  resources: NetworkFixtureResource[];
  relationships: NetworkFixtureRelationship[];
  findings: NetworkFixtureFinding[];
};

const freshnessWeight: Record<NetworkInventoryRow["freshnessState"], number> = {
  healthy: 0,
  warning: 1,
  stale: 2,
  error: 3,
};

export class NetworkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listFindings(limit = 10): Promise<NetworkFindingItem[]> {
    const dataset = await this.loadDataset();
    const queue = buildNetworkFindingQueue(dataset.resources, dataset.relationships, dataset.findings);

    return queue.slice(0, Math.max(limit, 0)).map((finding) => ({
      ...finding,
      dataMode: dataset.dataMode,
    }));
  }

  async listInventory(filters: NetworkInventoryFilters = {}): Promise<NetworkInventoryRow[]> {
    const dataset = await this.loadDataset();

    return dataset.resources
      .map((resource) => mapInventoryRow(resource, dataset.dataMode))
      .filter((row) => {
        if (filters.kind && row.resourceKind !== filters.kind) {
          return false;
        }

        if (filters.siteName && row.siteName !== filters.siteName) {
          return false;
        }

        if (filters.freshnessState && row.freshnessState !== filters.freshnessState) {
          return false;
        }

        if (filters.operationalStatus && row.operationalStatus !== filters.operationalStatus) {
          return false;
        }

        if (!filters.search) {
          return true;
        }

        const query = filters.search.toLowerCase();
        return [
          row.resourceName,
          row.siteName,
          row.managementIp,
          row.cidr,
          row.ownerLabel,
          row.sourceSystem,
        ].some((value) => value?.toLowerCase().includes(query));
      })
      .sort((left, right) => {
        if ((left.siteName ?? "") !== (right.siteName ?? "")) {
          return (left.siteName ?? "").localeCompare(right.siteName ?? "");
        }

        if (left.resourceKind !== right.resourceKind) {
          return left.resourceKind.localeCompare(right.resourceKind);
        }

        return left.resourceName.localeCompare(right.resourceName);
      });
  }

  async getMap(): Promise<NetworkMapResponse> {
    const dataset = await this.loadDataset();
    const relationships = dataset.relationships.map(mapRelationship);
    const resources = dataset.resources.map((resource) => ({
      resourceId: resource.id,
      resourceName: resource.name,
      resourceKind: resource.kind,
      siteName: resource.siteName,
      operationalStatus: resource.operationalStatus,
      freshnessState: resource.freshnessState,
      lastSeenAt: resource.lastSeenAt,
    }));

    return {
      dataMode: dataset.dataMode,
      sites: buildSiteScopes(dataset.resources, relationships),
      resources,
      relationships,
    };
  }

  async getResourceDetail(resourceId: string): Promise<NetworkResourceDetail | null> {
    const dataset = await this.loadDataset();
    const resource = dataset.resources.find((item) => item.id === resourceId);

    if (!resource) {
      return null;
    }

    const relatedResources = buildRelatedResources(resource.id, dataset.resources, dataset.relationships);
    const findings = buildNetworkFindingQueue(
      dataset.resources,
      dataset.relationships,
      dataset.findings.filter((finding) => finding.resourceId === resource.id),
    ).map((finding) => ({
      ...finding,
      dataMode: dataset.dataMode,
    }));

    return {
      dataMode: dataset.dataMode,
      resource: mapInventoryRow(resource, dataset.dataMode),
      relatedResources,
      findings,
      scopeSummary: buildNetworkScopeSummary(resource, relatedResources),
      suggestedNextStep:
        findings[0]?.suggestedNextStep ??
        (relatedResources.some((related) => related.confidence === "inferred") ? "Confirm uplink relationship" : null),
    };
  }

  private async loadDataset(): Promise<NetworkDataset> {
    const prisma = this.prisma as unknown as NetworkPrismaClient;

    try {
      const liveResources = await prisma.networkResource.findMany();
      if (liveResources.length === 0) {
        return buildSeededDataset();
      }

      const [liveRelationships, liveFindings] = await Promise.all([
        prisma.networkRelationship.findMany(),
        prisma.networkFinding.findMany(),
      ]);

      return {
        dataMode: "live",
        resources: liveResources.map(normalizeResource),
        relationships: liveRelationships.map(normalizeRelationship),
        findings: liveFindings.map(normalizeFinding),
      };
    } catch (error) {
      if (isMissingNetworkTableError(error)) {
        return buildSeededDataset();
      }

      throw error;
    }
  }
}

function buildSeededDataset(): NetworkDataset {
  return {
    dataMode: "seeded_example",
    resources: networkFixtureResources.map((resource) => ({ ...resource })),
    relationships: networkFixtureRelationships.map((relationship) => ({ ...relationship })),
    findings: networkFixtureFindings.map((finding) => ({ ...finding })),
  };
}

function normalizeResource(
  resource: Omit<NetworkFixtureResource, "lastSeenAt"> & { lastSeenAt: NetworkDateValue },
): NetworkFixtureResource {
  return {
    ...resource,
    lastSeenAt: toIsoString(resource.lastSeenAt),
  };
}

function normalizeRelationship(
  relationship: Omit<NetworkFixtureRelationship, "lastSeenAt"> & { lastSeenAt: NetworkDateValue },
): NetworkFixtureRelationship {
  return {
    ...relationship,
    lastSeenAt: toIsoString(relationship.lastSeenAt),
  };
}

function normalizeFinding(
  finding: Omit<NetworkFixtureFinding, "lastSeenAt"> & { lastSeenAt: NetworkDateValue },
): NetworkFixtureFinding {
  return {
    ...finding,
    lastSeenAt: toIsoString(finding.lastSeenAt),
  };
}

function mapInventoryRow(resource: NetworkFixtureResource, dataMode: NetworkDataMode): NetworkInventoryRow {
  return {
    resourceId: resource.id,
    resourceName: resource.name,
    resourceKind: resource.kind,
    sourceSystem: resource.sourceSystem,
    sourceId: resource.sourceId,
    siteName: resource.siteName,
    operationalStatus: resource.operationalStatus,
    freshnessState: resource.freshnessState,
    lastSeenAt: resource.lastSeenAt,
    managementIp: resource.managementIp,
    cidr: resource.cidr,
    ownerLabel: resource.ownerLabel,
    dataMode,
  };
}

function mapRelationship(relationship: NetworkFixtureRelationship): NetworkMapRelationship {
  return {
    relationshipId: relationship.id,
    fromResourceId: relationship.fromResourceId,
    toResourceId: relationship.toResourceId,
    relationship: relationship.relationship,
    confidence: relationship.confidence,
    sourceSystem: relationship.sourceSystem,
    lastSeenAt: relationship.lastSeenAt,
  };
}

function buildSiteScopes(resources: NetworkFixtureResource[], relationships: NetworkMapRelationship[]): NetworkMapSiteScope[] {
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  const siteGroups = new Map<
    string,
    {
      siteName: string;
      resourceIds: string[];
      freshnessState: NetworkInventoryRow["freshnessState"];
    }
  >();

  for (const resource of resources) {
    const siteName = resource.siteName ?? resource.name;
    const existing = siteGroups.get(siteName);
    if (existing) {
      existing.resourceIds.push(resource.id);
      existing.freshnessState = pickWorseFreshness(existing.freshnessState, resource.freshnessState);
      continue;
    }

    siteGroups.set(siteName, {
      siteName,
      resourceIds: [resource.id],
      freshnessState: resource.freshnessState,
    });
  }

  return [...siteGroups.values()]
    .map((site) => {
      const resourceIds = new Set(site.resourceIds);
      const relationshipCount = relationships.filter((relationship) => {
        const fromResource = resourceById.get(relationship.fromResourceId);
        const toResource = resourceById.get(relationship.toResourceId);

        return resourceIds.has(relationship.fromResourceId) || resourceIds.has(relationship.toResourceId) || fromResource?.siteName === site.siteName || toResource?.siteName === site.siteName;
      }).length;

      return {
        siteName: site.siteName,
        resourceIds: site.resourceIds.slice().sort(),
        relationshipCount,
        freshnessState: site.freshnessState,
      };
    })
    .sort((left, right) => left.siteName.localeCompare(right.siteName));
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

function pickWorseFreshness(
  current: NetworkInventoryRow["freshnessState"],
  candidate: NetworkInventoryRow["freshnessState"],
): NetworkInventoryRow["freshnessState"] {
  return freshnessWeight[candidate] > freshnessWeight[current] ? candidate : current;
}

function toIsoString(value: NetworkDateValue): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function isMissingNetworkTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = "code" in error ? String(error.code ?? "") : "";
  const message = "message" in error ? String(error.message ?? "") : "";

  return code === "P2021" || /network(resource|relationship|finding)/i.test(message);
}
