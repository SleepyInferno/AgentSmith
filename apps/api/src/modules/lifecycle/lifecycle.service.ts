import { lifecycleTemplatesByKey } from "./lifecycle.templates.js";
import type {
  LifecycleRunDetail,
  LifecycleRunGroupRecord,
  LifecycleRunSubject,
  LifecycleRunSummary,
  LifecycleStepCompletionStatus,
  LifecycleStepStatus,
  LifecycleStepUpdateInput,
  LifecycleSummaryItem,
  LifecycleTemplateKey,
} from "./lifecycle.types.js";

type LifecycleRunSnapshot = Omit<LifecycleRunDetail, "id">;

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isResolvedStatus(status: LifecycleStepStatus): status is LifecycleStepCompletionStatus {
  return status === "automated" || status === "manual" || status === "skipped" || status === "blocked";
}

function isUnresolvedFollowUp(groupKey: string, status: LifecycleStepStatus) {
  return status === "blocked" || status === "skipped" || (groupKey === "follow-up" && status === "pending");
}

export function buildLifecycleRunSnapshot(
  templateKey: LifecycleTemplateKey,
  subject: LifecycleRunSubject,
): LifecycleRunSnapshot {
  const template = lifecycleTemplatesByKey[templateKey];
  if (!template) {
    throw new Error(`Unknown lifecycle template: ${templateKey}`);
  }

  const timestamp = new Date().toISOString();

  return {
    kind: template.kind,
    templateKey: template.key,
    templateVersion: template.version,
    subjectDisplayName: subject.displayName,
    subjectEmail: subject.email,
    requestedBy: subject.requestedBy,
    status: "active",
    startedAt: timestamp,
    closedAt: null,
    updatedAt: timestamp,
    groups: template.groups
      .slice()
      .sort((left, right) => left.position - right.position)
      .map<LifecycleRunGroupRecord>((group) => ({
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
            groupKey: group.key,
            position: step.position,
            status: "pending",
            statusReason: null,
            note: null,
            ticketId: null,
            assetId: null,
            mailboxRef: null,
            handoffRef: null,
            completedAt: null,
          })),
      })),
  };
}

export function validateLifecycleStepUpdate(input: LifecycleStepUpdateInput) {
  if (!isResolvedStatus(input.status)) {
    throw new Error(`Invalid lifecycle step status: ${input.status}`);
  }

  const statusReason = normalizeOptionalText(input.statusReason);
  if ((input.status === "skipped" || input.status === "blocked") && !statusReason) {
    throw new Error("A required reason must be provided when a lifecycle step is skipped or blocked.");
  }

  return {
    status: input.status,
    statusReason,
    note: normalizeOptionalText(input.note),
    ticketId: normalizeOptionalText(input.ticketId),
    assetId: normalizeOptionalText(input.assetId),
    mailboxRef: normalizeOptionalText(input.mailboxRef),
    handoffRef: normalizeOptionalText(input.handoffRef),
    completedAt: normalizeOptionalText(input.completedAt),
  };
}

export function buildLifecycleRunSummary(run: Pick<LifecycleRunSnapshot, "groups">): LifecycleRunSummary {
  let completedCount = 0;
  let manualCount = 0;
  let skippedCount = 0;
  let blockedCount = 0;
  const unresolvedFollowUps: LifecycleSummaryItem[] = [];

  const groups = run.groups
    .slice()
    .sort((left, right) => left.position - right.position)
    .map((group) => {
      let pendingCount = 0;
      let groupCompletedCount = 0;
      let groupManualCount = 0;
      let groupSkippedCount = 0;
      let groupBlockedCount = 0;
      let unresolvedCount = 0;

      for (const step of group.steps.slice().sort((left, right) => left.position - right.position)) {
        if (step.status === "pending") {
          pendingCount += 1;
        }

        if (step.status === "automated" || step.status === "manual") {
          completedCount += 1;
          groupCompletedCount += 1;
        }

        if (step.status === "manual") {
          manualCount += 1;
          groupManualCount += 1;
        }

        if (step.status === "skipped") {
          skippedCount += 1;
          groupSkippedCount += 1;
        }

        if (step.status === "blocked") {
          blockedCount += 1;
          groupBlockedCount += 1;
        }

        if (isUnresolvedFollowUp(step.groupKey, step.status)) {
          unresolvedCount += 1;
          unresolvedFollowUps.push({
            stepKey: step.key,
            title: step.title,
            groupKey: step.groupKey,
            status: step.status,
            reason: step.statusReason,
          });
        }
      }

      return {
        key: group.key,
        title: group.title,
        pendingCount,
        completedCount: groupCompletedCount,
        manualCount: groupManualCount,
        skippedCount: groupSkippedCount,
        blockedCount: groupBlockedCount,
        unresolvedCount,
      };
    });

  return {
    completedCount,
    manualCount,
    skippedCount,
    blockedCount,
    unresolvedFollowUps,
    groups,
  };
}
