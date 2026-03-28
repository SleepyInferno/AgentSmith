import { Link } from "react-router-dom";
import type { DocumentationReason, DocumentationReviewQueueRow } from "../../lib/docs";

type DocumentationReviewQueueProps = {
  items: DocumentationReviewQueueRow[];
  emptyTitle?: string;
};

function toneForReviewState(reviewState: string) {
  switch (reviewState) {
    case "overdue":
      return { color: "#991b1b", background: "#fee2e2" };
    case "due_soon":
      return { color: "#9a3412", background: "#ffedd5" };
    case "unreviewed":
      return { color: "#1d4ed8", background: "#dbeafe" };
    default:
      return { color: "#166534", background: "#dcfce7" };
  }
}

function toneForReason(reason: DocumentationReason) {
  switch (reason.code) {
    case "review_overdue":
      return { color: "#991b1b", background: "#fee2e2" };
    case "metadata_incomplete":
      return { color: "#9a3412", background: "#ffedd5" };
    case "recent_change":
      return { color: "#1d4ed8", background: "#dbeafe" };
    default:
      return { color: "#334155", background: "#e2e8f0" };
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString();
}

function formatKind(kind: string) {
  return kind.replace(/_/g, " ");
}

function formatLinkedSystemsLabel(count: number) {
  if (count === 0) {
    return "No linked systems";
  }

  return count === 1 ? "1 linked system" : `${count} linked systems`;
}

export function DocumentationReviewQueue({ items, emptyTitle }: DocumentationReviewQueueProps) {
  if (items.length === 0) {
    return (
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{emptyTitle ?? "No documentation records need review right now"}</h2>
        <p style={{ marginBottom: 0, color: "#475569", lineHeight: 1.6 }}>
          The documentation queue is clear. Open search inventory if you want to review the wider
          knowledge catalog or inspect metadata coverage across operational document types.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {items.map((item) => {
        const reviewStateTone = toneForReviewState(item.reviewState);
        const leadingReason = item.reasons[0] ?? null;

        return (
          <Link
            key={item.queueId}
            to={`/docs/${item.documentId}`}
            state={{
              from: "docs-overview",
              focusReason: leadingReason,
            }}
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              borderRadius: 24,
              padding: 20,
              background: "#ffffff",
              border: "1px solid rgba(148, 163, 184, 0.22)",
              boxShadow: "0 12px 36px rgba(15, 23, 42, 0.08)",
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
              <div style={{ minWidth: 0, flex: "1 1 520px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ ...chipStyle, ...reviewStateTone }}>{item.reviewState}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}>{formatKind(item.kind)}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}>Queue rank #{item.queueRank}</span>
                  <span style={{ color: "#475569", fontSize: 13 }}>
                    {formatLinkedSystemsLabel(item.linkedSystems.length)}
                  </span>
                </div>

                <h3 style={{ margin: "12px 0 8px", fontSize: "1.25rem" }}>{item.title}</h3>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{item.summary}</p>

                <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                  {item.reasons.map((reason) => (
                    <div
                      key={`${item.queueId}-${reason.code}`}
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        background: "#f8fafc",
                        border: "1px solid rgba(148, 163, 184, 0.14)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          style={{
                            ...chipStyle,
                            ...toneForReason(reason),
                            textTransform: "none",
                            letterSpacing: "normal",
                          }}
                        >
                          {reason.label}
                        </span>
                        <span style={{ color: "#475569", fontSize: 13 }}>reasons</span>
                      </div>
                      <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.6 }}>{reason.summary}</p>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    padding: 14,
                    borderRadius: 18,
                    background: "#f8fafc",
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    color: "#334155",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 6 }}>suggestedNextStep</strong>
                  <span>{item.suggestedNextStep}</span>
                </div>
              </div>

              <div style={{ minWidth: 220, display: "grid", gap: 10 }}>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>reviewDueAt</span>
                  <strong>{formatDateTime(item.reviewDueAt)}</strong>
                </div>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>lastReviewedAt</span>
                  <strong>{formatDateTime(item.lastReviewedAt)}</strong>
                </div>
                <div style={statusCardStyle}>
                  <span style={statusLabelStyle}>focusReason</span>
                  <strong>{leadingReason?.label ?? "Review context pending"}</strong>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const chipStyle = {
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
};

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};

const statusCardStyle = {
  padding: 14,
  borderRadius: 18,
  background: "#eff6ff",
  color: "#0f172a",
  display: "grid",
  gap: 6,
};

const statusLabelStyle = {
  fontSize: 12,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
};
