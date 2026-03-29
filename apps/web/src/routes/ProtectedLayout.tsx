import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { apiRequest } from "../lib/api";

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: "10px 14px",
  borderRadius: "999px",
  textDecoration: "none",
  border: isActive ? "1px solid rgba(137, 255, 147, 0.34)" : "1px solid rgba(129, 255, 164, 0.12)",
  background: isActive ? "rgba(137, 255, 147, 0.12)" : "rgba(10, 17, 11, 0.78)",
  color: isActive ? "#efffe6" : "#b9d4b0",
  fontWeight: 700,
  transition: "border-color 180ms ease, background-color 180ms ease, color 180ms ease",
});

function LoadingShell() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "min(100%, 540px)",
          padding: "28px",
          borderRadius: "24px",
          border: "1px solid rgba(129, 255, 164, 0.14)",
          background: "rgba(8, 14, 9, 0.9)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "#89ff93",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            fontSize: "0.9rem",
            fontWeight: 700,
          }}
        >
          Checking Session
        </p>
        <h1 style={{ margin: "12px 0 0", fontSize: "2rem" }}>Loading protected workspace</h1>
        <p style={{ margin: "12px 0 0", color: "#9eb79b", lineHeight: 1.6 }}>
          AgentSmith is verifying your operator session through the API before the application shell
          opens.
        </p>
      </div>
    </main>
  );
}

export function ProtectedLayout() {
  const { authenticated, isLoading, user } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return <LoadingShell />;
  }

  if (!authenticated || !user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    const loginUrl =
      redirect && redirect !== "/" ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

    return <Navigate to={loginUrl} replace />;
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
      });
      queryClient.clear();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Sign-out failed");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(18px)",
          background: "rgba(5, 9, 5, 0.86)",
          borderBottom: "1px solid rgba(129, 255, 164, 0.12)",
        }}
      >
        <div
          style={{
            width: "min(100%, 1408px)",
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: "4px" }}>
            <span
              style={{
                color: "#89ff93",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              Protected Operator Shell
            </span>
            <strong style={{ fontSize: "1.05rem" }}>{user.displayName}</strong>
          </div>

          <nav style={{ display: "flex", gap: "10px", flexWrap: "wrap" }} aria-label="Primary auth navigation">
            <NavLink to="/" end style={navLinkStyle}>
              Dashboard
            </NavLink>
            <NavLink to="/connectors" style={navLinkStyle}>
              Connectors
            </NavLink>
            <NavLink to="/audit" style={navLinkStyle}>
              Audit
            </NavLink>
          </nav>

          <div style={{ display: "grid", justifyItems: "end", gap: "6px" }}>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
              style={{
                minHeight: "42px",
                padding: "0 14px",
                borderRadius: "12px",
                border: "1px solid rgba(129, 255, 164, 0.16)",
                background: "rgba(10, 17, 11, 0.78)",
                color: "#dff4d3",
                cursor: isSigningOut ? "wait" : "pointer",
              }}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
            {signOutError ? <span style={{ color: "#ffd8cf", fontSize: "0.85rem" }}>{signOutError}</span> : null}
          </div>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
