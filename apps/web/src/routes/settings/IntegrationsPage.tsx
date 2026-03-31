import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageTitle } from "../../components/PageTitle";
import { Toast } from "../../components/Toast";
import { useToast } from "../../hooks/useToast";
import { apiGet, apiRequest } from "../../lib/api";

type IntegrationStatus = {
  configured: boolean;
  tenantId?: string;
  clientId?: string;
  lastTestedAt?: string | null;
  lastTestResult?: string | null;
};

type TestResult = {
  ok: boolean;
  message: string;
};

function toneForTestResult(result: string | null | undefined) {
  if (!result) return { background: "rgba(129, 255, 164, 0.08)", color: "#9eb79b" };
  if (result === "pass") return { background: "#dcfce7", color: "#166534" };
  return { background: "#fecaca", color: "#7f1d1d" };
}

function HealthBadge({ testResult }: { testResult: string | null | undefined }) {
  const tone = toneForTestResult(testResult);
  const label = !testResult ? "Not verified" : testResult === "pass" ? "Verified" : "Failed";
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        fontWeight: 700,
        ...tone,
      }}
    >
      {label}
    </span>
  );
}

type IntegrationSectionProps = {
  title: string;
  integrationKey: string;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "password";
    isSecret: boolean;
  }>;
};

