import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { NeedsAttentionQueue } from "../../components/assets/NeedsAttentionQueue";
import { getNeedsAttentionQueue } from "../../lib/assets";

function getFreshnessMessage(states: string[]) {
  if (states.length === 0) {
    return "No risky devices right now";
  }

  if (states.some((state) => state !== "healthy")) {
    return "Asset data is stale or incomplete";
  }

  return "Asset data is current enough for queue review";
}

export function AssetDashboardPage() {
  const queueQuery = useQuery({
    queryKey: ["asset-queue"],
    queryFn: getNeedsAttentionQueue,
  });

  const freshnessStates = queueQuery.data?.map((item) => item.sourceFreshnessState) ?? [];
  const freshnessMessage = getFreshnessMessage(freshnessStates);
  const isStale = freshnessMessage === "Asset data is stale or incomplete";

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 18,
        }}
      >
        <article
          style={{
            padding: 24,
            borderRadius: 24,
            background: "#ffffff",
            border: "1px solid rgba(148, 163, 184, 0.22)",
          }}
        >
          <p style={{ margin: 0, color: "#0f172a", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Needs attention
          </p>
          <h2 style={{ margin: "12px 0 10px", fontSize: "2rem" }}>Needs attention</h2>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            Review the highest-risk devices first, then open the full inventory if you need a wider
            pass across the estate.
          </p>
        </article>
        <article
          style={{
            padding: 24,
            borderRadius: 24,
            background: isStale ? "#fff7ed" : "#ecfeff",
            border: `1px solid ${isStale ? "rgba(249, 115, 22, 0.28)" : "rgba(14, 165, 233, 0.25)"}`,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Data freshness</h2>
          <p style={{ margin: "10px 0 0", color: "#334155", lineHeight: 1.6 }}>{freshnessMessage}</p>
        </article>
      </section>

      <section>
        {queueQuery.isPending ? (
          <div style={panelStyle}>Loading device queue...</div>
        ) : queueQuery.isError ? (
          <div style={panelStyle}>Unable to load the queue right now.</div>
        ) : (
          <NeedsAttentionQueue items={queueQuery.data} />
        )}
      </section>

      <section
        style={{
          padding: 20,
          borderRadius: 24,
          background: "#ffffff",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Inventory navigation</h2>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            Move from the ranked queue to the full inventory when you need filters, ownership, or
            broader source review.
          </p>
        </div>
        <Link
          to="/devices"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 18px",
            borderRadius: 999,
            background: "#0f172a",
            color: "#f8fafc",
            textDecoration: "none",
          }}
        >
          Open device inventory
        </Link>
      </section>
    </section>
  );
}

const panelStyle = {
  padding: 24,
  borderRadius: 24,
  background: "#ffffff",
  border: "1px solid rgba(148, 163, 184, 0.22)",
};
