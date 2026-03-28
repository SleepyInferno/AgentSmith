import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type {
  DocumentationDetail,
  DocumentationOverview,
  DocumentationSearchFilters,
  DocumentationSearchResponse,
} from "../modules/docs/docs.types.js";
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

function makeOverview(dataMode: DocumentationOverview["dataMode"]): DocumentationOverview {
  return {
    dataMode,
    generatedAt: "2026-03-28T15:00:00.000Z",
    summary: "10 documents tracked; 4 queued for review and 2 show stale knowledge signals.",
    writeBoundary: "metadata_review_only",
    cards: [
      {
        key: "review_overdue",
        label: "Review overdue",
        value: 1,
        tone: "critical",
        summary: "Documents with review dates in the past.",
      },
    ],
    queue: [
      {
        queueId: "docs-queue-doc-branch-firewall-recovery",
        documentId: "doc-branch-firewall-recovery",
        title: "Branch Firewall Recovery Runbook",
        kind: "recovery_procedure",
        reviewState: "overdue",
        reviewDueAt: "2026-03-10T00:00:00.000Z",
        lastReviewedAt: "2025-12-10T16:00:00.000Z",
        sourceUpdatedAt: "2026-03-05T12:00:00.000Z",
        contentUpdatedAt: "2026-03-05T12:00:00.000Z",
        summary: "Review due date has passed",
        focusReason: {
          code: "review_overdue",
          label: "Review overdue",
          summary: "Review due date has passed",
        },
        suggestedNextStep: "Review the runbook against the current branch firewall firmware and branch failover process.",
        queueRank: 1,
        metadataTags: [
          {
            dimension: "site",
            valueKey: "site-branch-office",
            valueLabel: "Branch Office",
          },
        ],
        linkedSystems: [
          {
            systemId: "sys-branch-firewall",
            systemName: "Branch Edge Firewall",
            relationshipLabel: "primary recovery target",
            category: "network_security",
            ownerTeam: "Network Operations",
            criticality: "tier_1",
          },
        ],
      },
    ],
  };
}

function makeSearchResponse(
  dataMode: DocumentationSearchResponse["dataMode"],
  filters: DocumentationSearchFilters,
): DocumentationSearchResponse {
  return {
    dataMode,
    generatedAt: "2026-03-28T15:00:00.000Z",
    summary: "1 document matched the current filters from seeded example data.",
    writeBoundary: "metadata_review_only",
    filters,
    facets: {
      kinds: [{ value: "recovery_procedure", label: "recovery_procedure", count: 1 }],
      reviewStates: [{ value: "unreviewed", label: "unreviewed", count: 1 }],
      sites: [{ value: "Cloud", label: "Cloud", count: 1 }],
      owners: [{ value: "Identity Operations", label: "Identity Operations", count: 1 }],
      categories: [{ value: "Recovery", label: "Recovery", count: 1 }],
      systems: [{ value: "sys-sharepoint-tenant", label: "Microsoft 365 Collaboration", count: 1 }],
    },
    results: [
      {
        documentId: "doc-m365-break-glass",
        title: "Microsoft 365 Break-Glass and SharePoint Restore",
        kind: "recovery_procedure",
        summary: "Emergency access and SharePoint restore guidance for tenant-wide Microsoft 365 incidents.",
        reviewState: "unreviewed",
        reviewDueAt: "2026-04-15T00:00:00.000Z",
        lastReviewedAt: "2026-02-12T09:00:00.000Z",
        sourceUpdatedAt: "2026-03-27T07:30:00.000Z",
        contentUpdatedAt: "2026-03-27T07:30:00.000Z",
        matchedExcerpt: "Use the break-glass accounts and run the SharePoint restore checklist for tenant-wide recovery.",
        relevanceScore: 131.5,
        reasons: [
          {
            code: "content_match",
            label: "Content match",
            summary: "Search terms matched the document content.",
          },
          {
            code: "system_match",
            label: "Linked system match",
            summary: "A linked system matched the active filters.",
          },
        ],
        metadataTags: [
          {
            dimension: "category",
            valueKey: "category-recovery",
            valueLabel: "Recovery",
          },
        ],
        linkedSystems: [
          {
            systemId: "sys-sharepoint-tenant",
            systemName: "Microsoft 365 Collaboration",
            relationshipLabel: "restore target",
            category: "m365",
            ownerTeam: "Productivity",
            criticality: "tier_1",
          },
        ],
        suggestedNextStep: "Re-review the SharePoint restore scope and confirm the emergency account evidence is still valid.",
      },
    ],
    total: 1,
  };
}

