export const lifecycleTemplateKeys = ["employee-onboarding", "employee-offboarding"] as const;

export type LifecycleTemplateKey = (typeof lifecycleTemplateKeys)[number];
export type LifecycleRunKind = "onboarding" | "offboarding";
export type LifecycleRunStatus = "active" | "completed";
export type LifecycleStepStatus = "pending" | "automated" | "manual" | "skipped" | "blocked";
export type LifecycleStepCompletionStatus = Exclude<LifecycleStepStatus, "pending">;

export type LifecycleTemplateStep = {
  key: string;
  title: string;
  instructions: string;
  position: number;
};

export type LifecycleTemplateGroup = {
  key: string;
  title: string;
  position: number;
  steps: LifecycleTemplateStep[];
};

export type LifecycleTemplate = {
  key: LifecycleTemplateKey;
  kind: LifecycleRunKind;
  version: number;
  title: string;
  description: string;
  groups: LifecycleTemplateGroup[];
};

export type LifecycleRunStepEvidence = {
  note: string | null;
  ticketId: string | null;
  assetId: string | null;
  mailboxRef: string | null;
  handoffRef: string | null;
};

export type LifecycleRunStepRecord = {
  key: string;
  title: string;
  instructions: string;
  groupKey: string;
  position: number;
  status: LifecycleStepStatus;
  statusReason: string | null;
  completedAt: string | null;
} & LifecycleRunStepEvidence;

export type LifecycleRunGroupRecord = {
  key: string;
  title: string;
  position: number;
  steps: LifecycleRunStepRecord[];
};

export type LifecycleRunListRow = {
  id: string;
  kind: LifecycleRunKind;
  templateKey: LifecycleTemplateKey;
  templateVersion: number;
  subjectDisplayName: string;
  subjectEmail: string | null;
  requestedBy: string;
  status: LifecycleRunStatus;
  startedAt: string;
  closedAt: string | null;
  updatedAt: string;
};

export type LifecycleRunDetail = LifecycleRunListRow & {
  groups: LifecycleRunGroupRecord[];
};

export type LifecycleRunSubject = {
  displayName: string;
  email: string | null;
  requestedBy: string;
};

export type LifecycleStepUpdateInput = {
  status: LifecycleStepCompletionStatus;
  statusReason?: string | null;
  note?: string | null;
  ticketId?: string | null;
  assetId?: string | null;
  mailboxRef?: string | null;
  handoffRef?: string | null;
  completedAt?: string | null;
};

export type LifecycleStepGroupSummary = {
  key: string;
  title: string;
  pendingCount: number;
  completedCount: number;
  manualCount: number;
  skippedCount: number;
  blockedCount: number;
  unresolvedCount: number;
};

export type LifecycleSummaryItem = {
  stepKey: string;
  title: string;
  groupKey: string;
  status: LifecycleStepStatus;
  reason: string | null;
};

export type LifecycleRunSummary = {
  completedCount: number;
  manualCount: number;
  skippedCount: number;
  blockedCount: number;
  unresolvedFollowUps: LifecycleSummaryItem[];
  groups: LifecycleStepGroupSummary[];
};
