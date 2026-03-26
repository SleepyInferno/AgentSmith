import type { FastifyInstance, FastifyPluginOptions, preHandlerHookHandler } from "fastify";
import type { LifecycleRepository } from "../modules/lifecycle/lifecycle.repository.js";
import { lifecycleTemplateKeys, type LifecycleStepUpdateInput } from "../modules/lifecycle/lifecycle.types.js";

export type LifecycleRoutesDependencies = {
  lifecycleRepository: Pick<
    LifecycleRepository,
    "listTemplates" | "listActiveRuns" | "startRun" | "getRun" | "updateRunStep" | "getRunSummary" | "closeRun"
  >;
  preHandler?: preHandlerHookHandler | preHandlerHookHandler[];
};

type LifecycleRoutesOptions = FastifyPluginOptions & LifecycleRoutesDependencies;

export async function registerLifecycleRoutes(app: FastifyInstance, options: LifecycleRoutesOptions) {
  const routeOptions = options.preHandler ? { preHandler: options.preHandler } : {};

  app.get("/api/lifecycle/templates", routeOptions, async () => {
    const templates = await options.lifecycleRepository.listTemplates();

    return {
      items: templates.map(mapTemplateResponse),
    };
  });

  app.get("/api/lifecycle/runs", routeOptions, async () => {
    const runs = await options.lifecycleRepository.listActiveRuns();

    return {
      items: runs.map(mapRunListRowResponse),
    };
  });

  app.post<{
    Body: {
      templateKey?: string;
      subjectDisplayName?: string;
      subjectEmail?: string | null;
      requestedBy?: string;
    };
  }>("/api/lifecycle/runs", routeOptions, async (request, reply) => {
    const templateKey = parseTemplateKey(request.body?.templateKey);
    const subjectDisplayName = normalizeRequiredText(request.body?.subjectDisplayName);
    const requestedBy = normalizeRequiredText(request.body?.requestedBy);
    const subjectEmail = normalizeOptionalText(request.body?.subjectEmail);

    if (!templateKey || !subjectDisplayName || !requestedBy) {
      reply.code(400);
      return {
        message: "templateKey, subjectDisplayName, and requestedBy are required.",
      };
    }

    const run = await options.lifecycleRepository.startRun({
      templateKey,
      subjectDisplayName,
      subjectEmail,
      requestedBy,
    });

    return mapRunDetailResponse(run);
  });

  app.get<{ Params: { runId: string } }>("/api/lifecycle/runs/:runId", routeOptions, async (request, reply) => {
    const run = await options.lifecycleRepository.getRun(request.params.runId);

    if (!run) {
      reply.code(404);
      return {
        message: "Lifecycle run not found",
      };
    }

    return mapRunDetailResponse(run);
  });

  app.patch<{
    Params: { runId: string; stepId: string };
    Body: LifecycleStepUpdateInput;
  }>("/api/lifecycle/runs/:runId/steps/:stepId", routeOptions, async (request, reply) => {
    const status = request.body?.status;
    const statusReason = normalizeOptionalText(request.body?.statusReason);

    if (!status || !isValidStepStatus(status)) {
      reply.code(400);
      return {
        message: "status must be one of automated, manual, skipped, or blocked.",
      };
    }

    if ((status === "skipped" || status === "blocked") && !statusReason) {
      reply.code(400);
      return {
        message: "statusReason is required when a lifecycle step is skipped or blocked.",
      };
    }

    try {
      const run = await options.lifecycleRepository.updateRunStep(request.params.runId, request.params.stepId, {
        ...request.body,
        status,
        statusReason,
        note: normalizeOptionalText(request.body?.note),
        ticketId: normalizeOptionalText(request.body?.ticketId),
        assetId: normalizeOptionalText(request.body?.assetId),
        mailboxRef: normalizeOptionalText(request.body?.mailboxRef),
        handoffRef: normalizeOptionalText(request.body?.handoffRef),
      });

      if (!run) {
        reply.code(404);
        return {
          message: "Lifecycle run or step not found",
        };
      }

      return mapRunDetailResponse(run);
    } catch (error) {
      reply.code(400);
      return {
        message: error instanceof Error ? error.message : "Invalid lifecycle step update.",
      };
    }
  });

  app.get<{ Params: { runId: string } }>("/api/lifecycle/runs/:runId/summary", routeOptions, async (request, reply) => {
    const summary = await options.lifecycleRepository.getRunSummary(request.params.runId);

    if (!summary) {
      reply.code(404);
      return {
        message: "Lifecycle summary not found",
      };
    }

    return mapRunSummaryResponse(summary);
  });

  app.post<{ Params: { runId: string } }>("/api/lifecycle/runs/:runId/close", routeOptions, async (request, reply) => {
    const summary = await options.lifecycleRepository.closeRun(request.params.runId);

    if (!summary) {
      reply.code(404);
      return {
        message: "Lifecycle run not found",
      };
    }

    return mapRunSummaryResponse(summary);
  });
}

