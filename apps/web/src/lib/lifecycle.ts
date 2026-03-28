import { apiGet, apiRequest } from "./api";

export type LifecycleTemplateKey = "employee-onboarding" | "employee-offboarding";
export type LifecycleRunStatus = "active" | "completed" | string;
export type LifecycleStepStatus = "pending" | "manual" | "automated" | "skipped" | "blocked" | string;

export type LifecycleTemplateStep = {
  stepId: string;
  title: string;
  instructions: string;
  position: number;
};

export type LifecycleTemplateGroup = {
  groupKey: string;
  title: string;
  position: number;
  steps: LifecycleTemplateStep[];
};

export type LifecycleTemplate = {
  templateKey: LifecycleTemplateKey;
  kind: string;
  version: number;
  title: string;
  description: string;
  groups: LifecycleTemplateGroup[];
};

export type LifecycleRunStep = {
  stepId: string;
  title: string;
  instructions: string;
  groupKey: string;
  position: number;
  status: LifecycleStepStatus;
  statusReason: string | null;
  note: string | null;
  ticketId: string | null;
  assetId: string | null;
  mailboxRef: string | null;
  handoffRef: string | null;
  completedAt: string | null;
};

export type LifecycleRunGroup = {
  groupKey: string;
  title: string;
  position: number;
  steps: LifecycleRunStep[];
};

export type LifecycleRunListItem = {
  runId: string;
  templateKey: LifecycleTemplateKey;
  templateVersion: number;
  kind: string;
  subjectDisplayName: string;
  subjectEmail: string | null;
  requestedBy: string;
  status: LifecycleRunStatus;
  startedAt: string;
  closedAt: string | null;
  updatedAt: string;
};

export type LifecycleRunDetail = LifecycleRunListItem & {
  groups: LifecycleRunGroup[];
};

export type LifecycleRunSummaryGroup = {
  groupKey: string;
  title: string;
  pendingCount: number;
  completedCount: number;
  manualCount: number;
  skippedCount: number;
  blockedCount: number;
  unresolvedCount: number;
};

export type LifecycleUnresolvedFollowUp = {
  stepId: string;
  title: string;
  groupKey: string;
  status: LifecycleStepStatus;
  statusReason: string | null;
};

export type LifecycleRunSummary = {
  completedCount: number;
  manualCount: number;
  skippedCount: number;
  blockedCount: number;
  unresolvedFollowUps: LifecycleUnresolvedFollowUp[];
  groups: LifecycleRunSummaryGroup[];
};

export type StartLifecycleRunInput = {
  templateKey: LifecycleTemplateKey;
  subjectDisplayName: string;
  subjectEmail?: string | null;
  requestedBy: string;
};

export type UpdateLifecycleStepInput = {
  status: Exclude<LifecycleStepStatus, "pending">;
  statusReason?: string | null;
  note?: string | null;
  ticketId?: string | null;
  assetId?: string | null;
  mailboxRef?: string | null;
  handoffRef?: string | null;
};

type TemplateResponse = {
  items: LifecycleTemplate[];
};

type RunListResponse = {
  items: LifecycleRunListItem[];
};

export function getLifecycleTemplates() {
  return apiGet<TemplateResponse>("/api/lifecycle/templates").then((response) => response.items);
}

export function getLifecycleRuns() {
  return apiGet<RunListResponse>("/api/lifecycle/runs").then((response) => response.items);
}

export function getLifecycleRun(runId: string) {
  return apiGet<LifecycleRunDetail>(`/api/lifecycle/runs/${runId}`);
}

export function getLifecycleRunSummary(runId: string) {
  return apiGet<LifecycleRunSummary>(`/api/lifecycle/runs/${runId}/summary`);
}

export function startLifecycleRun(input: StartLifecycleRunInput) {
  return apiRequest<LifecycleRunDetail>("/api/lifecycle/runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLifecycleStep(input: { runId: string; stepId: string; values: UpdateLifecycleStepInput }) {
  return apiRequest<LifecycleRunDetail>(`/api/lifecycle/runs/${input.runId}/steps/${input.stepId}`, {
    method: "PATCH",
    body: JSON.stringify(input.values),
  });
}

export function closeLifecycleRun(runId: string) {
  return apiRequest<LifecycleRunSummary>(`/api/lifecycle/runs/${runId}/close`, {
    method: "POST",
  });
}
