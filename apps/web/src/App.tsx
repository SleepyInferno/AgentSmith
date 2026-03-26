const navItems = ["Dashboard", "Connectors", "Audit"];

export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1f3a5f 0%, #0f172a 45%, #020617 100%)",
        color: "#e2e8f0",
        fontFamily:
          "\"Segoe UI\", \"Aptos\", system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "48px 24px",
      }}
    >
      <section
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          borderRadius: 24,
          background: "rgba(15, 23, 42, 0.78)",
          backdropFilter: "blur(18px)",
          padding: 32,
          boxShadow: "0 30px 80px rgba(2, 6, 23, 0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#93c5fd",
                fontSize: 12,
              }}
            >
              Phase 1 foundation
            </p>
            <h1 style={{ margin: "10px 0 0", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              AgentSmith
            </h1>
            <p style={{ margin: "12px 0 0", maxWidth: 560, color: "#cbd5e1", lineHeight: 1.6 }}>
              Secure tenant visibility, connector freshness, and auditability for the solo IT
              operator who needs signal fast.
            </p>
          </div>
          <div
            style={{
              minWidth: 220,
              padding: 18,
              borderRadius: 18,
              background: "rgba(30, 41, 59, 0.85)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
            }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>Current shell</strong>
            <span style={{ color: "#94a3b8" }}>Authenticated routes and live data arrive in the next execution waves.</span>
          </div>
        </div>

        <nav
          aria-label="Primary"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32 }}
        >
          {navItems.map((item) => (
            <span
              key={item}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(96, 165, 250, 0.28)",
                padding: "10px 16px",
                background: "rgba(30, 41, 59, 0.5)",
                color: "#dbeafe",
              }}
            >
              {item}
            </span>
          ))}
        </nav>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 32,
          }}
        >
          {[
            {
              title: "Dashboard",
              body: "Reserved for device and identity risk priorities once shared entities are flowing.",
            },
            {
              title: "Connectors",
              body: "Will surface Entra and Intune health, last sync times, and freshness state.",
            },
            {
              title: "Audit",
              body: "Will show operator and workflow events with timestamps, targets, and results.",
            },
          ].map((panel) => (
            <article
              key={panel.title}
              style={{
                borderRadius: 18,
                padding: 20,
                background: "rgba(15, 23, 42, 0.92)",
                border: "1px solid rgba(148, 163, 184, 0.15)",
              }}
            >
              <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>{panel.title}</h2>
              <p style={{ marginBottom: 0, color: "#94a3b8", lineHeight: 1.55 }}>{panel.body}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
