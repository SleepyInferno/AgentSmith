import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetupPage } from "./SetupPage";

const useBootstrapStatusMock = vi.fn();
const apiRequestMock = vi.fn();

vi.mock("../hooks/useBootstrapStatus", () => ({
  useBootstrapStatus: () => useBootstrapStatusMock(),
  bootstrapStatusQueryKey: ["bootstrap-status"],
}));

vi.mock("../hooks/useSession", () => ({
  sessionQueryKey: ["session"],
}));

vi.mock("../lib/api", () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

function renderSetupPage() {
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
        path: "/setup",
        element: <SetupPage />,
      },
      {
        path: "/",
        element: <div>Dashboard content</div>,
      },
    ],
    {
      initialEntries: ["/setup"],
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
  useBootstrapStatusMock.mockReset();
});

describe("SetupPage", () => {
  it("redirects to /login when bootstrap is not required", async () => {
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: false },
      isLoading: false,
    });

    const { router } = renderSetupPage();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });

    await screen.findByText("Login screen");
  });

  it("shows setup form when bootstrap is required", async () => {
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: true },
      isLoading: false,
    });

    renderSetupPage();

    expect(screen.getByRole("heading", { name: "AgentSmith First-Run Setup" })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Admin Account" })).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: true },
      isLoading: false,
    });

    renderSetupPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), "adminuser");
    await user.type(screen.getByLabelText(/^password/i), "securepass1");
    await user.type(screen.getByLabelText(/confirm password/i), "differentpass");
    await user.click(screen.getByRole("button", { name: "Create Admin Account" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it("submits bootstrap and navigates to / on success", async () => {
    useBootstrapStatusMock.mockReturnValue({
      data: { bootstrapRequired: true },
      isLoading: false,
    });
    apiRequestMock.mockResolvedValue({ userId: "bootstrap-admin-1" });

    const { router } = renderSetupPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/username/i), "adminuser");
    await user.type(screen.getByLabelText(/^password/i), "securepass1");
    await user.type(screen.getByLabelText(/confirm password/i), "securepass1");
    await user.click(screen.getByRole("button", { name: "Create Admin Account" }));

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/bootstrap",
        expect.objectContaining({ method: "POST" }),
      );
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });

    await screen.findByText("Dashboard content");
  });
});
