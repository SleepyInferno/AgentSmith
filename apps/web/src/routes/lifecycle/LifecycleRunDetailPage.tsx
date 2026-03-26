import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  closeLifecycleRun,
  getLifecycleRun,
  getLifecycleRunSummary,
} from "../../lib/lifecycle";
import { queryClient } from "../../lib/queryClient";
import { LifecycleRunGroupList } from "../../components/lifecycle/LifecycleRunGroupList";
import { LifecycleSummaryPanel } from "../../components/lifecycle/LifecycleSummaryPanel";

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
} as const;

export function LifecycleRunDetailPage() {
  const { runId = "" } = useParams();
  const [showSummary, setShowSummary] = useState(false);

  const runQuery = useQuery({
    queryKey: ["lifecycle-run", runId],
    queryFn: () => getLifecycleRun(runId),
    enabled: runId.length > 0,
  });

  const run = runQuery.data;
  const closeRunMutation = useMutation({
    mutationFn: () => closeLifecycleRun(runId),
    onSuccess: async () => {
      setShowSummary(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lifecycle-run", runId] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-runs"] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-run-summary", runId] }),
      ]);
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["lifecycle-run-summary", runId],
    queryFn: () => getLifecycleRunSummary(runId),
    enabled: runId.length > 0 && (showSummary || (run?.status ?? "") !== "active"),
  });

  if (runQuery.isPending) {
    return <div style={panelStyle}>Loading lifecycle-run detail...</div>;
  }

  if (runQuery.isError || !run) {
    return <div style={panelStyle}>Unable to load the selected lifecycle run.</div>;
  }

  const isClosed = run.status !== "active";

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <article
        style={{
          ...panelStyle,
          background:
            "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))",
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
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <p
                style={{
                  margin: 0,
                  color: run.kind === "offboarding" ? "#b45309" : "#0369a1",
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                }}
              >
                lifecycle-run detail
              </p>
              <h2 style={{ margin: "10px 0 8px", fontSize: "2rem", color: "#0f172a" }}>
                {run.subjectDisplayName}
              </h2>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.7, maxWidth: 760 }}>
                Review grouped workflow steps, record operator evidence, and close the run only
                after the outcome has been explicitly reviewed. The app records work only; it does
                not execute the lifecycle task itself.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Badge label={run.kind} />
              <Badge label={run.status} />
              <Badge label={run.subjectEmail ?? "No subject email"} />
              <Badge label={`Requested by ${run.requestedBy}`} />
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <Link to="/lifecycle" style={{ color: "#0f172a", fontWeight: 700 }}>
              Back to lifecycle queue
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowSummary(true);
                void closeRunMutation.mutateAsync();
              }}
              disabled={isClosed || closeRunMutation.isPending}
              style={{
                padding: "12px 18px",
                borderRadius: 14,
                border: "none",
                background: isClosed || closeRunMutation.isPending ? "#cbd5e1" : "#0f172a",
                color: isClosed || closeRunMutation.isPending ? "#64748b" : "#f8fafc",
                fontWeight: 700,
                cursor: isClosed || closeRunMutation.isPending ? "not-allowed" : "pointer",
              }}
            >
              {isClosed
                ? "Run already closed"
                : closeRunMutation.isPending
                  ? "Closing..."
                  : "Close run and review summary"}
            </button>
            <Badge label={run.status} />
          </div>
        </div>

        {closeRunMutation.isError ? (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            Unable to close this run right now. {closeRunMutation.error.message}
          </div>
        ) : null}
      </article>

      <article style={panelStyle}>
        <h3 style={{ marginTop: 0, color: "#0f172a" }}>Review state before close-out</h3>
        <p style={{ margin: 0, color: "#475569", lineHeight: 1.7 }}>
          Update each grouped step with recorded status, a note when helpful, and structured
          evidence fields for ticket, asset, mailbox, or handoff references. If a step is skipped
          or blocked, the reason must be explicit before the update is sent.
        </p>
      </article>

      <LifecycleRunGroupList runId={runId} groups={run.groups} runStatus={run.status} />

      <LifecycleSummaryPanel
        summary={summaryQuery.data}
        isLoading={summaryQuery.isPending}
        isError={summaryQuery.isError}
        isVisible={showSummary || isClosed}
      />
    </section>
  );
}

function Badge(props: { label: string }) {
  return (
    <span
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(226, 232, 240, 0.8)",
        color: "#334155",
        fontWeight: 700,
      }}
    >
      {props.label}
    </span>
  );
}
