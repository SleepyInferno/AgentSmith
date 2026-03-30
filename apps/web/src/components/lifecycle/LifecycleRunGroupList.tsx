import type { LifecycleRunGroup, LifecycleRunStatus } from "../../lib/lifecycle";
import { LifecycleStepEditor } from "./LifecycleStepEditor";

type LifecycleRunGroupListProps = {
  runId: string;
  groups: LifecycleRunGroup[];
  runStatus: LifecycleRunStatus;
};

const preferredGroupOrder = [
  "identity",
  "licensing",
  "group",
  "access",
  "device",
  "checklist",
  "handoff",
  "follow-up",
] as const;

export function LifecycleRunGroupList(props: LifecycleRunGroupListProps) {
  const { runId, groups, runStatus } = props;
  const orderedGroups = [...groups].sort((left, right) => compareGroups(left.groupKey, right.groupKey, left.position, right.position));
  const isReadOnly = runStatus !== "active";

  return (
    <section style={{ display: "grid", gap: 18 }}>
      {orderedGroups.map((group) => {
        const counts = getCounts(group);

        return (
          <article
            key={group.groupKey}
            style={{
              padding: 24,
              borderRadius: 24,
              background: "rgba(10, 17, 11, 0.97)",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#89ff93",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {group.groupKey}
                </p>
                <h3 style={{ margin: 0, color: "#dff4d3", fontSize: "1.35rem" }}>{group.title}</h3>
                <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>
                  Record review-safe status and evidence for each step in this section.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <ProgressChip label="pending" value={counts.pending} tone="#9eb79b" />
                <ProgressChip label="manual" value={counts.manual} tone="#89ff93" />
                <ProgressChip label="automated" value={counts.automated} tone="#86efac" />
                <ProgressChip label="skipped" value={counts.skipped} tone="#92400e" />
                <ProgressChip label="blocked" value={counts.blocked} tone="#b91c1c" />
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {group.steps.map((step) => (
                <LifecycleStepEditor
                  key={step.stepId}
                  runId={runId}
                  step={step}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function compareGroups(leftKey: string, rightKey: string, leftPosition: number, rightPosition: number) {
  const leftIndex = preferredGroupOrder.indexOf(leftKey as (typeof preferredGroupOrder)[number]);
  const rightIndex = preferredGroupOrder.indexOf(rightKey as (typeof preferredGroupOrder)[number]);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  }

  return leftPosition - rightPosition;
}

function getCounts(group: LifecycleRunGroup) {
  return group.steps.reduce(
    (counts, step) => {
      if (step.status in counts) {
        counts[step.status as keyof typeof counts] += 1;
      }
      return counts;
    },
    {
      pending: 0,
      manual: 0,
      automated: 0,
      skipped: 0,
      blocked: 0,
    },
  );
}

function ProgressChip(props: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(10, 17, 11, 0.97)",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        color: props.tone,
        fontWeight: 700,
      }}
    >
      {props.value} {props.label}
    </div>
  );
}
