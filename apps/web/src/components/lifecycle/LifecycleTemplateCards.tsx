import { useState } from "react";
import type { LifecycleTemplate, LifecycleTemplateKey, StartLifecycleRunInput } from "../../lib/lifecycle";

type FormState = {
  subjectDisplayName: string;
  subjectEmail: string;
};

type LifecycleTemplateCardsProps = {
  templates: LifecycleTemplate[];
  isLoading: boolean;
  isError: boolean;
  isLaunching: boolean;
  launchError: string | null;
  onLaunch: (input: Omit<StartLifecycleRunInput, "requestedBy">) => Promise<unknown>;
};

const panelStyle = {
  padding: 20,
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.22)",
  background: "rgba(248, 250, 252, 0.9)",
} as const;

const templateTone: Record<LifecycleTemplateKey, { accent: string; surface: string }> = {
  "employee-onboarding": {
    accent: "#0369a1",
    surface: "rgba(224, 242, 254, 0.7)",
  },
  "employee-offboarding": {
    accent: "#b45309",
    surface: "rgba(255, 237, 213, 0.78)",
  },
};

function getInitialFormState(templates: LifecycleTemplate[]) {
  return Object.fromEntries(
    templates.map((template) => [
      template.templateKey,
      {
        subjectDisplayName: "",
        subjectEmail: "",
      },
    ]),
  ) as Record<LifecycleTemplateKey, FormState>;
}

export function LifecycleTemplateCards(props: LifecycleTemplateCardsProps) {
  const { templates, isLoading, isError, isLaunching, launchError, onLaunch } = props;
  const [forms, setForms] = useState<Record<LifecycleTemplateKey, FormState>>(
    getInitialFormState(templates.length > 0 ? templates : fallbackTemplates),
  );
  const availableTemplates = templates.length > 0 ? templates : fallbackTemplates;

  function updateForm(templateKey: LifecycleTemplateKey, field: keyof FormState, value: string) {
    setForms((current) => ({
      ...current,
      [templateKey]: {
        ...(current[templateKey] ?? { subjectDisplayName: "", subjectEmail: "" }),
        [field]: value,
      },
    }));
  }

  async function handleSubmit(templateKey: LifecycleTemplateKey) {
    const currentForm = forms[templateKey] ?? { subjectDisplayName: "", subjectEmail: "" };

    await onLaunch({
      templateKey,
      subjectDisplayName: currentForm.subjectDisplayName.trim(),
      subjectEmail: currentForm.subjectEmail.trim(),
    });

    setForms((current) => ({
      ...current,
      [templateKey]: {
        subjectDisplayName: "",
        subjectEmail: "",
      },
    }));
  }

  if (isLoading && templates.length === 0) {
    return <div style={panelStyle}>Loading lifecycle templates...</div>;
  }

  if (isError && templates.length === 0) {
    return <div style={panelStyle}>Unable to load lifecycle templates right now.</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      {availableTemplates.map((template) => {
        const tone = templateTone[template.templateKey];
        const formState = forms[template.templateKey] ?? { subjectDisplayName: "", subjectEmail: "" };
        const groupCount = template.groups.length;
        const stepCount = template.groups.reduce((total, group) => total + group.steps.length, 0);
        const isDisabled = isLaunching || formState.subjectDisplayName.trim().length === 0 || formState.subjectEmail.trim().length === 0;

        return (
          <article
            key={template.templateKey}
            style={{
              ...panelStyle,
              background: tone.surface,
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <p
                  style={{
                    margin: 0,
                    color: tone.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {template.templateKey}
                </p>
                <h4 style={{ margin: "10px 0 8px", fontSize: "1.25rem", color: "#0f172a" }}>{template.title}</h4>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{template.description}</p>
              </div>
              <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
                {groupCount} groups across {stepCount} tracked steps.
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {template.groups.map((group) => (
                <div key={group.groupKey} style={{ display: "grid", gap: 4 }}>
                  <strong style={{ color: "#0f172a", fontSize: 14 }}>{group.title}</strong>
                  <span style={{ color: "#475569", fontSize: 13 }}>{group.steps.length} steps</span>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>Subject display name</span>
                <input
                  value={formState.subjectDisplayName}
                  onChange={(event) => updateForm(template.templateKey, "subjectDisplayName", event.target.value)}
                  placeholder="Jordan Lee"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>Subject email</span>
                <input
                  type="email"
                  value={formState.subjectEmail}
                  onChange={(event) => updateForm(template.templateKey, "subjectEmail", event.target.value)}
                  placeholder="jordan.lee@company.example"
                  style={inputStyle}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  void handleSubmit(template.templateKey);
                }}
                disabled={isDisabled}
                style={{
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "none",
                  background: isDisabled ? "#cbd5e1" : tone.accent,
                  color: isDisabled ? "#64748b" : "#f8fafc",
                  fontWeight: 700,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                }}
              >
                {isLaunching ? "Launching..." : `Launch ${template.kind}`}
              </button>
            </div>
          </article>
        );
      })}

      {launchError ? (
        <div style={{ ...panelStyle, gridColumn: "1 / -1", color: "#991b1b", background: "#fef2f2" }}>
          Unable to launch the run right now. {launchError}
        </div>
      ) : null}
    </div>
  );
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.4)",
  background: "#ffffff",
  color: "#0f172a",
} as const;

const fallbackTemplates: LifecycleTemplate[] = [
  {
    templateKey: "employee-onboarding",
    kind: "onboarding",
    version: 1,
    title: "Employee onboarding",
    description: "Identity, licensing, access, device, and handoff tracking for new starters.",
    groups: [],
  },
  {
    templateKey: "employee-offboarding",
    kind: "offboarding",
    version: 1,
    title: "Employee offboarding",
    description: "Account recovery, device return, mailbox handoff, and follow-up coverage.",
    groups: [],
  },
];
