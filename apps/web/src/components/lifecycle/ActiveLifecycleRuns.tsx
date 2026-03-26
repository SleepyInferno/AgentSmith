import { useQueries } from "@tanstack/react-query";
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
  background: "rgba(248, 250, 252, 0.96)",
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
              background: unresolved > 0 ? "#fff7ed" : "rgba(248, 250, 252, 0.96)",
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
                    color: run.kind === "offboarding" ? "#b45309" : "#0369a1",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {run.kind}
                </p>
                <h4 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>{run.subjectDisplayName}</h4>
                <p style={{ margin: 0, color: "#475569" }}>
                  {run.subjectEmail ?? "No email captured"} · updatedAt {formatUpdatedAt(run.updatedAt)}
                </p>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: unresolved > 0 ? "rgba(249, 115, 22, 0.14)" : "rgba(14, 165, 233, 0.12)",
                  color: unresolved > 0 ? "#9a3412" : "#075985",
                  fontWeight: 700,
                }}
              >
                {unresolved} unresolved
              </div>
            </div>

            {summaryQuery.isPending ? (
              <p style={{ margin: 0, color: "#475569" }}>Loading grouped progress...</p>
            ) : summaryQuery.isError ? (
              <p style={{ margin: 0, color: "#991b1b" }}>Unable to load grouped progress.</p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <ProgressStat label="completed" value={completedCount} tone="#166534" />
                  <ProgressStat label="manual" value={manualCount} tone="#0369a1" />
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
                        background: "#ffffff",
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <strong style={{ color: "#0f172a" }}>{group.title}</strong>
                      <span style={{ color: "#475569", fontSize: 14 }}>
                        {group.completedCount} complete · {group.pendingCount} pending
                      </span>
                      <span style={{ color: "#475569", fontSize: 14 }}>
                        {group.unresolvedCount} unresolved · {group.blockedCount} blocked
                      </span>
                    </section>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <strong style={{ color: "#0f172a" }}>Unresolved follow-up</strong>
                  {summary && summary.unresolvedFollowUps.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#475569", display: "grid", gap: 6 }}>
                      {summary.unresolvedFollowUps.map((item) => (
                        <li key={item.stepId}>
                          {item.title} ({item.status}){item.statusReason ? ` - ${item.statusReason}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, color: "#475569" }}>No unresolved follow-up right now.</p>
                  )}
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
        background: "#ffffff",
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
