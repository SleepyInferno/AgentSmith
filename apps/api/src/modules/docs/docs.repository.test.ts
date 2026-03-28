import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  documentMetadataAssignmentFixtures,
  documentRevisionFixtures,
  documentSystemLinkFixtures,
  documentationFixtureSearchCases,
  documentationFixtureSystems,
  documentationFixtures,
} from "./docs.fixtures.js";
import { DocsRepository } from "./docs.repository.js";

function createPrismaMock(options?: {
  mode?: "empty" | "missing_tables";
  systems?: Array<Record<string, unknown>>;
}) {
  const mode = options?.mode ?? "empty";
  const systems =
    options?.systems ??
    [
      {
        id: "sys-sharepoint-tenant",
        sourceSystem: "cmdb",
        sourceId: "sys-sharepoint-tenant",
        name: "Microsoft 365 Collaboration",
        category: "m365",
        ownerTeam: "Productivity",
        criticality: "tier_1",
      },
      {
        id: "sys-entra-break-glass",
        sourceSystem: "cmdb",
        sourceId: "sys-entra-break-glass",
        name: "Entra Break-Glass Accounts",
        category: "identity",
        ownerTeam: "Identity Operations",
        criticality: "tier_0",
      },
    ];

  return {
    document: {
      findMany: async () => {
        if (mode === "missing_tables") {
          const error = new Error("The table `Document` does not exist.");
          Object.assign(error, { code: "P2021" });
          throw error;
        }

        return [];
      },
    },
    system: {
      findMany: async () => systems,
    },
    $queryRaw: async () => [],
  } as unknown as PrismaClient;
}