function IntegrationSection({ title, integrationKey, fields }: IntegrationSectionProps) {
  const queryClient = useQueryClient();
  const { toast, showToast } = useToast();
  const [formValues, setFormValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.name, ""])),
  );
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const query = useQuery({
    queryKey: ["integrations", integrationKey],
    queryFn: () => apiGet<IntegrationStatus>(`/api/integrations/${integrationKey}`),
  });

  const data = query.data;

  // Pre-fill non-secret fields from query data (only on initial load)
  const getFieldValue = (field: { name: string; isSecret: boolean }) => {
    if (field.isSecret) {
      // Secret fields are always empty on load (per D-01)
      return formValues[field.name] ?? "";
    }
    // Non-secret fields: use local state if user has typed something, otherwise use server value
    const localVal = formValues[field.name];
    if (localVal !== "") return localVal;
    // Return server value for non-secret fields (per D-02)
    if (field.name === "tenantId") return data?.tenantId ?? "";
    if (field.name === "clientId") return data?.clientId ?? "";
    return "";
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = {};
      for (const field of fields) {
        if (field.isSecret) {
          // Only include secret if user typed something (per D-11: blank means keep existing)
          if (formValues[field.name] !== "") {
            body[field.name] = formValues[field.name];
          }
        } else {
          body[field.name] = getFieldValue(field);
        }
      }
      await apiRequest(`/api/integrations/${integrationKey}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      showToast("Credentials saved successfully.", true);
      void queryClient.invalidateQueries({ queryKey: ["integrations", integrationKey] });
      // Clear secret fields after save
      setFormValues((prev) => {
        const next = { ...prev };
        for (const field of fields) {
          if (field.isSecret) next[field.name] = "";
        }
        return next;
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Save failed.", false);
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<TestResult>(`/api/integrations/${integrationKey}/test`, {
        method: "POST",
      });
    },
    onSuccess: (result) => {
      setTestResult(result);
      showToast(result.message, result.ok);
      void queryClient.invalidateQueries({ queryKey: ["integrations", integrationKey] });
    },
    onError: (err: Error) => {
      const result: TestResult = { ok: false, message: err.message || "Test connection failed." };
      setTestResult(result);
      showToast(result.message, false);
    },
  });

  const lastTestedAt = data?.lastTestedAt ?? null;
  const lastTestResult = data?.lastTestResult ?? null;

  return (
    <>
      <Toast toast={toast} />
      <article
        style={{
          padding: "28px",
          borderRadius: "24px",
          background: "rgba(10, 17, 11, 0.97)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
          display: "grid",
          gap: "20px",
        }}
      >
        {/* Section header with health badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{title}</h2>
          <HealthBadge testResult={lastTestResult} />
        </div>

        {/* Health status row — always visible (per D-06) */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(6, 10, 6, 0.5)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            fontSize: "0.85rem",
            color: "#9eb79b",
          }}
        >
          {lastTestedAt
            ? `Last verified: ${new Date(lastTestedAt).toLocaleString()}${lastTestResult === "pass" ? " — passed" : lastTestResult ? ` — ${lastTestResult}` : ""}`
            : "Not yet verified"}
        </div>

        {/* Credential fields */}
        <div style={{ display: "grid", gap: "16px" }}>
          {fields.map((field) => {
            const isConfigured = field.isSecret && data?.configured === true;
            return (
              <label key={field.name} style={{ display: "grid", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#89ff93",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {field.label}
                  </span>
                  {isConfigured ? (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        background: "rgba(129, 255, 164, 0.12)",
                        color: "#9bffa3",
                        border: "1px solid rgba(129, 255, 164, 0.22)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Configured
                    </span>
                  ) : null}
                </div>
                <input
                  type={field.type}
                  value={getFieldValue(field)}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  autoComplete="off"
                  placeholder={field.isSecret && data?.configured ? "(keep existing)" : ""}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(129, 255, 164, 0.22)",
                    background: "rgba(6, 10, 6, 0.74)",
                    color: "#e2f5e3",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                />
              </label>
            );
          })}
        </div>

        {/* Save button */}
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "46px",
            padding: "0 22px",
            borderRadius: "14px",
            border: "none",
            cursor: saveMutation.isPending ? "not-allowed" : "pointer",
            color: "#061006",
            background: saveMutation.isPending
              ? "rgba(105, 221, 119, 0.5)"
              : "linear-gradient(180deg, #9bffa3, #67dd77)",
            fontWeight: 700,
            fontSize: "0.95rem",
            letterSpacing: "0.02em",
            boxShadow: saveMutation.isPending ? "none" : "0 0 28px rgba(105, 221, 119, 0.28)",
            transition: "all 0.2s ease",
            alignSelf: "start",
          }}
        >
          {saveMutation.isPending ? "Saving..." : "Save"}
        </button>

        {/* Test connection button + inline result */}
        <div style={{ display: "grid", gap: "12px" }}>
          <button
            type="button"
            disabled={testMutation.isPending || !data?.configured}
            onClick={() => testMutation.mutate()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "42px",
              padding: "0 20px",
              borderRadius: "14px",
              border: "1px solid rgba(129, 255, 164, 0.28)",
              cursor: testMutation.isPending || !data?.configured ? "not-allowed" : "pointer",
              color: testMutation.isPending || !data?.configured ? "#9eb79b" : "#9bffa3",
              background: "transparent",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.02em",
              transition: "all 0.2s ease",
              opacity: !data?.configured ? 0.5 : 1,
              alignSelf: "start",
            }}
          >
            {testMutation.isPending ? "Testing..." : "Test connection"}
          </button>

          {/* Inline test result (per D-04, D-05) */}
          {testResult ? (
            <div
              role="status"
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: testResult.ok
                  ? "1px solid rgba(129, 255, 164, 0.22)"
                  : "1px solid rgba(216, 93, 70, 0.34)",
                background: testResult.ok
                  ? "rgba(10, 30, 12, 0.7)"
                  : "rgba(216, 93, 70, 0.12)",
                color: testResult.ok ? "#9bffa3" : "#ffd8cf",
                fontSize: "0.9rem",
              }}
            >
              {testResult.message}
            </div>
          ) : null}
        </div>
      </article>
    </>
  );
}

const intuneFields: IntegrationSectionProps["fields"] = [
  { name: "tenantId", label: "Tenant ID", type: "text", isSecret: false },
  { name: "clientId", label: "Client ID", type: "text", isSecret: false },
  { name: "clientSecret", label: "Client Secret", type: "password", isSecret: true },
];

const openaiFields: IntegrationSectionProps["fields"] = [
  { name: "apiKey", label: "API Key", type: "password", isSecret: true },
];

export function IntegrationsPage() {
  return (
    <section style={{ display: "grid", gap: "24px" }}>
      <PageTitle title="Integrations" eyebrow="Settings" />
      <IntegrationSection
        title="Microsoft Intune"
        integrationKey="intune"
        fields={intuneFields}
      />
      <IntegrationSection
        title="OpenAI"
        integrationKey="openai"
        fields={openaiFields}
      />
    </section>
  );
}
