import assert from "node:assert/strict";
import test from "node:test";
import type { ServerEnv } from "@agentsmith/shared";
import type {
  LifecycleRunDetail,
  LifecycleRunListRow,
  LifecycleRunSummary,
  LifecycleStepUpdateInput,
  LifecycleTemplate,
} from "../modules/lifecycle/lifecycle.types.js";
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

const lifecycleTemplates: LifecycleTemplate[] = [
  {
    key: "employee-onboarding",
    kind: "onboarding",
    version: 1,
    title: "Employee onboarding",
    description: "Provision a new starter.",
    groups: [
      {
        key: "identity",
        title: "Identity",
        position: 1,
        steps: [
          {
            key: "identity-create-account",
            title: "Create account",
            instructions: "Create the user account.",
            position: 1,
          },
        ],
      },
      {
        key: "licensing",
        title: "Licensing",
        position: 2,
        steps: [
          {
            key: "licensing-assign-core",
            title: "Assign core licenses",
            instructions: "Assign starter licenses.",
            position: 1,
          },
        ],
      },
    ],
  },
  {
    key: "employee-offboarding",
    kind: "offboarding",
    version: 1,
    title: "Employee offboarding",
    description: "Deprovision a leaver.",
    groups: [
      {
        key: "handoff",
        title: "Handoff",
        position: 1,
        steps: [
          {
            key: "handoff-transfer-mailbox",
            title: "Transfer mailbox",
            instructions: "Document mailbox ownership transfer.",
            position: 1,
          },
        ],
      },
    ],
  },
];

