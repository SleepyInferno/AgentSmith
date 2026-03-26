export function LifecycleQueuePage() {
  return (
    <section
      style={{
        padding: 24,
        borderRadius: 24,
        background: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Lifecycle workflows</h2>
      <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
        Records work only - no live admin actions are triggered here.
      </p>
    </section>
  );
}
