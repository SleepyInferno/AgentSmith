import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PageTitle } from "../../components/PageTitle";
import { DocumentHistoryTimeline } from "../../components/docs/DocumentHistoryTimeline";
import { DocumentLinkedSystemsCard } from "../../components/docs/DocumentLinkedSystemsCard";
import { DocumentMetadataReviewPanel } from "../../components/docs/DocumentMetadataReviewPanel";
import { DocumentMetadataSummaryCard } from "../../components/docs/DocumentMetadataSummaryCard";
import {
  docsQueryKeys,
  getDocumentationDetail,
  reviewDocumentMetadata,
  type DocumentationDetailResponse,
  type DocumentationMetadataReviewResponse,
  type DocumentationReason,
} from "../../lib/docs";

type DocumentationDetailPageProps = {
  trustBoundaryCopy: string;
};

type DocumentationDetailLocationState = {
  from?: "docs-overview" | "docs-search";
  focusReason?: DocumentationReason | null;
  searchQuery?: string;
};

export function DocumentationDetailPage({ trustBoundaryCopy }: DocumentationDetailPageProps) {
  const { documentId = "" } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const locationState = (location.state ?? null) as DocumentationDetailLocationState | null;
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<DocumentationMetadataReviewResponse | null>(null);
  const detailQuery = useQuery({
    queryKey: docsQueryKeys.detail(documentId),
    queryFn: () => getDocumentationDetail(documentId),
    enabled: documentId.length > 0,
  });
  const reviewMutation = useMutation({
    mutationFn: reviewDocumentMetadata,
    onSuccess: async (result) => {
      setSubmissionResult(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: docsQueryKeys.overview }),
        queryClient.invalidateQueries({ queryKey: docsQueryKeys.searchRoot }),
        queryClient.invalidateQueries({ queryKey: docsQueryKeys.detail(documentId) }),
      ]);
      setIsReviewPanelOpen(false);
    },
  });

  if (detailQuery.isPending) {
    return <div style={panelStyle}>Loading documentation detail...</div>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return <div style={panelStyle}>Unable to load the selected documentation record.</div>;
  }

  const detail = detailQuery.data;
  const reasons = buildReasons(detail, locationState?.focusReason ?? null);
  const handoffMessage = buildHandoffMessage(locationState);

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <PageTitle title="Document" />
      <article
        style={{
          ...panelStyle,
          background: "linear-gradient(135deg, rgba(240, 249, 255, 0.96), rgba(255, 255, 255, 0.98))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <p style={eyebrowStyle}>Document detail</p>
            <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>{detail.title}</h2>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, maxWidth: 760 }}>
              {detail.summary ?? "No summary is available for this documentation record yet."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/docs" style={ghostLinkStyle}>
              Back to docs overview
            </Link>
            <Link to="/docs/search" style={primaryLinkStyle}>
              Open search inventory
            </Link>
            <button
              type="button"
              style={reviewButtonStyle}
              onClick={() => {
                setSubmissionResult(null);
                setIsReviewPanelOpen((current) => !current);
              }}
            >
              Review metadata
            </button>
          </div>
        </div>

        {detail.dataMode === "seeded_example" ? (
          <div style={seededBannerStyle}>Example documentation records are shown until a live source is connected</div>
        ) : null}

        <div style={introCalloutStyle}>
          <strong style={{ color: "#0f172a" }}>
            This page explains document relevance and staleness before any metadata review is started.
          </strong>
          <span style={{ color: "#475569", lineHeight: 1.6 }}>{trustBoundaryCopy}</span>
        </div>
      </article>

      {submissionResult && !isReviewPanelOpen ? (
        <section style={auditReceiptStyle}>
          <strong style={{ color: "#166534" }}>Metadata review saved.</strong>
          <span style={{ color: "#166534", lineHeight: 1.6 }}>
            {submissionResult.auditAction} recorded {submissionResult.changedFields.join(", ")} with history entry{" "}
            {submissionResult.historyEntryId}.
          </span>
        </section>
      ) : null}

      {isReviewPanelOpen ? (
        <DocumentMetadataReviewPanel
          document={detail}
          isSubmitting={reviewMutation.isPending}
          onCancel={() => setIsReviewPanelOpen(false)}
          onSubmit={reviewMutation.mutateAsync}
          submissionResult={submissionResult}
          trustBoundaryCopy={trustBoundaryCopy}
        />
      ) : null}

      {reviewMutation.isError ? (
        <section style={reviewErrorStyle}>
          <strong style={{ color: "#991b1b" }}>Metadata review failed.</strong>
          <span style={{ color: "#991b1b", lineHeight: 1.6 }}>
            The explicit review was not saved. Check the required fields and try again.
          </span>
        </section>
      ) : null}

      <section style={panelStyle}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <p style={eyebrowStyle}>Why this surfaced</p>
            <h3 style={{ margin: "10px 0 8px" }}>Why this surfaced</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              The handoff preserves the surfaced reason and origin so the operator can see whether this record came from the queue or the search inventory.
            </p>
          </div>

          {handoffMessage ? <div style={handoffNoteStyle}>{handoffMessage}</div> : null}

          <div style={{ display: "grid", gap: 12 }}>
            {reasons.map((reason) => (
              <article key={reason.code} style={reasonCardStyle}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={reasonChipStyle}>{reason.label}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}>{reason.code}</span>
                </div>
                <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.6 }}>{reason.summary}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <p style={eyebrowStyle}>Operational context</p>
            <h3 style={{ margin: "10px 0 8px" }}>Operational context</h3>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Summary, content snapshot, metadata tags, and review posture stay together so the document can be assessed without opening an edit flow.
            </p>
          </div>

          <div style={definitionGridStyle}>
            <DefinitionItem label="Kind" value={formatLabel(detail.kind)} />
            <DefinitionItem label="Review state" value={formatLabel(detail.reviewState)} />
            <DefinitionItem label="Review due" value={formatDateTime(detail.reviewDueAt)} />
            <DefinitionItem label="Last reviewed" value={formatDateTime(detail.lastReviewedAt)} />
            <DefinitionItem label="Source updated" value={formatDateTime(detail.sourceUpdatedAt)} />
            <DefinitionItem label="Content updated" value={formatDateTime(detail.contentUpdatedAt)} />
          </div>

          <article style={contentCardStyle}>
            <strong style={{ color: "#0f172a" }}>Summary</strong>
            <span style={{ color: "#334155", lineHeight: 1.7 }}>
              {detail.summary ?? "No summary is available for this documentation record yet."}
            </span>
          </article>

          <article style={contentCardStyle}>
            <strong style={{ color: "#0f172a" }}>Content snapshot</strong>
            <div style={contentTextStyle}>{detail.contentText}</div>
          </article>

          <div style={{ display: "grid", gap: 10 }}>
            <strong style={{ color: "#0f172a" }}>Metadata tags</strong>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {detail.metadataTags.length === 0 ? (
                <span style={emptyInlineStyle}>No metadata tags are assigned yet.</span>
              ) : (
                detail.metadataTags.map((tag) => (
                  <span key={`${tag.dimension}-${tag.valueKey}`} style={tagChipStyle}>
                    {tag.dimension}: {tag.valueLabel}
                  </span>
                ))
              )}
            </div>
          </div>

          <article style={contentCardStyle}>
            <strong style={{ color: "#0f172a" }}>Suggested next step</strong>
            <span style={{ color: "#334155", lineHeight: 1.6 }}>
              {detail.suggestedNextStep ?? "No explicit next step is queued for this documentation record."}
            </span>
          </article>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.95fr) minmax(320px, 1.05fr)",
          gap: 20,
        }}
      >
        <section aria-label="Linked systems">
          <DocumentLinkedSystemsCard
            linkedSystems={detail.linkedSystems}
            linkedSystemSummary={detail.linkedSystemSummary}
          />
        </section>
        <section aria-label="Next review window">
          <DocumentMetadataSummaryCard
            owner={detail.owner}
            site={detail.site}
            category={detail.category}
            reviewState={detail.reviewState}
            reviewDueAt={detail.reviewDueAt}
            lastReviewedAt={detail.lastReviewedAt}
            sourceUpdatedAt={detail.sourceUpdatedAt}
            reviewAgeLabel={detail.reviewAgeLabel}
            nextReviewStatus={detail.nextReviewStatus}
            historyHighlights={detail.historyHighlights}
            suggestedNextStep={detail.suggestedNextStep}
          />
        </section>
      </section>

      <section aria-label="Review history">
        <DocumentHistoryTimeline history={detail.history} />
      </section>
    </section>
  );
}