function makeDetail(dataMode: DocumentationDetail["dataMode"]): DocumentationDetail {
  return {
    dataMode,
    writeBoundary: "metadata_review_only",
    documentId: "doc-m365-break-glass",
    title: "Microsoft 365 Break-Glass and SharePoint Restore",
    kind: "recovery_procedure",
    summary: "Emergency access and SharePoint restore guidance for tenant-wide Microsoft 365 incidents.",
    contentText:
      "Use the break-glass accounts to regain admin access, confirm the emergency credential evidence, and run the SharePoint restore checklist for tenant-wide recovery.",
    reviewState: "unreviewed",
    reviewDueAt: "2026-04-15T00:00:00.000Z",
    lastReviewedAt: "2026-02-12T09:00:00.000Z",
    sourceUpdatedAt: "2026-03-27T07:30:00.000Z",
    contentUpdatedAt: "2026-03-27T07:30:00.000Z",
    metadataTags: [
      {
        dimension: "category",
        valueKey: "category-recovery",
        valueLabel: "Recovery",
      },
    ],
    linkedSystems: [
      {
        systemId: "sys-sharepoint-tenant",
        systemName: "Microsoft 365 Collaboration",
        relationshipLabel: "restore target",
        category: "m365",
        ownerTeam: "Productivity",
        criticality: "tier_1",
      },
    ],
    history: [
      {
        revisionId: "doc-m365-break-glass-revision-1",
        revisionType: "source_sync",
        summary: "Added SharePoint restore validation steps after a tenant permission change.",
        changedFields: ["contentText", "searchText", "sourceUpdatedAt", "contentUpdatedAt"],
        actorLabel: "Microsoft 365 Sync",
        reviewState: "unreviewed",
        reviewDueAt: "2026-04-15T00:00:00.000Z",
        createdAt: "2026-03-27T07:30:00.000Z",
      },
    ],
    metadataCatalog: {
      sites: [{ dimension: "site", valueKey: "site-cloud", valueLabel: "Cloud" }],
      owners: [{ dimension: "owner", valueKey: "owner-identity-operations", valueLabel: "Identity Operations" }],
      categories: [{ dimension: "category", valueKey: "category-recovery", valueLabel: "Recovery" }],
      systems: [
        {
          systemId: "sys-sharepoint-tenant",
          systemName: "Microsoft 365 Collaboration",
          category: "m365",
          ownerTeam: "Productivity",
          criticality: "tier_1",
        },
      ],
    },
    suggestedNextStep: "Re-review the SharePoint restore scope and confirm the emergency account evidence is still valid.",
  };
}

function makeRepository(dataMode: DocumentationOverview["dataMode"] = "seeded_example") {
  const overview = makeOverview(dataMode);
  const detail = makeDetail(dataMode);
  let lastFilters: DocumentationSearchFilters | undefined;

  return {
    repository: {
      async getOverview() {
        return overview;
      },
      async searchDocuments(filters: DocumentationSearchFilters = {}) {
        lastFilters = filters;
        return makeSearchResponse(dataMode, filters);
      },
      async getDocumentDetail(documentId: string) {
        return documentId === detail.documentId ? detail : null;
      },
    },
    getLastFilters() {
      return lastFilters;
    },
  };
}

test("GET /api/docs/overview returns cards, queue items, generatedAt, and metadata_review_only", async (t) => {
  const docs = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    docsRoutes: {
      docsRepository: docs.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/docs/overview",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    generatedAt: string;
    writeBoundary: string;
    cards: Array<{ key: string }>;
    queue: Array<{ documentId: string; focusReason: { label: string } }>;
  };

  assert.equal(body.generatedAt, "2026-03-28T15:00:00.000Z");
  assert.equal(body.writeBoundary, "metadata_review_only");
  assert.equal(body.cards[0]?.key, "review_overdue");
  assert.equal(body.queue[0]?.documentId, "doc-branch-firewall-recovery");
  assert.equal(body.queue[0]?.focusReason.label, "Review overdue");
});

test("GET /api/docs/search parses q, kind, category, site, owner, systemId, reviewState, and staleOnly into repository filters", async (t) => {
  const docs = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    docsRoutes: {
      docsRepository: docs.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/docs/search?q=sharepoint%20restore&kind=recovery_procedure&category=Recovery&site=Cloud&owner=Identity%20Operations&systemId=sys-sharepoint-tenant&reviewState=unreviewed&staleOnly=true",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    writeBoundary: string;
    results: Array<{ matchedExcerpt: string | null; relevanceScore: number; reasons: Array<{ code: string }> }>;
  };

  assert.deepEqual(docs.getLastFilters(), {
    q: "sharepoint restore",
    kind: "recovery_procedure",
    category: "Recovery",
    site: "Cloud",
    owner: "Identity Operations",
    systemId: "sys-sharepoint-tenant",
    reviewState: "unreviewed",
    staleOnly: true,
  });
  assert.equal(body.writeBoundary, "metadata_review_only");
  assert.equal(body.results[0]?.matchedExcerpt?.includes("SharePoint restore"), true);
  assert.equal(body.results[0]?.relevanceScore, 131.5);
  assert.equal(body.results[0]?.reasons.some((reason) => reason.code === "system_match"), true);
});

test("GET /api/docs/:documentId returns history, linkedSystems, and metadataCatalog", async (t) => {
  const docs = makeRepository("live");
  const { app } = buildServer({
    env: testEnv,
    docsRoutes: {
      docsRepository: docs.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/docs/doc-m365-break-glass",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    writeBoundary: string;
    linkedSystems: Array<{ systemId: string }>;
    history: Array<{ revisionType: string }>;
    metadataCatalog: { systems: Array<{ systemId: string }> };
  };

  assert.equal(body.writeBoundary, "metadata_review_only");
  assert.equal(body.linkedSystems[0]?.systemId, "sys-sharepoint-tenant");
  assert.equal(body.history[0]?.revisionType, "source_sync");
  assert.equal(body.metadataCatalog.systems[0]?.systemId, "sys-sharepoint-tenant");
});

test("GET /api/docs/:documentId returns 404 with Documentation record not found for an unknown document", async (t) => {
  const docs = makeRepository("seeded_example");
  const { app } = buildServer({
    env: testEnv,
    docsRoutes: {
      docsRepository: docs.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/docs/missing-document",
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.json(), {
    message: "Documentation record not found",
  });
});
