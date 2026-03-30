import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateLifecycleStep,
  type LifecycleRunStep,
  type LifecycleStepStatus,
  type UpdateLifecycleStepInput,
} from "../../lib/lifecycle";

type LifecycleStepEditorProps = {
  runId: string;
  step: LifecycleRunStep;
  isReadOnly: boolean;
};

type FormState = {
  status: Exclude<LifecycleStepStatus, "pending">;
  statusReason: string;
  note: string;
  ticketId: string;
  assetId: string;
  mailboxRef: string;
  handoffRef: string;
};

const statusOptions: Array<{ value: Exclude<LifecycleStepStatus, "pending">; label: string }> = [
  { value: "automated", label: "automated" },
  { value: "manual", label: "manual" },
  { value: "skipped", label: "skipped" },
  { value: "blocked", label: "blocked" },
];

export function LifecycleStepEditor(props: LifecycleStepEditorProps) {
  const { runId, step, isReadOnly } = props;
  const [form, setForm] = useState<FormState>(() => getInitialForm(step));
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setForm(getInitialForm(step));
    setValidationMessage(null);
  }, [step]);

  const mutation = useMutation({
    mutationFn: (values: UpdateLifecycleStepInput) =>
      updateLifecycleStep({
        runId,
        stepId: step.stepId,
        values,
      }),
    onSuccess: async () => {
      setValidationMessage(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lifecycle-run", runId] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-runs"] }),
        queryClient.invalidateQueries({ queryKey: ["lifecycle-run-summary", runId] }),
      ]);
    },
  });

  const requiresReason = form.status === "skipped" || form.status === "blocked";
  const isSaving = mutation.isPending;

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (requiresReason && form.statusReason.trim().length === 0) {
      setValidationMessage("statusReason is required when a step is skipped or blocked.");
      return;
    }

    const payload: UpdateLifecycleStepInput = {
      status: form.status,
      statusReason: normalizeOptional(form.statusReason),
      note: normalizeOptional(form.note),
      ticketId: normalizeOptional(form.ticketId),
      assetId: normalizeOptional(form.assetId),
      mailboxRef: normalizeOptional(form.mailboxRef),
      handoffRef: normalizeOptional(form.handoffRef),
    };

    await mutation.mutateAsync(payload);
  }

  return (
    <article
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(10, 17, 11, 0.97)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <strong style={{ color: "#dff4d3", fontSize: 16 }}>{step.title}</strong>
            <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>{step.instructions}</span>
          </div>
          <span
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              background: "rgba(226, 232, 240, 0.7)",
              color: "#9eb79b",
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            {step.status}
          </span>
        </div>
        {step.completedAt ? (
          <span style={{ color: "#9eb79b", fontSize: 13 }}>
            Last recorded {formatTimestamp(step.completedAt)}
          </span>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value as Exclude<LifecycleStepStatus, "pending">)
            }
            disabled={isReadOnly || isSaving}
            style={fieldStyle}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>
            Exception reason {requiresReason ? "(required for skipped or blocked)" : "(optional)"}
          </span>
          <textarea
            value={form.statusReason}
            onChange={(event) => updateField("statusReason", event.target.value)}
            disabled={isReadOnly || isSaving}
            rows={3}
            placeholder="Document why the step was skipped or blocked."
            style={textAreaStyle}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={labelStyle}>Operator note</span>
          <textarea
            value={form.note}
            onChange={(event) => updateField("note", event.target.value)}
            disabled={isReadOnly || isSaving}
            rows={3}
            placeholder="Record what was reviewed or completed outside this app."
            style={textAreaStyle}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>ticketId</span>
            <input
              value={form.ticketId}
              onChange={(event) => updateField("ticketId", event.target.value)}
              disabled={isReadOnly || isSaving}
              placeholder="TCK-1024"
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>assetId</span>
            <input
              value={form.assetId}
              onChange={(event) => updateField("assetId", event.target.value)}
              disabled={isReadOnly || isSaving}
              placeholder="ASSET-0021"
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>mailboxRef</span>
            <input
              value={form.mailboxRef}
              onChange={(event) => updateField("mailboxRef", event.target.value)}
              disabled={isReadOnly || isSaving}
              placeholder="shared-mailbox"
              style={fieldStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={labelStyle}>handoffRef</span>
            <input
              value={form.handoffRef}
              onChange={(event) => updateField("handoffRef", event.target.value)}
              disabled={isReadOnly || isSaving}
              placeholder="handoff-ticket"
              style={fieldStyle}
            />
          </label>
        </div>
      </div>

      {validationMessage ? <div style={warningStyle}>{validationMessage}</div> : null}
      {mutation.isError ? (
        <div style={errorStyle}>
          Unable to save this lifecycle step right now. {mutation.error.message}
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ color: "#9eb79b", fontSize: 13 }}>
          Records review evidence only. This action does not trigger live provisioning or deprovisioning.
        </span>
        <button
          type="button"
          onClick={() => {
            void handleSave();
          }}
          disabled={isReadOnly || isSaving}
          style={{
            padding: "11px 16px",
            borderRadius: 14,
            border: "none",
            background: isReadOnly || isSaving ? "#cbd5e1" : "#89ff93",
            color: isReadOnly || isSaving ? "#9eb79b" : "rgba(10, 17, 11, 0.97)",
            fontWeight: 700,
            cursor: isReadOnly || isSaving ? "not-allowed" : "pointer",
          }}
        >
          {isSaving ? "Saving..." : "Save step update"}
        </button>
      </div>
    </article>
  );
}

function getInitialForm(step: LifecycleRunStep): FormState {
  return {
    status: step.status === "pending" ? "manual" : step.status,
    statusReason: step.statusReason ?? "",
    note: step.note ?? "",
    ticketId: step.ticketId ?? "",
    assetId: step.assetId ?? "",
    mailboxRef: step.mailboxRef ?? "",
    handoffRef: step.handoffRef ?? "",
  };
}

function normalizeOptional(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const labelStyle = {
  color: "#dff4d3",
  fontWeight: 600,
} as const;

const fieldStyle = {
  padding: "11px 13px",
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(10, 17, 11, 0.97)",
  color: "#dff4d3",
} as const;

const textAreaStyle = {
  ...fieldStyle,
  resize: "vertical" as const,
  minHeight: 88,
  fontFamily: "inherit",
} as const;

const warningStyle = {
  padding: 14,
  borderRadius: 14,
  background: "rgba(244, 192, 73, 0.08)",
  color: "#fdba74",
} as const;

const errorStyle = {
  padding: 14,
  borderRadius: 14,
  background: "#fef2f2",
  color: "#fca5a5",
} as const;
