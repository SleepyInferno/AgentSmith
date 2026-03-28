import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import { documentationFixtureSearchCases } from "./docs.fixtures.js";
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
