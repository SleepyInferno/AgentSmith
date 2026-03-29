import { expect, test, type Page } from "@playwright/test";
import { createMockApi, type CreateMockApiOptions } from "../src/test/mockApi";

async function mockAppApi(page: Page, options: CreateMockApiOptions = {}) {
  const api = createMockApi(options);

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === "http://127.0.0.1:4173" && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"))) {
      const response = await api.handleRequest(url.toString(), {
        method: request.method(),
        body: request.postData() ?? null,
      });

      await route.fulfill({
        status: response.status,
        headers: response.headers,
        body: response.json !== undefined ? JSON.stringify(response.json) : response.text ?? "",
      });
      return;
    }

    await route.continue();
  });

  return api;
}

test("navigates the protected shell across primary sections", async ({ page }) => {
  await mockAppApi(page);

  await page.goto("/");
  await expect(page.getByLabel("AgentSmith dashboard mockup")).toBeVisible();

  await page.getByRole("link", { name: "Lifecycle Queue" }).first().click();
  await expect(page).toHaveURL(/\/lifecycle$/);
  await expect(page.getByText("Lifecycle workflows")).toBeVisible();

  await page.getByRole("link", { name: "Device Inventory" }).first().click();
  await expect(page).toHaveURL(/\/devices$/);
  await expect(page.getByText("Filterable device inventory")).toBeVisible();

  await page.getByRole("link", { name: "Identity Risk" }).first().click();
  await expect(page).toHaveURL(/\/network$/);
  await expect(page.getByText("Open network inventory")).toBeVisible();

  await page.getByRole("link", { name: "Backup Confidence" }).first().click();
  await expect(page).toHaveURL(/\/backup$/);
  await expect(page.getByText("Open backup inventory")).toBeVisible();

  await page.getByRole("link", { name: "Documentation" }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByText("Open search inventory")).toBeVisible();

  await page.getByRole("link", { name: "Connectors" }).click();
  await expect(page).toHaveURL(/\/connectors$/);
  await expect(page.getByText("Connector status")).toBeVisible();

  await page.getByRole("link", { name: "Audit Log" }).click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.getByText("Audit trail")).toBeVisible();
});

test("covers cross-links and docs metadata review", async ({ page }) => {
  await mockAppApi(page);

  await page.goto("/");
  await page.getByRole("link", { name: "Backup Confidence" }).first().click();
  await expect(page).toHaveURL(/\/backup$/);

  await page.getByRole("link", { name: "Open backup inventory" }).click();
  await expect(page).toHaveURL(/\/backup\/inventory$/);
  await page.getByRole("link", { name: "Finance SQL" }).click();
  await expect(page).toHaveURL(/\/backup\/systems\/sys-finance-sql$/);
  await expect(page.getByRole("heading", { name: "Confidence breakdown" })).toBeVisible();

  await page.goto("/network");
  await page.getByRole("link", { name: "Open network inventory" }).click();
  await page.getByRole("link", { name: "HQ Firewall 01" }).click();
  await expect(page).toHaveURL(/\/network\/resources\/firewall-hq-01$/);
  await expect(page.getByRole("heading", { name: "Related infrastructure" })).toBeVisible();
  await page.getByRole("link", { name: "Open network mapper" }).click();
  await expect(page).toHaveURL(/\/network\/map$/);

  await page.goto("/docs");
  await page.getByRole("link", { name: "Microsoft 365 Break Glass" }).click();
  await expect(page.getByText("Arrived from docs-overview.")).toBeVisible();
  await page.getByRole("button", { name: "Review metadata" }).click();
  await page.getByLabel("Review summary").fill("Reviewed metadata and confirmed the next recovery checkpoint.");
  await page.getByLabel("Operator name").fill("Morgan Admin");
  await page.getByRole("checkbox", { name: "I understand this metadata review creates an audit log entry" }).check();
  await page.getByRole("button", { name: "Save metadata review (audit log entry)" }).click();
  await expect(page.getByText("Metadata review saved.")).toBeVisible();
});

test("covers lifecycle launch, validation, and close-out", async ({ page }) => {
  await mockAppApi(page);

  await page.goto("/lifecycle");
  await page.getByLabel("Subject display name").fill("Casey Rivera");
  await page.getByLabel("Subject email").fill("casey.rivera@example.com");
  await page.getByRole("button", { name: "Launch onboarding" }).click();

  await expect(page).toHaveURL(/\/lifecycle\/runs\/run-2$/);
  await expect(page.getByRole("heading", { name: "Casey Rivera" })).toBeVisible();

  await page.getByLabel("Status").first().selectOption("blocked");
  await page.getByRole("button", { name: "Save step update" }).first().click();
  await expect(page.getByText("statusReason is required when a step is skipped or blocked.")).toBeVisible();

  await page.getByLabel(/Exception reason/).first().fill("Waiting on approval from identity owner.");
  await page.getByRole("button", { name: "Save step update" }).first().click();

  await page.getByRole("button", { name: "Close run and review summary" }).click();
  await expect(page.getByRole("button", { name: "Run already closed" })).toBeVisible();
});
