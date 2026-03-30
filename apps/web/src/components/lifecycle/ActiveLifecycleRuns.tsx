import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getLifecycleRunSummary, type LifecycleRunListItem } from "../../lib/lifecycle";

type ActiveLifecycleRunsProps = {
  runs: LifecycleRunListItem[];
  isLoading: boolean;
  isError: boolean;
};

const panelStyle = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(10, 17, 11, 0.97)",
} as const;

export function ActiveLifecycleRuns(props: ActiveLifecycleRunsProps) {
  const { runs, isLoading, isError } = props;
  const summaryQueries = useQueries({
    queries: runs.map((run) => ({
      queryKey: ["lifecycle-run-summary", run.runId],
      queryFn: () => getLifecycleRunSummary(run.runId),
    })),
  });

  if (isLoading) {
    return <div style={panelStyle}>Loading active lifecycle runs...</div>;
  }

  if (isError) {
    return <div style={panelStyle}>Unable to load active lifecycle runs right now.</div>;
  }

  if (runs.length === 0) {
    return (
      <div style={panelStyle}>
        No active runs yet. Launch onboarding or offboarding from the templates above to start a
        tracked workflow.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {runs.map((run, index) => {
        const summaryQuery = summaryQueries[index] ?? {
          data: undefined,
          isPending: true,
          isError: false,
        };
        const summary = summaryQuery.data;
        const unresolved = summary?.unresolvedFollowUps.length ?? 0;
        const completedCount = summary?.completedCount ?? 0;
        const blockedCount = summary?.blockedCount ?? 0;
        const skippedCount = summary?.skippedCount ?? 0;
        const manualCount = summary?.manualCount ?? 0;

        return (
          <article
            key={run.runId}
            style={{
              ...panelStyle,
              display: "grid",
              gap: 16,
              background: unresolved > 0 ? "rgba(244, 192, 73, 0.08)" : "rgba(10, 17, 11, 0.97)",
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
                    color: run.kind === "offboarding" ? "#b45309" : "#89ff93",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {run.kind}
                </p>
                <h4 style={{ margin: 0, fontSize: "1.2rem", color: "#dff4d3" }}>{run.subjectDisplayName}</h4>
                <p style={{ margin: 0, color: "#9eb79b" }}>
                  {run.subjectEmail ?? "No email captured"} · updatedAt {formatUpdatedAt(run.updatedAt)}
                </p>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: unresolved > 0 ? "rgba(249, 115, 22, 0.14)" : "rgba(14, 165, 233, 0.12)",
                  color: unresolved > 0 ? "#fdba74" : "#075985",
                  fontWeight: 700,
                }}
              >
                {unresolved} unresolved
              </div>
            </div>

            {summaryQuery.isPending ? (
              <p style={{ margin: 0, color: "#9eb79b" }}>Loading grouped progress...</p>
            ) : summaryQuery.isError ? (
              <p style={{ margin: 0, color: "#fca5a5" }}>Unable to load grouped progress.</p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <ProgressStat label="completed" value={completedCount} tone="#86efac" />
                  <ProgressStat label="manual" value={manualCount} tone="#89ff93" />
                  <ProgressStat label="blocked" value={blockedCount} tone="#b91c1c" />
                  <ProgressStat label="skipped" value={skippedCount} tone="#92400e" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {summary?.groups.map((group) => (
                    <section
                      key={group.groupKey}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(10, 17, 11, 0.97)",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <strong style={{ color: "#dff4d3" }}>{group.title}</strong>
                      <span style={{ color: "#9eb79b", fontSize: 14 }}>
                        {group.completedCount} complete · {group.pendingCount} pending
                      </span>
                      <span style={{ color: "#9eb79b", fontSize: 14 }}>
                        {group.unresolvedCount} unresolved · {group.blockedCount} blocked
                      </span>
                    </section>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ color: "#dff4d3" }}>Unresolved follow-up</strong>
                  {summary && summary.unresolvedFollowUps.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#9eb79b", display: "grid", gap: 6 }}>
                      {summary.unresolvedFollowUps.map((item) => (
                        <li key={item.stepId}>
                          {item.title} ({item.status}){item.statusReason ? ` - ${item.statusReason}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, color: "#9eb79b" }}>No unresolved follow-up right now.</p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#9eb79b", fontSize: 14 }}>
                    Reopen the guided run record to update steps and review close-out.
                  </span>
                  <Link
                    to={`/lifecycle/runs/${run.runId}`}
                    style={{
                      color: "#dff4d3",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Open run details
                  </Link>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ProgressStat(props: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 14,
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

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return updatedAt;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
