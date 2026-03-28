type DocumentationOverviewPageProps = {
  trustBoundaryCopy: string;
};

export function DocumentationOverviewPage({ trustBoundaryCopy }: DocumentationOverviewPageProps) {
  return (
    <section
      style={{
        padding: 24,
        borderRadius: 24,
        background: "#ffffff",
        border: "1px solid rgba(148, 163, 184, 0.22)",
      }}
    >
      <p style={{ margin: 0, color: "#0369a1", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700 }}>
        Documentation
      </p>
      <h2 style={{ margin: "10px 0 8px", fontSize: "2rem" }}>Documentation overview</h2>
      <p style={{ margin: 0, color: "#475569", lineHeight: 1.6, maxWidth: 720 }}>
        Documentation routes are wired into the shared shell. The queue-first overview lands in the
        next task.
      </p>
      <p style={{ margin: "16px 0 0", color: "#0f172a", fontWeight: 700 }}>{trustBoundaryCopy}</p>
    </section>
  );
}