function normalizeRequiredText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTemplateKey(value?: string) {
  return value && lifecycleTemplateKeys.includes(value as (typeof lifecycleTemplateKeys)[number])
    ? (value as (typeof lifecycleTemplateKeys)[number])
    : null;
}

function isValidStepStatus(status: string): status is LifecycleStepUpdateInput["status"] {
  return status === "automated" || status === "manual" || status === "skipped" || status === "blocked";
}

function mapTemplateResponse(template: Awaited<ReturnType<LifecycleRepository["listTemplates"]>>[number]) {
  return {
    templateKey: template.key,
    kind: template.kind,
    version: template.version,
    title: template.title,
    description: template.description,
    groups: template.groups.map((group) => ({
      groupKey: group.key,
      title: group.title,
      position: group.position,
      steps: group.steps.map((step) => ({
        stepId: step.key,
        title: step.title,
        instructions: step.instructions,
        position: step.position,
      })),
    })),
  };
}

function mapRunListRowResponse(run: Awaited<ReturnType<LifecycleRepository["listActiveRuns"]>>[number]) {
  return {
    runId: run.id,
    templateKey: run.templateKey,
    templateVersion: run.templateVersion,
    kind: run.kind,
    subjectDisplayName: run.subjectDisplayName,
    subjectEmail: run.subjectEmail,
    requestedBy: run.requestedBy,
    status: run.status,
    startedAt: run.startedAt,
    closedAt: run.closedAt,
    updatedAt: run.updatedAt,
  };
}

function mapRunDetailResponse(run: Awaited<ReturnType<LifecycleRepository["getRun"]>> extends Promise<infer TValue> ? Exclude<TValue, null> : never) {
  return {
    ...mapRunListRowResponse(run),
    groups: run.groups.map((group) => ({
      groupKey: group.key,
      title: group.title,
      position: group.position,
      steps: group.steps.map((step) => ({
        stepId: step.key,
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
        completedAt: step.completedAt,
      })),
    })),
  };
}

function mapRunSummaryResponse(summary: Awaited<ReturnType<LifecycleRepository["getRunSummary"]>> extends Promise<infer TValue> ? Exclude<TValue, null> : never) {
  return {
    completedCount: summary.completedCount,
    manualCount: summary.manualCount,
    skippedCount: summary.skippedCount,
    blockedCount: summary.blockedCount,
    unresolvedFollowUps: summary.unresolvedFollowUps.map((item) => ({
      stepId: item.stepKey,
      title: item.title,
      groupKey: item.groupKey,
      status: item.status,
      statusReason: item.reason,
    })),
    groups: summary.groups.map((group) => ({
      groupKey: group.key,
      title: group.title,
      pendingCount: group.pendingCount,
      completedCount: group.completedCount,
      manualCount: group.manualCount,
      skippedCount: group.skippedCount,
      blockedCount: group.blockedCount,
      unresolvedCount: group.unresolvedCount,
    })),
  };
}
