import { Navigate, useSearchParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export function LoginPage() {
  const { authenticated, isLoading } = useSession();
  const [searchParams] = useSearchParams();
  const authFailed = searchParams.get("error") === "auth_failed";
  const redirect = searchParams.get("redirect");
  const signInHref = redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : "/auth/login";

  if (!isLoading && authenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <section
        style={{
          width: "min(100%, 960px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          borderRadius: "28px",
          border: "1px solid rgba(129, 255, 164, 0.18)",
          background:
            "linear-gradient(135deg, rgba(8, 14, 9, 0.96), rgba(11, 20, 13, 0.92))",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "32px",
            background:
              "radial-gradient(circle at top, rgba(135, 255, 144, 0.18), transparent 42%)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#89ff93",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
          >
            Secure Operator Access
          </p>
          <h1
            style={{
              margin: "14px 0 0",
              fontFamily: "\"Cormorant Garamond\", Georgia, serif",
              fontSize: "clamp(2.8rem, 6vw, 4.6rem)",
              lineHeight: 0.95,
            }}
          >
            AgentSmith
          </h1>
          <p
            style={{
              margin: "18px 0 0",
              color: "#b9d4b0",
              lineHeight: 1.6,
              maxWidth: "32rem",
            }}
          >
            Sign in with Microsoft to reach the protected operator shell, keep tenant data behind a
            real session check, and record every sign-in or sign-out in the audit trail.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gap: "18px",
            alignContent: "center",
            padding: "32px",
            borderLeft: "1px solid rgba(129, 255, 164, 0.12)",
            background: "rgba(6, 10, 6, 0.74)",
          }}
        >
          <div
            style={{
              borderRadius: "18px",
              border: "1px solid rgba(129, 255, 164, 0.12)",
              background: "rgba(14, 22, 14, 0.7)",
              padding: "18px 20px",
            }}
          >
            <strong style={{ display: "block", fontSize: "1.15rem" }}>What this protects</strong>
            <p style={{ margin: "10px 0 0", color: "#9eb79b", lineHeight: 1.55 }}>
              Dashboard context, connector health, and audit visibility all stay behind an
              authenticated API session instead of browser-only state.
            </p>
          </div>

          {authFailed ? (
            <div
              role="alert"
              style={{
                borderRadius: "16px",
                border: "1px solid rgba(216, 93, 70, 0.34)",
                background: "rgba(216, 93, 70, 0.12)",
                color: "#ffd8cf",
                padding: "14px 16px",
              }}
            >
              Microsoft sign-in did not complete. Review your Entra app settings and try again.
            </div>
          ) : null}

          <a
            href={signInHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "54px",
              padding: "0 22px",
              borderRadius: "16px",
              textDecoration: "none",
              color: "#061006",
              background: "linear-gradient(180deg, #9bffa3, #67dd77)",
              fontWeight: 700,
              letterSpacing: "0.02em",
              boxShadow: "0 0 28px rgba(105, 221, 119, 0.28)",
            }}
          >
            Sign in with Microsoft
          </a>
        </div>
      </section>
    </main>
  );
}
