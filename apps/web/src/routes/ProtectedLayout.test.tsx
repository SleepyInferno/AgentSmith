import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProtectedLayout } from "./ProtectedLayout";

const useSessionMock = vi.fn();
const useBootstrapStatusMock = vi.fn();
const apiRequestMock = vi.fn();

vi.mock("../hooks/useSession", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("../hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: () => useBootstrapStatusMock(),
}));

vi.mock("../lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

function renderProtectedLayout(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter(
    [
      {
        path: "/login",
        element: <div>Login screen</div>,
      },
      {
        path: "/",
        element: <ProtectedLayout />,
        children: [
          {
            index: true,
            element: <div>Dashboard content</div>,
          },
          {
            path: "connectors",
            element: <div>Connector content</div>,
          },
          {
            path: "audit",
            element: <div>Audit content</div>,
          },
          {
            path: "nested",
            element: <Outlet />,
            children: [
              {
                path: "details",
                element: <div>Nested content</div>,
              },
            ],
          },
        ],
      },
    ],
    {
      initialEntries: [initialEntry],
    },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { queryClient, router };
}

afterEach(() => {
  apiRequestMock.mockReset();
  useSessionMock.mockReset();
  useBootstrapStatusMock.mockReset();
});

describe("ProtectedLayout", () => {
  it("shows the loading shell while the API-backed session is still resolving", () => {
    useSessionMock.mockReturnValue({
      authenticated: false,
      isLoading: true,
      user: null,
    });
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: false },
      isLoading: false,
    });

    renderProtectedLayout("/");

    expect(screen.getByText("Loading protected workspace")).toBeInTheDocument();
  });

  it("redirects unauthenticated visitors to login with their return URL", async () => {
    useSessionMock.mockReturnValue({
      authenticated: false,
      isLoading: false,
      user: null,
    });
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: false },
      isLoading: false,
    });

    const { router } = renderProtectedLayout("/connectors?staleOnly=true");

    await screen.findByText("Login screen");
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toBe("?redirect=%2Fconnectors%3FstaleOnly%3Dtrue");
  });

  it("signs out through the shared API client and returns to login", async () => {
    useSessionMock.mockReturnValue({
      authenticated: true,
      isLoading: false,
      user: {
        displayName: "Operator One",
        email: "operator@example.com",
        id: "user-1",
      },
    });
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: false },
      isLoading: false,
    });
    apiRequestMock.mockResolvedValue(undefined);

    renderProtectedLayout("/");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith("/auth/logout", {
        method: "POST",
      });
    });
    await screen.findByText("Login screen");
  });

  it("shows the sign-out failure without navigating away", async () => {
    useSessionMock.mockReturnValue({
      authenticated: true,
      isLoading: false,
      user: {
        displayName: "Operator One",
        email: "operator@example.com",
        id: "user-1",
      },
    });
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: false },
      isLoading: false,
    });
    apiRequestMock.mockRejectedValue(new Error("Sign-out failed upstream"));

    renderProtectedLayout("/");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    await screen.findByText("Sign-out failed upstream");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});