function buildReasons(detail: DocumentationDetailResponse, focusReason: DocumentationReason | null) {
  const reasons = new Map<string, DocumentationReason>();

  if (focusReason) {
    reasons.set(focusReason.code, focusReason);
  }

  if (detail.reviewState === "overdue") {
    reasons.set("review_overdue", {
      code: "review_overdue",
      label: "Review overdue",
      summary: "The review due date is in the past, so this record needs attention before it is relied on again.",
    });
  }

  if (!detail.owner || !detail.site || !detail.category) {
    reasons.set("metadata_incomplete", {
      code: "metadata_incomplete",
      label: "Metadata incomplete",
      summary: "Owner, site, or category context is missing, which weakens how reliably this record will surface later.",
    });
  }

  if (isUpdatedAfterReview(detail.lastReviewedAt, detail.sourceUpdatedAt, detail.contentUpdatedAt)) {
    reasons.set("recent_change", {
      code: "recent_change",
      label: "Updated since last review",
      summary: "Source or content changed after the most recent review checkpoint, so the document may be stale.",
    });
  }

  if (reasons.size === 0) {
    reasons.set("review_context", {
      code: "review_context",
      label: "Review context",
      summary: detail.suggestedNextStep ?? "No immediate review risk is visible for this documentation record.",
    });
  }

  return [...reasons.values()];
}

