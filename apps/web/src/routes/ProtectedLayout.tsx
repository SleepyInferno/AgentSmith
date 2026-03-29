import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { apiRequest } from "../lib/api";

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
      <header className="agent-topbar">
        <div className="agent-topbar__brand">
          <svg className="agent-topbar__brand-mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 4.5 6v5.4c0 4.4 2.8 8.5 7.5 10.6 4.7-2.1 7.5-6.2 7.5-10.6V6Z" />
            <path d="M12 8.1c-1.9 0-3.4 1.5-3.4 3.4 0 1 .4 1.9 1.2 2.5-.2 1.3-.8 2.5-1.8 3.4 1.3-.4 2.7-.6 4-.6s2.7.2 4 .6c-1-.9-1.6-2.1-1.8-3.4.8-.6 1.2-1.5 1.2-2.5 0-1.9-1.5-3.4-3.4-3.4Z" />
          </svg>
          <span className="agent-topbar__brand-name">AgentSmith</span>
        </div>

        <div className="agent-topbar__identity">
          <span className="agent-topbar__label">Protected Operator Shell</span>
          <strong className="agent-topbar__user">{user.displayName}</strong>
        </div>

        <div className="agent-topbar__actions">
          <button
            type="button"
            className="agent-topbar__signout"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
          {signOutError ? (
            <span className="agent-topbar__error">{signOutError}</span>
          ) : null}
        </div>
      </header>

      <Outlet />
    </div>
  );
}
