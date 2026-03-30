import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { ActiveLifecycleRuns } from "../../components/lifecycle/ActiveLifecycleRuns";
import { LifecycleTemplateCards } from "../../components/lifecycle/LifecycleTemplateCards";
import {
  getLifecycleRuns,
  getLifecycleTemplates,
  startLifecycleRun,
  type StartLifecycleRunInput,
} from "../../lib/lifecycle";

const sectionStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
} as const;

export function LifecycleQueuePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["lifecycle-templates"],
    queryFn: getLifecycleTemplates,
  });

  const runsQuery = useQuery({
    queryKey: ["lifecycle-runs"],
    queryFn: getLifecycleRuns,
  });

  const launchRunMutation = useMutation({
    mutationFn: (input: StartLifecycleRunInput) => startLifecycleRun(input),
    onSuccess: async (run) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lifecycle-templates"] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-runs"] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-run", run.runId] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-run-summary", run.runId] }),
      ]);

      navigate(`/lifecycle/runs/${run.runId}`);
    },
  });

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Lifecycle Queue" />
      <section
        style={{
          ...sectionStyle,
          display: "grid",
          gap: 14,
          background:
            "rgba(10, 17, 11, 0.97)",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#89ff93",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontWeight: 700,
            }}
          >
            Lifecycle queue
          </p>
          <h2 style={{ margin: "12px 0 10px", fontSize: "2rem" }}>Lifecycle workflows</h2>
          <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.7, maxWidth: 760 }}>
            Launch reusable onboarding and offboarding runs, keep manual evidence visible, and
            surface unresolved follow-up before the day gets away from you. Records work only - no
            live admin actions are triggered here.
          </p>
        </div>
      </section>

      <section style={{ ...sectionStyle, display: "grid", gap: 18 }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>Start a run</h3>
          <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>
            Pick a reusable workflow, capture the subject details, and create a tracked run without
            leaving the queue.
          </p>
        </div>
        <LifecycleTemplateCards
          templates={templatesQuery.data ?? []}
          isLoading={templatesQuery.isPending}
          isError={templatesQuery.isError}
          isLaunching={launchRunMutation.isPending}
          launchError={launchRunMutation.isError ? launchRunMutation.error.message : null}
          onLaunch={(input) =>
            launchRunMutation.mutateAsync({
              ...input,
              requestedBy: "Operator review queue",
            })
          }
        />
      </section>

      <section style={{ ...sectionStyle, display: "grid", gap: 18 }}>
        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: "1.35rem" }}>Active runs</h3>
          <p style={{ margin: 0, color: "#9eb79b", lineHeight: 1.6 }}>
            Review grouped progress, scan the last update time, and focus on runs with unresolved
            follow-up before reopening the guided run record.
          </p>
        </div>
        <ActiveLifecycleRuns
          runs={runsQuery.data ?? []}
          isLoading={runsQuery.isPending}
          isError={runsQuery.isError}
        />
      </section>
    </section>
  );
}