function buildHandoffMessage(locationState: DocumentationDetailLocationState | null) {
  if (!locationState?.from && !locationState?.focusReason && !locationState?.searchQuery) {
    return null;
  }

  const parts: string[] = [];

  if (locationState.from === "docs-overview") {
    parts.push("Arrived from docs-overview.");
  }

  if (locationState.from === "docs-search") {
    parts.push("Arrived from docs-search.");
  }

  if (locationState.focusReason) {
    parts.push(`focusReason: ${locationState.focusReason.label}.`);
  }

  if (locationState.searchQuery) {
    parts.push(`searchQuery: \"${locationState.searchQuery}\".`);
  }

  return parts.join(" ");
}

function isUpdatedAfterReview(
  lastReviewedAt: string | null,
  sourceUpdatedAt: string | null,
  contentUpdatedAt: string | null,
) {
  if (!lastReviewedAt) {
    return Boolean(sourceUpdatedAt || contentUpdatedAt);
  }

  const lastReviewValue = new Date(lastReviewedAt).valueOf();

  return [sourceUpdatedAt, contentUpdatedAt].some((value) => {
    if (!value) {
      return false;
    }

    return new Date(value).valueOf() > lastReviewValue;
  });
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DefinitionItem(props: { label: string; value: string }) {
  return (
    <div style={definitionItemStyle}>
      <span style={labelStyle}>{props.label}</span>
      <strong style={{ color: "#0f172a", lineHeight: 1.5 }}>{props.value}</strong>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#0369a1",
  fontSize: 13,
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontWeight: 700,
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
};

const seededBannerStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid rgba(245, 158, 11, 0.35)",
  fontWeight: 600,
};

const introCalloutStyle = {
  marginTop: 18,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#eff6ff",
  border: "1px solid rgba(59, 130, 246, 0.18)",
  display: "grid",
  gap: 8,
};

const handoffNoteStyle = {
  padding: "14px 16px",
  borderRadius: 18,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  color: "#334155",
  lineHeight: 1.6,
};

const reasonCardStyle = {
  padding: 16,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.14)",
};

const reasonChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e0f2fe",
  color: "#0c4a6e",
  fontSize: 12,
  fontWeight: 700,
};

const definitionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const definitionItemStyle = {
  padding: 14,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.14)",
  display: "grid",
  gap: 6,
};

const labelStyle = {
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  fontWeight: 700,
};

const contentCardStyle = {
  padding: 18,
  borderRadius: 20,
  background: "#f8fafc",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "grid",
  gap: 8,
};

const contentTextStyle = {
  color: "#334155",
  lineHeight: 1.7,
  whiteSpace: "pre-wrap" as const,
};

const tagChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 700,
};

const emptyInlineStyle = {
  color: "#475569",
  lineHeight: 1.6,
};

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#0f172a",
  color: "#f8fafc",
  textDecoration: "none",
  fontWeight: 600,
};

const ghostLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 600,
};

const reviewButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "12px 18px",
  borderRadius: 999,
  border: "none",
  background: "#9a3412",
  color: "#fff7ed",
  fontWeight: 700,
  cursor: "pointer",
};

const auditReceiptStyle = {
  padding: "16px 18px",
  borderRadius: 20,
  background: "#f0fdf4",
  border: "1px solid rgba(34, 197, 94, 0.22)",
  display: "grid",
  gap: 6,
};

const reviewErrorStyle = {
  padding: "16px 18px",
  borderRadius: 20,
  background: "#fef2f2",
  border: "1px solid rgba(248, 113, 113, 0.24)",
  display: "grid",
  gap: 6,
};
