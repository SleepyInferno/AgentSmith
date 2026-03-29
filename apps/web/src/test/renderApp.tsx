import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { appRoutes } from "../router";
import { createMockApi, type CreateMockApiOptions, type MockApi } from "./mockApi";

type RenderAppOptions = {
  api?: MockApi;
  apiOptions?: CreateMockApiOptions;
};

export function renderApp(pathname: string, options: RenderAppOptions = {}) {
  const api = options.api ?? createMockApi(options.apiOptions);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter(appRoutes, {
    initialEntries: [pathname],
  });
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => api.fetch(input, init));

  vi.stubGlobal("fetch", fetchMock);

  const renderResult = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    ...renderResult,
    api,
    fetchMock,
    queryClient,
    router,
    user: userEvent.setup(),
  };
}
