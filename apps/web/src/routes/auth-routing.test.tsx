import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useSession } from "../hooks/useSession";
import { LoginPage } from "./LoginPage";
import { ProtectedLayout } from "./ProtectedLayout";

vi.mock("../hooks/useSession", () => ({
  useSession: vi.fn(),
}));

vi.mock("../hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: vi.fn(() => ({
    data: { bootstrapRequired: false },
    isLoading: false,
  })),
}));

const mockedUseSession = vi.mocked(useSession);

function renderRouter(initialEntries: string[], routes: Parameters<typeof createMemoryRouter>[0]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter(routes, { initialEntries });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

describe("auth routing", () => {
  it("keeps the redirect path on the Microsoft sign-in link", () => {
    mockedUseSession.mockReturnValue({
      authenticated: false,
      isLoading: false,
      user: null,
    } as ReturnType<typeof useSession>);

    renderRouter(["/login?redirect=%2Fdocs%2Fsearch%3Fq%3Dsharepoint"], [
      { path: "/login", element: <LoginPage /> },
    ]);

    expect(screen.getByRole("link", { name: "Sign in with Microsoft" })).toHaveAttribute(
      "href",
      "/auth/login?redirect=%2Fdocs%2Fsearch%3Fq%3Dsharepoint",
    );
  });

  it("shows the auth failure banner on the login page", () => {
    mockedUseSession.mockReturnValue({
      authenticated: false,
      isLoading: false,
      user: null,
    } as ReturnType<typeof useSession>);

    renderRouter(["/login?error=auth_failed"], [{ path: "/login", element: <LoginPage /> }]);

    expect(screen.getByRole("alert")).toHaveTextContent("Microsoft sign-in did not complete");
  });

  it("redirects protected routes to login with the original path and search", async () => {
    mockedUseSession.mockReturnValue({
      authenticated: false,
      isLoading: false,
      user: null,
    } as ReturnType<typeof useSession>);

    const router = renderRouter(["/docs/search?q=sharepoint"], [
      {
        path: "/login",
        element: <div>Login destination</div>,
      },
      {
        path: "/",
        element: <ProtectedLayout />,
        children: [
          {
            path: "docs/search",
            element: <div>Protected docs search</div>,
          },
        ],
      },
    ]);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });

    expect(router.state.location.search).toBe("?redirect=%2Fdocs%2Fsearch%3Fq%3Dsharepoint");
  });
});
