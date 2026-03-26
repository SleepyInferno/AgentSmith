import type { LifecycleRunSummary } from "../../lib/lifecycle";

type LifecycleSummaryPanelProps = {
  summary: LifecycleRunSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  isVisible: boolean;
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
} as const;

export function LifecycleSummaryPanel(props: LifecycleSummaryPanelProps) {
  const { summary, isLoading, isError, isVisible } = props;

  if (!isVisible) {
    return null;
  }

  if (isLoading) {
    return <section style={panelStyle}>Loading lifecycle summary...</section>;
  }

  if (isError || !summary) {
    return <section style={panelStyle}>Unable to load the lifecycle summary right now.</section>;
  }

  return (
    <section style={{ ...panelStyle, display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <p
          style={{
            margin: 0,
            color: "#0369a1",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Final summary
        </p>
        <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.5rem" }}>
          Review the recorded outcome before moving on
        </h3>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.7, maxWidth: 860 }}>
          This summary reflects the server-derived lifecycle closure state. It records what the
          operator reviewed and documented; it does not imply the app executed the underlying admin
          work.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <SummaryStat label="completedCount" value={summary.completedCount} tone="#166534" />
        <SummaryStat label="manualCount" value={summary.manualCount} tone="#0369a1" />
        <SummaryStat label="skippedCount" value={summary.skippedCount} tone="#92400e" />
        <SummaryStat label="blockedCount" value={summary.blockedCount} tone="#b91c1c" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18 }}>
        <section
          style={{
            padding: 18,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            display: "grid",
            gap: 12,
          }}
        >
          <strong style={{ color: "#0f172a", fontSize: 16 }}>Unresolved follow-up</strong>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            Remaining manual work is separated here so the next-action queue stays visible after
            closure.
          </p>
          {summary.unresolvedFollowUps.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", display: "grid", gap: 8 }}>
              {summary.unresolvedFollowUps.map((item) => (
                <li key={item.stepId}>
                  <strong>{item.title}</strong> in <span>{item.groupKey}</span> remains{" "}
                  <span style={{ textTransform: "capitalize" }}>{item.status}</span>
                  {item.statusReason ? ` because ${item.statusReason}.` : "."}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#166534" }}>
              No unresolved follow-up remains after this run was closed.
            </p>
          )}
        </section>

        <section
          style={{
            padding: 18,
            borderRadius: 18,
            background: "#f8fafc",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            display: "grid",
            gap: 10,
          }}
        >
          <strong style={{ color: "#0f172a", fontSize: 16 }}>Grouped summary</strong>
          {summary.groups.map((group) => (
            <div
              key={group.groupKey}
              style={{
                padding: 14,
                borderRadius: 14,
                background: "#ffffff",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                display: "grid",
                gap: 4,
              }}
            >
              <strong style={{ color: "#0f172a" }}>{group.title}</strong>
              <span style={{ color: "#475569", fontSize: 14 }}>
                {group.completedCount} complete, {group.manualCount} manual, {group.pendingCount} pending
              </span>
              <span style={{ color: "#475569", fontSize: 14 }}>
                {group.skippedCount} skipped, {group.blockedCount} blocked, {group.unresolvedCount} unresolved
              </span>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}

function SummaryStat(props: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 16,
        background: "#f8fafc",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        display: "grid",
        gap: 6,
      }}
    >
      <strong style={{ color: props.tone, fontSize: "1.35rem" }}>{props.value}</strong>
      <span style={{ color: "#475569", fontWeight: 600 }}>{props.label}</span>
    </div>
  );
}
