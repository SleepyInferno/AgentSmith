import { useState, type FormEvent } from "react";
import type {
  DocumentationDetailResponse,
  DocumentationMetadataReviewRequest,
  DocumentationMetadataReviewResponse,
} from "../../lib/docs";

type DocumentMetadataReviewPanelProps = {
  document: DocumentationDetailResponse;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: DocumentationMetadataReviewRequest) => Promise<DocumentationMetadataReviewResponse>;
  submissionResult: DocumentationMetadataReviewResponse | null;
  trustBoundaryCopy: string;
};

export function DocumentMetadataReviewPanel(props: DocumentMetadataReviewPanelProps) {
  const initialCategoryLabels = getMetadataLabels(props.document, "category");
  const initialSiteLabels = getMetadataLabels(props.document, "site");
  const initialOwnerLabels = getMetadataLabels(props.document, "owner");
  const initialSystemIds = props.document.linkedSystems.map((system) => system.systemId);
  const [categoryLabels, setCategoryLabels] = useState(initialCategoryLabels);
  const [siteLabels, setSiteLabels] = useState(initialSiteLabels);
  const [ownerLabels, setOwnerLabels] = useState(initialOwnerLabels);
  const [systemIds, setSystemIds] = useState(initialSystemIds);
  const [reviewDueDate, setReviewDueDate] = useState(toDateInputValue(props.document.reviewDueAt));
  const [reviewSummary, setReviewSummary] = useState("");
  const [actorLabel, setActorLabel] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const categoryOptions = mergeLabelOptions(props.document.metadataCatalog.categories.map((tag) => tag.valueLabel), categoryLabels);
  const siteOptions = mergeLabelOptions(props.document.metadataCatalog.sites.map((tag) => tag.valueLabel), siteLabels);
  const ownerOptions = mergeLabelOptions(props.document.metadataCatalog.owners.map((tag) => tag.valueLabel), ownerLabels);
  const systemOptions = mergeSystemOptions(props.document);
  const reviewDueAt = reviewDueDate ? toIsoDate(reviewDueDate) : null;
  const canSubmit = reviewSummary.trim().length > 0 && actorLabel.trim().length > 0 && confirmed;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    await props.onSubmit({
      documentId: props.document.documentId,
      categoryLabels,
      siteLabels,
      ownerLabels,
      systemIds,
      reviewDueAt,
      reviewSummary: reviewSummary.trim(),
      actorLabel: actorLabel.trim(),
    });
  }

  return (
    <section style={panelStyle}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Metadata review</p>
            <h3 style={{ margin: "10px 0 6px", fontSize: "1.6rem" }}>Review metadata</h3>
          </div>
          <button type="button" onClick={props.onCancel} style={secondaryButtonStyle}>
            Close review panel
          </button>
        </div>

        <div style={trustBannerStyle}>
          <strong style={{ color: "#dff4d3" }}>Document content stays read-only in this phase.</strong>
          <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>{props.trustBoundaryCopy}</span>
        </div>

        {props.submissionResult ? (
          <div style={receiptStyle}>
            <strong style={{ color: "#86efac" }}>Metadata review saved.</strong>
            <span style={{ color: "#86efac", lineHeight: 1.6 }}>
              Audit action: {props.submissionResult.auditAction}. History entry: {props.submissionResult.historyEntryId}.
            </span>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
        <div style={comparisonGridStyle}>
          <ReviewFieldSection
            title="categoryLabels"
            currentValues={initialCategoryLabels}
            nextValues={categoryLabels}
            options={categoryOptions}
            onToggle={(value) => setCategoryLabels((current) => toggleValue(current, value))}
          />
          <ReviewFieldSection
            title="siteLabels"
            currentValues={initialSiteLabels}
            nextValues={siteLabels}
            options={siteOptions}
            onToggle={(value) => setSiteLabels((current) => toggleValue(current, value))}
          />
          <ReviewFieldSection
            title="ownerLabels"
            currentValues={initialOwnerLabels}
            nextValues={ownerLabels}
            options={ownerOptions}
            onToggle={(value) => setOwnerLabels((current) => toggleValue(current, value))}
          />
          <ReviewFieldSection
            title="systemIds"
            currentValues={initialSystemIds}
            nextValues={systemIds}
            options={systemOptions.map((system) => ({
              value: system.systemId,
              label: system.systemName,
            }))}
            onToggle={(value) => setSystemIds((current) => toggleValue(current, value))}
          />
          <ReviewDateSection
            currentValue={props.document.reviewDueAt}
            nextValue={reviewDueAt}
            onChange={setReviewDueDate}
          />
        </div>

        <div style={inputGridStyle}>
          <label style={labelBlockStyle}>
            <span style={labelStyle}>Review summary</span>
            <textarea
              required
              value={reviewSummary}
              onChange={(event) => setReviewSummary(event.target.value)}
              rows={4}
              style={textareaStyle}
              placeholder="Summarize the metadata changes and what was reviewed."
            />
          </label>
          <label style={labelBlockStyle}>
            <span style={labelStyle}>Operator name</span>
            <input
              required
              value={actorLabel}
              onChange={(event) => setActorLabel(event.target.value)}
              style={inputStyle}
              placeholder="Enter the operator name for the audit log."
            />
          </label>
        </div>

        <label style={checkboxRowStyle}>
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>I understand this metadata review creates an audit log entry</span>
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#9eb79b", lineHeight: 1.6 }}>
            Before-and-after changes stay visible here so the write boundary is explicit before submit.
          </span>
          <button type="submit" disabled={!canSubmit || props.isSubmitting} style={primaryButtonStyle}>
            {props.isSubmitting ? "Saving metadata review..." : "Save metadata review (audit log entry)"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ReviewFieldSection(props: {
  title: string;
  currentValues: string[];
  nextValues: string[];
  options: Array<{ value: string; label: string }>;
  onToggle: (value: string) => void;
}) {
  return (
    <section style={fieldSectionStyle}>
      <div>
        <h4 style={{ margin: 0, fontSize: "1rem" }}>{props.title}</h4>
        <p style={{ margin: "8px 0 0", color: "#9eb79b", lineHeight: 1.6 }}>
          Before and after values stay visible while you review the update.
        </p>
      </div>

      <div style={beforeAfterGridStyle}>
        <MetadataValueList heading="Before" values={props.currentValues} />
        <MetadataValueList heading="After" values={props.nextValues} />
      </div>

      <div style={optionGridStyle}>
        {props.options.map((option) => {
          const checked = props.nextValues.includes(option.value);

          return (
            <label key={`${props.title}-${option.value}`} style={optionLabelStyle}>
              <input type="checkbox" checked={checked} onChange={() => props.onToggle(option.value)} />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ReviewDateSection(props: {
  currentValue: string | null;
  nextValue: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <section style={fieldSectionStyle}>
      <div>
        <h4 style={{ margin: 0, fontSize: "1rem" }}>reviewDueAt</h4>
        <p style={{ margin: "8px 0 0", color: "#9eb79b", lineHeight: 1.6 }}>
          The review date update is shown side by side before it is written.
        </p>
      </div>

      <div style={beforeAfterGridStyle}>
        <MetadataValueList heading="Before" values={props.currentValue ? [formatDate(props.currentValue)] : []} />
        <MetadataValueList heading="After" values={props.nextValue ? [formatDate(props.nextValue)] : []} />
      </div>

      <label style={labelBlockStyle}>
        <span style={labelStyle}>Next review due date</span>
        <input type="date" value={toDateInputValue(props.nextValue)} onChange={(event) => props.onChange(event.target.value)} style={inputStyle} />
      </label>
    </section>
  );
}

function MetadataValueList(props: { heading: string; values: string[] }) {
  return (
    <div style={valueCardStyle}>
      <strong style={{ color: "#dff4d3" }}>{props.heading}</strong>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {props.values.length === 0 ? (
          <span style={emptyValueStyle}>No values selected</span>
        ) : (
          props.values.map((value) => (
            <span key={`${props.heading}-${value}`} style={valueChipStyle}>
              {value}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function getMetadataLabels(document: DocumentationDetailResponse, dimension: "category" | "site" | "owner") {
  return document.metadataTags
    .filter((tag) => tag.dimension === dimension)
    .map((tag) => tag.valueLabel)
    .sort((left, right) => left.localeCompare(right));
}

function mergeLabelOptions(values: string[], selected: string[]) {
  return [...new Set([...values, ...selected])]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({
      value,
      label: value,
    }));
}

function mergeSystemOptions(document: DocumentationDetailResponse) {
  return [...new Map(
    [...document.metadataCatalog.systems, ...document.linkedSystems].map((system) => [
      system.systemId,
      {
        systemId: system.systemId,
        systemName: system.systemName,
      },
    ]),
  ).values()].sort((left, right) => left.systemName.localeCompare(right.systemName));
}

function toggleValue(values: string[], value: string) {
  if (values.includes(value)) {
    return values.filter((current) => current !== value);
  }

  return [...values, value].sort((left, right) => left.localeCompare(right));
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const eyebrowStyle = {
  margin: 0,
  color: "#fdba74",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(245, 158, 11, 0.22)",
  boxShadow: "0 22px 48px rgba(120, 53, 15, 0.12)",
  display: "grid",
  gap: 20,
};

const trustBannerStyle = {
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(244, 192, 73, 0.08)",
  border: "1px solid rgba(245, 158, 11, 0.22)",
  display: "grid",
  gap: 8,
};

const receiptStyle = {
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(134, 239, 172, 0.08)",
  border: "1px solid rgba(34, 197, 94, 0.22)",
  display: "grid",
  gap: 6,
};

const comparisonGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
};

const fieldSectionStyle = {
  padding: 18,
  borderRadius: 20,
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  display: "grid",
  gap: 14,
};

const beforeAfterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const valueCardStyle = {
  padding: 14,
  borderRadius: 16,
  background: "rgba(10, 17, 11, 0.97)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 10,
};

const optionGridStyle = {
  display: "grid",
  gap: 8,
};

const optionLabelStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  color: "#dff4d3",
};

const valueChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 10px",
  borderRadius: 999,
  background: "rgba(244, 192, 73, 0.06)",
  color: "#92400e",
  fontSize: 12,
  fontWeight: 700,
};

const emptyValueStyle = {
  color: "#9eb79b",
  lineHeight: 1.6,
};

const inputGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const labelBlockStyle = {
  display: "grid",
  gap: 8,
};

const labelStyle = {
  color: "#9eb79b",
  fontWeight: 700,
};

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(10, 17, 11, 0.97)",
  color: "#dff4d3",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
  minHeight: 110,
};

const checkboxRowStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  color: "#dff4d3",
  fontWeight: 600,
};

const primaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 999,
  border: "none",
  background: "#fdba74",
  color: "rgba(244, 192, 73, 0.08)",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.3)",
  background: "rgba(10, 17, 11, 0.97)",
  color: "#dff4d3",
  fontWeight: 600,
  cursor: "pointer",
};