function createMutablePrismaMock() {
  const state = {
    documents: documentationFixtures.map((document) => ({ ...document })),
    metadataAssignments: documentMetadataAssignmentFixtures.map((assignment, index) => ({
      id: `metadata-${index + 1}`,
      ...assignment,
    })),
    systemLinks: documentSystemLinkFixtures.map((link, index) => ({
      id: `system-link-${index + 1}`,
      ...link,
    })),
    revisions: documentRevisionFixtures.map((revision, index) => ({
      id: `revision-${index + 1}`,
      ...revision,
    })),
    systems: documentationFixtureSystems.map((system) => ({ ...system })),
    auditEvents: [] as Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string | null;
      result: string;
      metadata: unknown;
      actorId: string | null;
      timestamp: Date;
      createdAt: Date;
    }>,
  };
  let revisionCounter = state.revisions.length;
  let auditCounter = 0;

  const prismaMock = {
    document: {
      findMany: async () =>
        state.documents
          .map((document) => materializeDocument(state, document.id))
          .filter((document): document is NonNullable<typeof document> => Boolean(document))
          .sort((left, right) => left.title.localeCompare(right.title)),
      findUnique: async ({ where }: { where: { id: string } }) => materializeDocument(state, where.id),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const document = state.documents.find((item) => item.id === where.id);

        if (!document) {
          throw new Error(`Document ${where.id} not found`);
        }

        if ("searchText" in data) {
          document.searchText = String(data.searchText ?? "");
        }

        if ("reviewState" in data) {
          document.reviewState = String(data.reviewState ?? document.reviewState) as typeof document.reviewState;
        }

        if ("reviewDueAt" in data) {
          document.reviewDueAt = (data.reviewDueAt as string | Date | null | undefined) ?? null;
        }

        if ("lastReviewedAt" in data) {
          document.lastReviewedAt = (data.lastReviewedAt as string | Date | null | undefined) ?? null;
        }

        if ("category" in data) {
          document.category = (data.category as string | null | undefined) ?? null;
        }

        if ("owner" in data) {
          document.owner = (data.owner as string | null | undefined) ?? null;
        }

        document.updatedAt = (data.updatedAt as string | Date | undefined) ?? new Date();

        return materializeDocument(state, where.id);
      },
    },
    system: {
      findMany: async (args?: { where?: { id?: { in?: string[] } } }) => {
        const ids = args?.where?.id?.in;
        if (!ids) {
          return state.systems.map((system) => ({ ...system }));
        }

        return state.systems.filter((system) => ids.includes(system.id)).map((system) => ({ ...system }));
      },
    },
    documentMetadataAssignment: {
      deleteMany: async ({ where }: { where: { documentId: string } }) => {
        state.metadataAssignments = state.metadataAssignments.filter((assignment) => assignment.documentId !== where.documentId);
        return { count: 1 };
      },
      createMany: async ({
        data,
      }: {
        data: Array<{
          documentId: string;
          dimension: string;
          valueKey: string;
          valueLabel: string;
          createdAt?: Date;
          updatedAt?: Date;
        }>;
      }) => {
        for (const item of data) {
          state.metadataAssignments.push({
            id: `metadata-${state.metadataAssignments.length + 1}`,
            documentId: item.documentId,
            dimension: item.dimension as (typeof state.metadataAssignments)[number]["dimension"],
            valueKey: item.valueKey,
            valueLabel: item.valueLabel,
            createdAt: item.createdAt ?? new Date(),
            updatedAt: item.updatedAt ?? new Date(),
          });
        }

        return { count: data.length };
      },
    },
    documentSystemLink: {
      deleteMany: async ({ where }: { where: { documentId: string } }) => {
        state.systemLinks = state.systemLinks.filter((link) => link.documentId !== where.documentId);
        return { count: 1 };
      },
      createMany: async ({
        data,
      }: {
        data: Array<{ documentId: string; systemId: string; relationshipLabel: string; createdAt?: Date; updatedAt?: Date }>;
      }) => {
        for (const item of data) {
          state.systemLinks.push({
            id: `system-link-${state.systemLinks.length + 1}`,
            documentId: item.documentId,
            systemId: item.systemId,
            relationshipLabel: item.relationshipLabel,
            createdAt: item.createdAt ?? new Date(),
            updatedAt: item.updatedAt ?? new Date(),
          });
        }

        return { count: data.length };
      },
    },
    documentRevision: {
      create: async ({
        data,
      }: {
        data: {
          documentId: string;
          revisionType: string;
          summary: string;
          changedFields: string[];
          actorLabel: string | null;
          reviewState: string;
          reviewDueAt: string | Date | null;
          createdAt?: Date;
        };
      }) => {
        revisionCounter += 1;
        const created = {
          id: `revision-${revisionCounter}`,
          documentId: data.documentId,
          revisionType: data.revisionType as (typeof state.revisions)[number]["revisionType"],
          summary: data.summary,
          changedFields: [...data.changedFields],
          actorLabel: data.actorLabel,
          reviewState: data.reviewState as (typeof state.revisions)[number]["reviewState"],
          reviewDueAt: data.reviewDueAt,
          createdAt: data.createdAt ?? new Date(),
        };

        state.revisions.push(created);
        return created;
      },
    },
    auditEvent: {
      create: async ({
        data,
      }: {
        data: {
          actorId: string | null;
          action: string;
          targetType: string;
          targetId: string | null;
          result: string;
          metadata: unknown;
        };
      }) => {
        auditCounter += 1;
        const created = {
          id: `audit-${auditCounter}`,
          timestamp: new Date(),
          createdAt: new Date(),
          ...data,
        };

        state.auditEvents.push(created);
        return created;
      },
    },
    $queryRaw: async () => [],
    $transaction: async <T>(callback: (tx: typeof prismaMock) => Promise<T>) => callback(prismaMock),
  };

  return {
    prisma: prismaMock as unknown as PrismaClient,
    state,
  };
}

