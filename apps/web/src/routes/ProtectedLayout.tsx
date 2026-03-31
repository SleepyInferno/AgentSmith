import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { useBootstrapStatus } from "../hooks/useBootstrapStatus";
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
  const { authenticated, isLoading: sessionLoading, user } = useSession();
  const { data: bootstrapData, isLoading: bootstrapLoading } = useBootstrapStatus();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  if (sessionLoading || bootstrapLoading) {
    return <LoadingShell />;
  }

  if (bootstrapData?.bootstrapRequired) {
    return <Navigate to="/setup" replace />;
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
        <img
          className="agent-topbar__banner-img"
          src="/mockups/AgentSmithBannerv2.png"
          alt="AgentSmith — IT Management. It is inevitable."
        />
        <div className="agent-topbar__actions">
          <span className="agent-topbar__user">{user.displayName}</span>
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
