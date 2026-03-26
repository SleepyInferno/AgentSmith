import { PrismaClient, type AuditEvent, type LifecycleRun, type LifecycleRunGroup, type LifecycleRunStep, type Prisma } from "@prisma/client";
import { buildLifecycleRunSnapshot, buildLifecycleRunSummary, validateLifecycleStepUpdate } from "./lifecycle.service.js";
import { lifecycleTemplates } from "./lifecycle.templates.js";
import type {
  LifecycleRunDetail,
  LifecycleRunListRow,
  LifecycleRunSummary,
  LifecycleStepUpdateInput,
  LifecycleTemplate,
  LifecycleTemplateKey,
} from "./lifecycle.types.js";

type LifecycleRunRecord = LifecycleRun & {
  groups: Array<LifecycleRunGroup & { steps: LifecycleRunStep[] }>;
};

type StartLifecycleRunInput = {
  templateKey: LifecycleTemplateKey;
  subjectDisplayName: string;
  subjectEmail: string | null;
  requestedBy: string;
};

const lifecycleRunInclude = {
  groups: {
    include: {
      steps: true,
    },
    orderBy: {
      position: "asc",
    },
  },
} satisfies Prisma.LifecycleRunInclude;

export class LifecycleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listTemplates(): Promise<LifecycleTemplate[]> {
    return lifecycleTemplates.map((template) => ({
      ...template,
      groups: template.groups.map((group) => ({
        ...group,
        steps: [...group.steps],
      })),
    }));
  }

  async listActiveRuns(): Promise<LifecycleRunListRow[]> {
    const runs = await this.prisma.lifecycleRun.findMany({
      where: {
        status: "active",
      },
      orderBy: [{ updatedAt: "desc" }, { startedAt: "desc" }],
    });

    return runs.map(mapLifecycleRunListRow);
  }

  async startRun(input: StartLifecycleRunInput): Promise<LifecycleRunDetail> {
    const snapshot = buildLifecycleRunSnapshot(input.templateKey, {
      displayName: input.subjectDisplayName,
      email: input.subjectEmail,
      requestedBy: input.requestedBy,
    });

    const run = await this.prisma.$transaction(async (tx) => {
      const createdRun = await tx.lifecycleRun.create({
        data: {
          kind: snapshot.kind,
          templateKey: snapshot.templateKey,
          templateVersion: snapshot.templateVersion,
          subjectDisplayName: snapshot.subjectDisplayName,
          subjectEmail: snapshot.subjectEmail,
          requestedBy: snapshot.requestedBy,
          status: snapshot.status,
          startedAt: new Date(snapshot.startedAt),
          updatedAt: new Date(snapshot.updatedAt),
          groups: {
            create: snapshot.groups.map((group) => ({
              key: group.key,
              title: group.title,
              position: group.position,
              steps: {
                create: group.steps.map((step) => ({
                  key: step.key,
                  title: step.title,
                  instructions: step.instructions,
                  groupKey: step.groupKey,
                  position: step.position,
                  status: step.status,
                })),
              },
            })),
          },
        },
        include: lifecycleRunInclude,
      });

      await tx.auditEvent.create({
        data: buildAuditEvent({
          action: "lifecycle.run.started",
          targetId: createdRun.id,
          result: "success",
          metadata: {
            templateKey: createdRun.templateKey,
            templateVersion: createdRun.templateVersion,
            kind: createdRun.kind,
            subjectDisplayName: createdRun.subjectDisplayName,
            subjectEmail: createdRun.subjectEmail,
            requestedBy: createdRun.requestedBy,
          },
        }),
      });

      return createdRun;
    });

    return mapLifecycleRunDetail(run);
  }

  async getRun(runId: string): Promise<LifecycleRunDetail | null> {
    const run = await this.prisma.lifecycleRun.findUnique({
      where: {
        id: runId,
      },
      include: lifecycleRunInclude,
    });

    return run ? mapLifecycleRunDetail(run) : null;
  }

  async updateRunStep(runId: string, stepId: string, input: LifecycleStepUpdateInput): Promise<LifecycleRunDetail | null> {
    const payload = validateLifecycleStepUpdate(input);
    const now = payload.completedAt ? new Date(payload.completedAt) : new Date();

    const run = await this.prisma.$transaction(async (tx) => {
      const existingRun = await tx.lifecycleRun.findUnique({
        where: {
          id: runId,
        },
      });

      if (!existingRun) {
        return null;
      }

      const existingStep = await tx.lifecycleRunStep.findUnique({
        where: {
          runId_key: {
            runId,
            key: stepId,
          },
        },
      });

      if (!existingStep) {
        return null;
      }

      await tx.lifecycleRunStep.update({
        where: {
          runId_key: {
            runId,
            key: stepId,
          },
        },
        data: {
          status: payload.status,
          statusReason: payload.statusReason,
          note: payload.note,
          ticketId: payload.ticketId,
          assetId: payload.assetId,
          mailboxRef: payload.mailboxRef,
          handoffRef: payload.handoffRef,
          completedAt: now,
        },
      });

      await tx.lifecycleRun.update({
        where: {
          id: runId,
        },
        data: {
          updatedAt: now,
        },
      });

      await tx.auditEvent.create({
        data: buildAuditEvent({
          action: "lifecycle.step.updated",
          targetId: runId,
          result: "success",
          metadata: {
            stepId,
            status: payload.status,
            statusReason: payload.statusReason,
            note: payload.note,
            ticketId: payload.ticketId,
            assetId: payload.assetId,
            mailboxRef: payload.mailboxRef,
            handoffRef: payload.handoffRef,
            completedAt: now.toISOString(),
          },
        }),
      });

      return tx.lifecycleRun.findUnique({
        where: {
          id: runId,
        },
        include: lifecycleRunInclude,
      });
    });

    return run ? mapLifecycleRunDetail(run) : null;
  }

  async getRunSummary(runId: string): Promise<LifecycleRunSummary | null> {
    const run = await this.getRun(runId);
    return run ? buildLifecycleRunSummary(run) : null;
  }

  async closeRun(runId: string): Promise<LifecycleRunSummary | null> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const run = await tx.lifecycleRun.findUnique({
        where: {
          id: runId,
        },
        include: lifecycleRunInclude,
      });

      if (!run) {
        return null;
      }

      const summary = buildLifecycleRunSummary(mapLifecycleRunDetail(run));

      await tx.lifecycleRun.update({
        where: {
          id: runId,
        },
        data: {
          status: "completed",
          closedAt: now,
          updatedAt: now,
        },
      });

      await tx.auditEvent.create({
        data: buildAuditEvent({
          action: "lifecycle.run.closed",
          targetId: runId,
          result: "success",
          metadata: {
            completedCount: summary.completedCount,
            manualCount: summary.manualCount,
            skippedCount: summary.skippedCount,
            blockedCount: summary.blockedCount,
            unresolvedFollowUps: summary.unresolvedFollowUps,
            closedAt: now.toISOString(),
          },
        }),
      });

      return summary;
    });
  }
}