function materializeDocument(
  state: ReturnType<typeof createMutablePrismaMock>["state"],
  documentId: string,
) {
  const document = state.documents.find((item) => item.id === documentId);

  if (!document) {
    return null;
  }

  return {
    ...document,
    metadataAssignments: state.metadataAssignments
      .filter((assignment) => assignment.documentId === documentId)
      .map((assignment) => ({
        dimension: assignment.dimension,
        valueKey: assignment.valueKey,
        valueLabel: assignment.valueLabel,
      })),
    systemLinks: state.systemLinks
      .filter((link) => link.documentId === documentId)
      .map((link) => ({
        systemId: link.systemId,
        relationshipLabel: link.relationshipLabel,
        system: state.systems.find((system) => system.id === link.systemId) ?? null,
      })),
    revisions: state.revisions
      .filter((revision) => revision.documentId === documentId)
      .map((revision) => ({
        id: revision.id,
        revisionType: revision.revisionType,
        summary: revision.summary,
        changedFields: [...revision.changedFields],
        actorLabel: revision.actorLabel,
        reviewState: revision.reviewState,
        reviewDueAt: revision.reviewDueAt,
        createdAt: revision.createdAt,
      }))
      .sort((left, right) => new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf()),
  };
}

test("sharepoint restore ranks the break-glass recovery document first with a match reason", async () => {
  const repository = new DocsRepository(createPrismaMock());
  const searchCase = documentationFixtureSearchCases.find((item) => item.query === "sharepoint restore");

  assert.ok(searchCase);

  const response = await repository.searchDocuments({
    q: searchCase.query,
  });

  assert.equal(response.dataMode, "seeded_example");
  assert.equal(response.writeBoundary, "metadata_review_only");
  assert.equal(response.results[0]?.documentId, "doc-m365-break-glass");
  assert.equal(
    response.results[0]?.reasons.some((reason) => reason.code === "content_match" || reason.code === "title_match"),
    true,
  );
  assert.equal(response.results[0]?.matchedExcerpt?.toLowerCase().includes("sharepoint restore"), true);
});

test("exact metadata and linked-system filters add reasons and keep facets server-owned", async () => {
  const repository = new DocsRepository(createPrismaMock());

  const metadataResponse = await repository.searchDocuments({
    category: "Recovery",
  });

  assert.equal(metadataResponse.results.length > 0, true);
  assert.equal(
    metadataResponse.results.every((result) => result.reasons.some((reason) => reason.code === "metadata_match")),
    true,
  );
  assert.equal(metadataResponse.facets.categories.some((facet) => facet.value === "Recovery"), true);

  const systemResponse = await repository.searchDocuments({
    systemId: "sys-sharepoint-tenant",
  });

  assert.equal(systemResponse.results.length > 0, true);
  assert.equal(systemResponse.results.some((result) => result.documentId === "doc-m365-break-glass"), true);
  assert.equal(
    systemResponse.results.every((result) => result.reasons.some((reason) => reason.code === "system_match")),
    true,
  );
  assert.equal(systemResponse.facets.systems.some((facet) => facet.value === "sys-sharepoint-tenant"), true);
});

test("overview queue prioritizes overdue review, metadata gaps, and recent changes before healthy records", async () => {
  const repository = new DocsRepository(createPrismaMock());

  const overview = await repository.getOverview();

  assert.equal(overview.dataMode, "seeded_example");
  assert.equal(overview.writeBoundary, "metadata_review_only");
  assert.equal(overview.queue[0]?.documentId, "doc-branch-firewall-recovery");
  assert.equal(overview.queue[0]?.focusReason.label, "Review overdue");
  assert.equal(overview.queue.some((item) => item.focusReason.label === "Metadata incomplete"), true);
  assert.equal(overview.queue.some((item) => item.focusReason.label === "Updated since last review"), true);
  assert.equal(
    overview.queue.findIndex((item) => item.focusReason.label === "Metadata incomplete") <
      overview.queue.findIndex((item) => item.focusReason.label === "Updated since last review"),
    true,
  );
});

test("empty tables and missing tables both fall back to seeded_example documentation data", async () => {
  const emptyRepository = new DocsRepository(createPrismaMock({ mode: "empty" }));
  const missingTableRepository = new DocsRepository(createPrismaMock({ mode: "missing_tables" }));

  const emptySearch = await emptyRepository.searchDocuments({
    q: "veeam renewal",
  });
  const missingOverview = await missingTableRepository.getOverview();

  assert.equal(emptySearch.dataMode, "seeded_example");
  assert.equal(emptySearch.results[0]?.documentId, "doc-veeam-renewal-notes");
  assert.equal(missingOverview.dataMode, "seeded_example");
  assert.equal(missingOverview.queue.length > 0, true);
});

