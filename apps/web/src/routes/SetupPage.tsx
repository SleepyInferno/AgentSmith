import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "../lib/api";
import { useBootstrapStatus, bootstrapStatusQueryKey } from "../hooks/useBootstrapStatus";
import { sessionQueryKey } from "../hooks/useSession";

export function SetupPage() {
  const { data: bootstrapData, isLoading: bootstrapLoading } = useBootstrapStatus();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Redirect to login if bootstrap is already complete
  if (!bootstrapLoading && bootstrapData?.bootstrapRequired === false) {
    return <Navigate to="/login" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("/api/bootstrap", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      // Bootstrap succeeded — update cache and navigate into the app
      queryClient.setQueryData(bootstrapStatusQueryKey, { bootstrapRequired: false });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      navigate("/", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setErrorMessage("Setup already completed.");
        } else {
          const body = error.body as Record<string, unknown> | null;
          setErrorMessage(
            typeof body?.message === "string"
              ? body.message
              : `Setup failed (status ${error.status}).`,
          );
        }
      } else {
        setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
      <div
        style={{
          width: "min(100%, 480px)",
          padding: "36px",
          borderRadius: "24px",
          border: "1px solid rgba(129, 255, 164, 0.18)",
          background:
            "linear-gradient(135deg, rgba(8, 14, 9, 0.96), rgba(11, 20, 13, 0.92))",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4)",
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
          First-Run Setup
        </p>
        <h1
          style={{
            margin: "14px 0 0",
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.1,
          }}
        >
          AgentSmith First-Run Setup
        </h1>
        <p
          style={{
            margin: "14px 0 24px",
            color: "#9eb79b",
            lineHeight: 1.6,
          }}
        >
          Create the initial admin account. This can only be done once.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "0.85rem",
                color: "#89ff93",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Username
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              required
              autoComplete="username"
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(129, 255, 164, 0.22)",
                background: "rgba(6, 10, 6, 0.74)",
                color: "#e2f5e3",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "0.85rem",
                color: "#89ff93",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(129, 255, 164, 0.22)",
                background: "rgba(6, 10, 6, 0.74)",
                color: "#e2f5e3",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                fontSize: "0.85rem",
                color: "#89ff93",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Confirm Password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(129, 255, 164, 0.22)",
                background: "rgba(6, 10, 6, 0.74)",
                color: "#e2f5e3",
                fontSize: "1rem",
                outline: "none",
              }}
            />
          </label>

          {errorMessage ? (
            <div
              role="alert"
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(216, 93, 70, 0.34)",
                background: "rgba(216, 93, 70, 0.12)",
                color: "#ffd8cf",
                padding: "12px 14px",
                fontSize: "0.9rem",
              }}
            >
              {errorMessage}
              {errorMessage === "Setup already completed." ? (
                <>
                  {" "}
                  <a href="/login" style={{ color: "#9bffa3" }}>
                    Go to login
                  </a>
                </>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "54px",
              padding: "0 22px",
              borderRadius: "16px",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              color: "#061006",
              background: isSubmitting
                ? "rgba(105, 221, 119, 0.5)"
                : "linear-gradient(180deg, #9bffa3, #67dd77)",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "0.02em",
              boxShadow: isSubmitting ? "none" : "0 0 28px rgba(105, 221, 119, 0.28)",
              transition: "all 0.2s ease",
            }}
          >
            {isSubmitting ? "Creating account..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </main>
  );
}
