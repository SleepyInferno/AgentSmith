import { expect, test } from "@playwright/test";
import { mockOperatorApp } from "./support/mockApi";

test("covers dashboard hotspots and shell navigation", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/");
  await expect(page.getByLabel("Operator risk overview")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review Panel" })).toHaveCount(0);

  await page.getByRole("link", { name: "Device Inventory" }).first().click();
  await expect(page).toHaveURL(/\/devices$/);
  await expect(page.getByRole("heading", { name: "Filterable device inventory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Device Inventory" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Lifecycle Queue" }).click();
  await expect(page).toHaveURL(/\/lifecycle$/);
  await expect(page.getByRole("heading", { name: "Lifecycle workflows" })).toBeVisible();

  await page.getByRole("link", { name: "Connectors" }).click();
  await expect(page).toHaveURL(/\/connectors$/);
  await expect(page.getByRole("heading", { name: "Connector status" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Connectors" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("link", { name: "Audit Log" }).click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();

  // Sidebar is the only navigation surface — no top-nav links to dashboard
  await expect(page.getByLabel("Primary auth navigation")).not.toBeAttached();

  // PageTitle heading is present on device inventory
  await page.goto("/devices");
  await expect(page.getByRole("heading", { name: "Device Inventory", level: 1 })).toBeVisible();

  // PageTitle heading is present on lifecycle queue
  await page.goto("/lifecycle");
  await expect(page.getByRole("heading", { name: "Lifecycle Queue", level: 1 })).toBeVisible();
});

test("covers overview-to-detail navigation for network, backup, and docs", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/network");
  await page.getByRole("link", { name: "Open network inventory" }).click();
  await expect(page).toHaveURL(/\/network\/inventory$/);
  await page.getByRole("link", { name: "Firewall HQ 01" }).click();
  await expect(page).toHaveURL(/\/network\/resources\/firewall-hq-01$/);
  await expect(page.getByRole("heading", { name: "Firewall HQ 01" })).toBeVisible();

  await page.goto("/backup");
  await page.getByRole("link", { name: "Branch File Server" }).click();
  await expect(page).toHaveURL(/\/backup\/systems\/sys-branch-nas$/);
  await expect(page.getByRole("heading", { name: "Branch File Server" })).toBeVisible();

  await page.goto("/docs");
  await page.getByRole("link", { name: "Open search inventory" }).click();
  await expect(page).toHaveURL(/\/docs\/search$/);
  await page.getByRole("link", { name: "M365 Break Glass Procedure" }).click();
  await expect(page).toHaveURL(/\/docs\/doc-m365-break-glass$/);
  await expect(page.getByRole("heading", { name: "M365 Break Glass Procedure" })).toBeVisible();
});

test("covers home route shell layout and risk card dashboard", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/");

  // Sidebar is visible on the home route (D-06: unified layout)
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

  // Dashboard landmark is present (replaced mockup)
  await expect(page.getByLabel("Operator risk overview")).toBeVisible();

  // All five risk cards are present and link to correct routes (use aria-label to distinguish from sidebar nav)
  await expect(page.getByRole("link", { name: /Device Inventory: / })).toBeAttached();
  await expect(page.getByRole("link", { name: /Lifecycle Queue: / })).toBeAttached();
  await expect(page.getByRole("link", { name: /Backup Confidence: / })).toBeAttached();
  await expect(page.getByRole("link", { name: /Network Visibility: / })).toBeAttached();
  await expect(page.getByRole("link", { name: /Documentation: / })).toBeAttached();

  // Top bar has sign-out but no nav links to primary routes
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.getByLabel("Primary auth navigation")).not.toBeAttached();
});