function makeRun(overrides: Partial<LifecycleRunDetail> = {}): LifecycleRunDetail {
  return {
    id: "run-1",
    kind: "onboarding",
    templateKey: "employee-onboarding",
    templateVersion: 1,
    subjectDisplayName: "Taylor Admin",
    subjectEmail: "taylor@example.com",
    requestedBy: "alex@example.com",
    status: "active",
    startedAt: "2026-03-26T21:00:00.000Z",
    closedAt: null,
    updatedAt: "2026-03-26T21:10:00.000Z",
    groups: [
      {
        key: "identity",
        title: "Identity",
        position: 1,
        steps: [
          {
            key: "identity-create-account",
            title: "Create account",
            instructions: "Create the user account.",
            groupKey: "identity",
            position: 1,
            status: "manual",
            statusReason: null,
            note: "Confirmed with manager.",
            ticketId: "T-100",
            assetId: null,
            mailboxRef: null,
            handoffRef: null,
            completedAt: "2026-03-26T21:05:00.000Z",
          },
        ],
      },
      {
        key: "follow-up",
        title: "Follow-up",
        position: 2,
        steps: [
          {
            key: "follow-up-confirm-closure",
            title: "Confirm follow-up actions",
            instructions: "Check unresolved work.",
            groupKey: "follow-up",
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
    ],
    ...overrides,
  };
}

function makeSummary(overrides: Partial<LifecycleRunSummary> = {}): LifecycleRunSummary {
  return {
    completedCount: 1,
    manualCount: 1,
    skippedCount: 0,
    blockedCount: 0,
    unresolvedFollowUps: [
      {
        stepKey: "follow-up-confirm-closure",
        title: "Confirm follow-up actions",
        groupKey: "follow-up",
        status: "pending",
        reason: null,
      },
    ],
    groups: [
      {
        key: "identity",
        title: "Identity",
        pendingCount: 0,
        completedCount: 1,
        manualCount: 1,
        skippedCount: 0,
        blockedCount: 0,
        unresolvedCount: 0,
      },
      {
        key: "follow-up",
        title: "Follow-up",
        pendingCount: 1,
        completedCount: 0,
        manualCount: 0,
        skippedCount: 0,
        blockedCount: 0,
        unresolvedCount: 1,
      },
    ],
    ...overrides,
  };
}

function makeRepository() {
  const run = makeRun();
  const summary = makeSummary();
  const activeRuns: LifecycleRunListRow[] = [
    {
      id: run.id,
      kind: run.kind,
      templateKey: run.templateKey,
      templateVersion: run.templateVersion,
      subjectDisplayName: run.subjectDisplayName,
      subjectEmail: run.subjectEmail,
      requestedBy: run.requestedBy,
      status: run.status,
      startedAt: run.startedAt,
      closedAt: run.closedAt,
      updatedAt: run.updatedAt,
    },
  ];
  let lastStepUpdate: LifecycleStepUpdateInput | null = null;

  return {
    repository: {
      async listTemplates() {
        return lifecycleTemplates;
      },
      async listActiveRuns() {
        return activeRuns;
      },
      async startRun() {
        return run;
      },
      async getRun(runId: string) {
        return runId === run.id ? run : null;
      },
      async updateRunStep(runId: string, stepId: string, input: LifecycleStepUpdateInput) {
        if (runId !== run.id || stepId !== "follow-up-confirm-closure") {
          return null;
        }

        lastStepUpdate = input;
        return makeRun({
          updatedAt: "2026-03-26T21:20:00.000Z",
          groups: run.groups.map((group) =>
            group.key === "follow-up"
              ? {
                  ...group,
                  steps: group.steps.map((step) =>
                    step.key === stepId
                      ? {
                          ...step,
                          status: input.status,
                          statusReason: input.statusReason ?? null,
                          note: input.note ?? null,
                          ticketId: input.ticketId ?? null,
                          assetId: input.assetId ?? null,
                          mailboxRef: input.mailboxRef ?? null,
                          handoffRef: input.handoffRef ?? null,
                          completedAt: "2026-03-26T21:20:00.000Z",
                        }
                      : step,
                  ),
                }
              : group,
          ),
        });
      },
      async getRunSummary(runId: string) {
        return runId === run.id ? summary : null;
      },
      async closeRun(runId: string) {
        return runId === run.id ? summary : null;
      },
    },
    getLastStepUpdate() {
      return lastStepUpdate;
    },
  };
}

test("GET /api/lifecycle/templates returns onboarding and offboarding templates with grouped metadata", async (t) => {
  const lifecycle = makeRepository();
  const { app } = buildServer({
    env: testEnv,
    lifecycleRoutes: {
      lifecycleRepository: lifecycle.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const response = await app.inject({
    method: "GET",
    url: "/api/lifecycle/templates",
  });

  assert.equal(response.statusCode, 200);
  const body = response.json() as {
    items: Array<{ templateKey: string; groups: Array<{ groupKey: string }> }>;
  };

  assert.deepEqual(
    body.items.map((item) => item.templateKey),
    ["employee-onboarding", "employee-offboarding"],
  );
  assert.equal(body.items[0]?.groups[0]?.groupKey, "identity");
  assert.equal(body.items[1]?.groups[0]?.groupKey, "handoff");
});

test("POST /api/lifecycle/runs launches a run and GET /api/lifecycle/runs returns active rows with updatedAt", async (t) => {
  const lifecycle = makeRepository();
  const { app } = buildServer({
    env: testEnv,
    lifecycleRoutes: {
      lifecycleRepository: lifecycle.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const launchResponse = await app.inject({
    method: "POST",
    url: "/api/lifecycle/runs",
    payload: {
      templateKey: "employee-onboarding",
      subjectDisplayName: "Taylor Admin",
      subjectEmail: "taylor@example.com",
      requestedBy: "alex@example.com",
    },
  });

  assert.equal(launchResponse.statusCode, 200);
  const launchBody = launchResponse.json() as {
    runId: string;
    templateKey: string;
    groups: Array<{ groupKey: string; steps: Array<{ stepId: string }> }>;
  };

  assert.equal(launchBody.runId, "run-1");
  assert.equal(launchBody.templateKey, "employee-onboarding");
  assert.equal(launchBody.groups[0]?.groupKey, "identity");
  assert.equal(launchBody.groups[0]?.steps[0]?.stepId, "identity-create-account");

  const listResponse = await app.inject({
    method: "GET",
    url: "/api/lifecycle/runs",
  });

  assert.equal(listResponse.statusCode, 200);
  const listBody = listResponse.json() as {
    items: Array<{ runId: string; updatedAt: string; status: string }>;
  };

  assert.equal(listBody.items[0]?.runId, "run-1");
  assert.equal(listBody.items[0]?.updatedAt, "2026-03-26T21:10:00.000Z");
  assert.equal(listBody.items[0]?.status, "active");
});

test("PATCH /api/lifecycle/runs/:runId/steps/:stepId requires statusReason for skipped and blocked statuses, but accepts structured evidence", async (t) => {
  const lifecycle = makeRepository();
  const { app } = buildServer({
    env: testEnv,
    lifecycleRoutes: {
      lifecycleRepository: lifecycle.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const invalidResponse = await app.inject({
    method: "PATCH",
    url: "/api/lifecycle/runs/run-1/steps/follow-up-confirm-closure",
    payload: {
      status: "skipped",
    },
  });

  assert.equal(invalidResponse.statusCode, 400);

  const validResponse = await app.inject({
    method: "PATCH",
    url: "/api/lifecycle/runs/run-1/steps/follow-up-confirm-closure",
    payload: {
      status: "blocked",
      statusReason: "Waiting on HR confirmation",
      note: "Hand-off pending manager response",
      ticketId: "INC-42",
      assetId: "asset-9",
      mailboxRef: "shared-mailbox",
      handoffRef: "handoff-doc",
    },
  });

  assert.equal(validResponse.statusCode, 200);
  const body = validResponse.json() as {
    groups: Array<{ steps: Array<{ statusReason: string | null; note: string | null; ticketId: string | null }> }>;
  };

  assert.equal(body.groups[1]?.steps[0]?.statusReason, "Waiting on HR confirmation");
  assert.equal(body.groups[1]?.steps[0]?.note, "Hand-off pending manager response");
  assert.equal(body.groups[1]?.steps[0]?.ticketId, "INC-42");
  assert.equal(lifecycle.getLastStepUpdate()?.statusReason, "Waiting on HR confirmation");
});

test("POST /api/lifecycle/runs/:runId/close and GET /api/lifecycle/runs/:runId/summary return deterministic counts and unresolved follow-up items", async (t) => {
  const lifecycle = makeRepository();
  const { app } = buildServer({
    env: testEnv,
    lifecycleRoutes: {
      lifecycleRepository: lifecycle.repository,
    },
  });

  t.after(async () => {
    await app.close();
  });

  const closeResponse = await app.inject({
    method: "POST",
    url: "/api/lifecycle/runs/run-1/close",
  });

  assert.equal(closeResponse.statusCode, 200);
  const closeBody = closeResponse.json() as {
    completedCount: number;
    unresolvedFollowUps: Array<{ stepId: string }>;
  };

  assert.equal(closeBody.completedCount, 1);
  assert.equal(closeBody.unresolvedFollowUps[0]?.stepId, "follow-up-confirm-closure");

  const summaryResponse = await app.inject({
    method: "GET",
    url: "/api/lifecycle/runs/run-1/summary",
  });

  assert.equal(summaryResponse.statusCode, 200);
  const summaryBody = summaryResponse.json() as {
    completedCount: number;
    unresolvedFollowUps: Array<{ stepId: string; groupKey: string }>;
  };

  assert.equal(summaryBody.completedCount, 1);
  assert.equal(summaryBody.unresolvedFollowUps[0]?.groupKey, "follow-up");
});