test("detail responses include history, linked systems, metadata catalog, and the metadata review boundary", async () => {
  const repository = new DocsRepository(createPrismaMock());

  const detail = await repository.getDocumentDetail("doc-m365-break-glass");

  assert.ok(detail);
  assert.equal(detail?.dataMode, "seeded_example");
  assert.equal(detail?.writeBoundary, "metadata_review_only");
  assert.equal(detail?.contentText.toLowerCase().includes("sharepoint restore"), true);
  assert.equal(detail?.linkedSystems.length, 2);
  assert.equal(detail?.history.length > 0, true);
  assert.equal(detail?.history.some((entry) => entry.summary.toLowerCase().includes("sharepoint restore")), true);
  assert.equal(detail?.metadataCatalog.sites.length > 0, true);
  assert.equal(detail?.metadataCatalog.owners.length > 0, true);
  assert.equal(detail?.metadataCatalog.categories.length > 0, true);
  assert.equal(detail?.metadataCatalog.systems.length > 0, true);
});

test("metadata review updates live metadata, appends revision and audit entries, and refreshes search plus queue results", async () => {
  const live = createMutablePrismaMock();
  const repository = new DocsRepository(live.prisma);

  const result = await (repository as DocsRepository & {
    submitMetadataReview: (
      documentId: string,
      input: {
        categoryLabels: string[];
        siteLabels: string[];
        ownerLabels: string[];
        systemIds: string[];
        reviewDueAt: string | null;
        reviewSummary: string;
        actorLabel: string;
      },
    ) => Promise<{
      documentId: string;
      changedFields: string[];
      historyEntryId: string;
      auditAction: string;
      reviewDueAt: string | null;
      lastReviewedAt: string | null;
    }>;
  }).submitMetadataReview("doc-contoso-isp-contacts", {
    categoryLabels: ["Carrier Contacts"],
    siteLabels: ["Branch Office"],
    ownerLabels: ["Network Operations"],
    systemIds: ["sys-branch-circuit", "sys-branch-firewall"],
    reviewDueAt: "2026-09-01T00:00:00.000Z",
    reviewSummary: "Validated carrier contacts and branch escalation coverage.",
    actorLabel: "Solo IT Operator",
  });

  assert.equal(result.documentId, "doc-contoso-isp-contacts");
  assert.equal(result.auditAction, "docs.metadata.reviewed");
  assert.equal(result.changedFields.includes("categoryLabels"), true);
  assert.equal(result.changedFields.includes("siteLabels"), true);
  assert.equal(result.changedFields.includes("ownerLabels"), true);
  assert.equal(result.changedFields.includes("systemIds"), true);
  assert.equal(result.changedFields.includes("reviewDueAt"), true);
  assert.equal(result.historyEntryId.length > 0, true);
  assert.equal(result.reviewDueAt, "2026-09-01T00:00:00.000Z");
  assert.notEqual(result.lastReviewedAt, null);

  const search = await repository.searchDocuments({
    q: "contoso noc",
    site: "Branch Office",
    systemId: "sys-branch-firewall",
  });
  const overview = await repository.getOverview();
  const detail = await repository.getDocumentDetail("doc-contoso-isp-contacts");

  assert.equal(search.dataMode, "live");
  assert.equal(search.results[0]?.documentId, "doc-contoso-isp-contacts");
  assert.equal(search.results[0]?.metadataTags.some((tag) => tag.dimension === "site" && tag.valueLabel === "Branch Office"), true);
  assert.equal(search.results[0]?.linkedSystems.some((system) => system.systemId === "sys-branch-firewall"), true);
  assert.equal(overview.queue.some((item) => item.documentId === "doc-contoso-isp-contacts"), false);
  assert.equal(detail?.history[0]?.revisionType, "metadata_review");
  assert.equal(detail?.history[0]?.summary, "Validated carrier contacts and branch escalation coverage.");

  const latestRevision = live.state.revisions.at(-1);
  const latestAudit = live.state.auditEvents.at(-1);

  assert.equal(latestRevision?.revisionType, "metadata_review");
  assert.equal(latestRevision?.summary, "Validated carrier contacts and branch escalation coverage.");
  assert.equal(latestRevision?.changedFields.includes("systemIds"), true);
  assert.equal(latestAudit?.action, "docs.metadata.reviewed");
  assert.deepEqual((latestAudit?.metadata as { before: { siteLabels: string[] } }).before.siteLabels, []);
  assert.deepEqual(
    (latestAudit?.metadata as { after: { siteLabels: string[]; systemIds: string[] } }).after.siteLabels,
    ["Branch Office"],
  );
  assert.deepEqual(
    (latestAudit?.metadata as { after: { siteLabels: string[]; systemIds: string[] } }).after.systemIds,
    ["sys-branch-circuit", "sys-branch-firewall"],
  );
});

