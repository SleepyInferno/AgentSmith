import { expect, test } from "@playwright/test";
import { mockOperatorApp } from "./support/mockApi";

test("persists device inventory filters in the URL and opens detail", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/devices");
  await page.getByLabel("riskLevel").selectOption("critical");

  await expect(page).toHaveURL(/riskLevel=critical/);

  await page.getByRole("link", { name: "HQ-LT-01" }).click();
  await expect(page).toHaveURL(/\/devices\/agentsmith-1$/);
  await expect(page.getByText("riskLevel: critical")).toBeVisible();

  await page.getByRole("link", { name: "Back to inventory" }).click();
  await expect(page).toHaveURL(/\/devices$/);
});

test("persists network inventory filters in the URL and opens detail", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/network/inventory");
  await page.getByLabel("kind").selectOption("firewall");
  await page.getByPlaceholder("HQ").fill("HQ");

  await expect(page).toHaveURL(/kind=firewall/);
  await expect(page).toHaveURL(/site=HQ/);

  await page.getByRole("link", { name: "Firewall HQ 01" }).click();
  await expect(page).toHaveURL(/\/network\/resources\/firewall-hq-01$/);
  await expect(page.getByText("HQ edge firewall with one inferred upstream WAN dependency.")).toBeVisible();
});

test("persists backup inventory filters in the URL and opens detail", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/backup/inventory");
  await page.getByLabel("search").fill("Branch");
  await page.getByLabel("confidenceState").selectOption("high_risk");

  await expect(page).toHaveURL(/search=Branch/);
  await expect(page).toHaveURL(/confidenceState=high_risk/);

  await page.getByRole("link", { name: "Review backup detail" }).click();
  await expect(page).toHaveURL(/\/backup\/systems\/sys-branch-nas$/);
  await expect(page.getByText("Expected backup coverage is missing for this system", { exact: true })).toBeVisible();
});

test("persists docs search filters and preserves the handoff into detail", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/docs/search");
  await page.getByLabel("q").fill("sharepoint");
  await page.getByRole("checkbox", { name: /^staleOnly/ }).click();

  await expect(page).toHaveURL(/q=sharepoint/);
  await expect(page).toHaveURL(/staleOnly=true/);

  await page.getByRole("link", { name: "M365 Break Glass Procedure" }).click();
  await expect(page).toHaveURL(/\/docs\/doc-m365-break-glass$/);
  await expect(page.getByText('Arrived from docs-search. focusReason: Review overdue. searchQuery: "sharepoint".')).toBeVisible();
});