function mapLifecycleRunListRow(run: LifecycleRun): LifecycleRunListRow {
  return {
    id: run.id,
    kind: run.kind,
    templateKey: run.templateKey as LifecycleTemplateKey,
    templateVersion: run.templateVersion,
    subjectDisplayName: run.subjectDisplayName,
    subjectEmail: run.subjectEmail,
    requestedBy: run.requestedBy,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    closedAt: run.closedAt?.toISOString() ?? null,
    updatedAt: run.updatedAt.toISOString(),
  };
}

function mapLifecycleRunDetail(run: LifecycleRunRecord): LifecycleRunDetail {
  return {
    ...mapLifecycleRunListRow(run),
    groups: run.groups.map((group) => ({
      key: group.key,
      title: group.title,
      position: group.position,
      steps: group.steps
        .slice()
        .sort((left, right) => left.position - right.position)
        .map((step) => ({
          key: step.key,
          title: step.title,
          instructions: step.instructions,
          groupKey: step.groupKey,
          position: step.position,
          status: step.status,
          statusReason: step.statusReason,
          note: step.note,
          ticketId: step.ticketId,
          assetId: step.assetId,
          mailboxRef: step.mailboxRef,
          handoffRef: step.handoffRef,
          completedAt: step.completedAt?.toISOString() ?? null,
        })),
    })),
  };
}

function buildAuditEvent(input: {
  action: "lifecycle.run.started" | "lifecycle.step.updated" | "lifecycle.run.closed";
  targetId: string;
  result: string;
  metadata: Prisma.JsonObject;
}): Omit<AuditEvent, "id" | "timestamp" | "createdAt"> {
  return {
    actorId: null,
    action: input.action,
    targetType: "LifecycleRun",
    targetId: input.targetId,
    result: input.result,
    metadata: input.metadata,
  };
}