test("short live queries still surface veeam, noc, and mx records when SQL search returns no rows", async () => {
  const live = createMutablePrismaMock();
  live.state.documents.push({
    id: "doc-mx-routing-notes",
    sourceSystem: "seeded_example",
    sourceId: "doc-mx-routing-notes",
    title: "Mail Routing Notes",
    kind: "infrastructure_note",
    category: "Messaging",
    owner: "Messaging Operations",
    summary: "External mail flow notes for MX routing and smarthost cutover.",
    contentText: "Review the MX cutover order, inbound relay validation, and rollback criteria before mail routing changes.",
    searchText: "mail routing smarthost relay mx cutover inbound mail flow",
    reviewState: "current",
    reviewDueAt: "2026-06-20T00:00:00.000Z",
    lastReviewedAt: "2026-03-12T08:00:00.000Z",
    sourceUpdatedAt: "2026-03-12T08:00:00.000Z",
    contentUpdatedAt: "2026-03-12T08:00:00.000Z",
    queueSummary: null,
    focusReason: null,
    suggestedNextStep: "No immediate action required.",
    createdAt: "2026-01-20T09:00:00.000Z",
    updatedAt: "2026-03-12T08:00:00.000Z",
    dataMode: "live",
  });
  live.state.metadataAssignments.push(
    {
      id: `metadata-${live.state.metadataAssignments.length + 1}`,
      documentId: "doc-mx-routing-notes",
      dimension: "site",
      valueKey: "site-cloud",
      valueLabel: "Cloud",
      createdAt: "2026-01-20T09:00:00.000Z",
      updatedAt: "2026-03-12T08:00:00.000Z",
    },
    {
      id: `metadata-${live.state.metadataAssignments.length + 2}`,
      documentId: "doc-mx-routing-notes",
      dimension: "owner",
      valueKey: "owner-messaging-operations",
      valueLabel: "Messaging Operations",
      createdAt: "2026-01-20T09:00:00.000Z",
      updatedAt: "2026-03-12T08:00:00.000Z",
    },
    {
      id: `metadata-${live.state.metadataAssignments.length + 3}`,
      documentId: "doc-mx-routing-notes",
      dimension: "category",
      valueKey: "category-mx-records",
      valueLabel: "MX Records",
      createdAt: "2026-01-20T09:00:00.000Z",
      updatedAt: "2026-03-12T08:00:00.000Z",
    },
  );
  const repository = new DocsRepository(live.prisma);

  const veeam = await repository.searchDocuments({ q: "veeam" });
  const noc = await repository.searchDocuments({ q: "noc" });
  const mx = await repository.searchDocuments({ q: "mx" });

  assert.equal(veeam.dataMode, "live");
  assert.equal(veeam.results[0]?.documentId, "doc-veeam-renewal-notes");
  assert.equal(noc.results[0]?.documentId, "doc-contoso-isp-contacts");
  assert.equal(mx.results[0]?.documentId, "doc-mx-routing-notes");
});
