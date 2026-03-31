import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntegrationsPage } from "./IntegrationsPage";

// Mock the api module
const apiGetMock = vi.fn();
const apiRequestMock = vi.fn();

vi.mock("../../lib/api", () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
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

function renderIntegrationsPage() {
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
        path: "/settings",
        element: <IntegrationsPage />,
      },
    ],
    {
      initialEntries: ["/settings"],
    },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { queryClient };
}

const baseIntune = {
  configured: false,
  tenantId: undefined,
  clientId: undefined,
  lastTestedAt: null,
  lastTestResult: null,
};

const baseOpenAI = {
  configured: false,
  lastTestedAt: null,
  lastTestResult: null,
};

afterEach(() => {
  apiGetMock.mockReset();
  apiRequestMock.mockReset();
});

describe("IntegrationsPage", () => {
  it("renders Intune section with tenantId, clientId, clientSecret fields", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune")) return Promise.resolve(baseIntune);
      return Promise.resolve(baseOpenAI);
    });

    renderIntegrationsPage();

    await waitFor(() => {
      expect(screen.getByText("Microsoft Intune")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/tenant id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/client secret/i)).toBeInTheDocument();
  });

  it("renders OpenAI section with apiKey field", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune")) return Promise.resolve(baseIntune);
      return Promise.resolve(baseOpenAI);
    });

    renderIntegrationsPage();

    await waitFor(() => {
      expect(screen.getByText("OpenAI")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
  });

  it("shows 'Not yet verified' when lastTestedAt is null", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune"))
        return Promise.resolve({ configured: false, lastTestedAt: null, lastTestResult: null });
      return Promise.resolve({ configured: false, lastTestedAt: null, lastTestResult: null });
    });

    renderIntegrationsPage();

    await waitFor(() => {
      const notVerifiedRows = screen.getAllByText("Not yet verified");
      // Both sections should show "Not yet verified"
      expect(notVerifiedRows).toHaveLength(2);
    });
  });

  it("shows 'Configured' badge when configured is true", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune"))
        return Promise.resolve({
          configured: true,
          tenantId: "tenant-abc",
          clientId: "client-xyz",
          lastTestedAt: null,
          lastTestResult: null,
        });
      return Promise.resolve({
        configured: true,
        lastTestedAt: null,
        lastTestResult: null,
      });
    });

    renderIntegrationsPage();

    await waitFor(() => {
      const configuredBadges = screen.getAllByText("Configured");
      // clientSecret on Intune + apiKey on OpenAI
      expect(configuredBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("does NOT show 'Configured' badge when configured is false", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune"))
        return Promise.resolve({ configured: false, lastTestedAt: null, lastTestResult: null });
      return Promise.resolve({ configured: false, lastTestedAt: null, lastTestResult: null });
    });

    renderIntegrationsPage();

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText("Microsoft Intune")).toBeInTheDocument();
    });

    expect(screen.queryByText("Configured")).not.toBeInTheDocument();
  });

  it("pre-fills tenantId and clientId from GET response", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune"))
        return Promise.resolve({
          configured: true,
          tenantId: "test-tenant",
          clientId: "test-client",
          lastTestedAt: null,
          lastTestResult: null,
        });
      return Promise.resolve(baseOpenAI);
    });

    renderIntegrationsPage();

    await waitFor(() => {
      const tenantInput = screen.getByLabelText(/tenant id/i) as HTMLInputElement;
      expect(tenantInput.value).toBe("test-tenant");
    });

    const clientInput = screen.getByLabelText(/client id/i) as HTMLInputElement;
    expect(clientInput.value).toBe("test-client");
  });

  it("secret fields are always empty on load even when configured", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune"))
        return Promise.resolve({
          configured: true,
          tenantId: "tenant-abc",
          clientId: "client-xyz",
          lastTestedAt: null,
          lastTestResult: null,
        });
      return Promise.resolve({
        configured: true,
        lastTestedAt: null,
        lastTestResult: null,
      });
    });

    renderIntegrationsPage();

    await waitFor(() => {
      // Wait for query data to load (Configured badge should appear)
      expect(screen.getAllByText("Configured").length).toBeGreaterThanOrEqual(1);
    });

    const clientSecretInput = screen.getByLabelText(/client secret/i) as HTMLInputElement;
    expect(clientSecretInput.value).toBe("");

    const apiKeyInput = screen.getByLabelText(/api key/i) as HTMLInputElement;
    expect(apiKeyInput.value).toBe("");
  });

  it("renders health badge with correct state for passed test", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("intune"))
        return Promise.resolve({
          configured: true,
          tenantId: "tenant-abc",
          clientId: "client-xyz",
          lastTestedAt: "2026-03-30T10:00:00.000Z",
          lastTestResult: "pass",
        });
      return Promise.resolve({
        configured: false,
        lastTestedAt: null,
        lastTestResult: null,
      });
    });

    renderIntegrationsPage();

    await waitFor(() => {
      expect(screen.getByText("Verified")).toBeInTheDocument();
    });

    // Intune section shows verified timestamp
    expect(screen.getByText(/last verified/i)).toBeInTheDocument();
  });
});
