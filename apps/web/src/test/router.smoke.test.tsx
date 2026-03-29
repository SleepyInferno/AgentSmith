import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

describe("web route coverage", () => {
  const cases = [
    { path: "/", finder: () => screen.findByLabelText("Operator risk overview") },
    { path: "/devices", finder: () => screen.findByText("Filterable device inventory") },
    { path: "/devices/agentsmith-1", finder: () => screen.findByText("Risk summary") },
    { path: "/network", finder: () => screen.findByText("Open network inventory") },
    { path: "/network/map", finder: () => screen.findByText("Site topology") },
    { path: "/network/inventory", finder: () => screen.findByText("Filterable network inventory") },
    { path: "/network/resources/firewall-hq-01", finder: () => screen.findByText("Related infrastructure") },
    { path: "/backup", finder: () => screen.findByText("Open backup inventory") },
    { path: "/backup/inventory", finder: () => screen.findByText("Protected-system inventory") },
    { path: "/backup/systems/sys-finance-sql", finder: () => screen.findByRole("heading", { name: "Confidence breakdown" }) },
    { path: "/docs", finder: () => screen.findByText("Open search inventory") },
    { path: "/docs/search", finder: () => screen.findAllByText("Search inventory").then((results) => results[0]) },
    { path: "/docs/doc-m365-break-glass", finder: () => screen.findByRole("heading", { name: "Why this surfaced" }) },
    { path: "/lifecycle", finder: () => screen.findByText("Lifecycle workflows") },
    { path: "/lifecycle/runs/run-1", finder: () => screen.findByText("Review state before close-out") },
    { path: "/connectors", finder: () => screen.findByText("Connector status") },
    { path: "/audit", finder: () => screen.findByText("Audit trail") },
  ];

  for (const testCase of cases) {
    it(`renders ${testCase.path}`, async () => {
      renderApp(testCase.path);
      expect(await testCase.finder()).toBeInTheDocument();
    });
  }

  it("redirects unauthenticated users to login and preserves redirect", async () => {
    const { router } = renderApp("/connectors", {
      apiOptions: {
        authenticated: false,
      },
    });

    expect(await screen.findByRole("link", { name: "Sign in with Microsoft" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toContain("redirect=%2Fconnectors");
  });

  it("signs out through the API and returns to login", async () => {
    const { api, router, user } = renderApp("/connectors");

    expect(await screen.findByText("Connector status")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in with Microsoft" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(api.requestLog.some((entry) => entry.method === "POST" && entry.pathname === "/auth/logout")).toBe(true);
  });
});
