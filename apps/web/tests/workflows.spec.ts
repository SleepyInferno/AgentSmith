import { expect, test } from "@playwright/test";
import { mockOperatorApp } from "./support/mockApi";

test("launches a lifecycle run, validates step updates, and closes the run", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/lifecycle");
  await page.getByPlaceholder("Jordan Lee").first().fill("Taylor Grant");
  await page.getByPlaceholder("jordan.lee@company.example").first().fill("taylor.grant@contoso.example");
  await page.getByRole("button", { name: "Launch onboarding" }).click();

  await expect(page).toHaveURL(/\/lifecycle\/runs\/run-2$/);
  await expect(page.getByRole("heading", { name: "Taylor Grant" })).toBeVisible();

  await page.getByLabel("Status").first().selectOption("blocked");
  await page.getByRole("button", { name: "Save step update" }).first().click();
  await expect(page.getByText("statusReason is required when a step is skipped or blocked.")).toBeVisible();

  await page
    .getByLabel("Exception reason (required for skipped or blocked)")
    .first()
    .fill("Awaiting upstream approval");
  await page.getByLabel("ticketId").first().fill("TCK-1024");
  await page.getByRole("button", { name: "Save step update" }).first().click();
  await expect(page.getByText("statusReason is required when a step is skipped or blocked.")).toHaveCount(0);
  await expect(page.getByText("Awaiting upstream approval")).toBeVisible();

  await page.getByRole("button", { name: "Close run and review summary" }).click();
  await expect(page.getByRole("heading", { name: "Review the recorded outcome before moving on" })).toBeVisible();
});

test("submits a docs metadata review and shows the audit receipt", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/docs/doc-m365-break-glass");
  await page.getByRole("button", { name: "Review metadata" }).click();

  await page.getByLabel("Review summary").fill("Reviewed category and linked system coverage.");
  await page.getByLabel("Operator name").fill("Operator One");
  await page.getByLabel("I understand this metadata review creates an audit log entry").check();
  await page.getByRole("button", { name: "Save metadata review (audit log entry)" }).click();

  await expect(page.getByText("Metadata review saved.")).toBeVisible();
  await expect(page.getByText("docs.metadata.reviewed recorded")).toBeVisible();
});

test("keeps the docs review panel open when metadata review fails", async ({ page }) => {
  await mockOperatorApp(page, { docsReviewFails: true });

  await page.goto("/docs/doc-m365-break-glass");
  await page.getByRole("button", { name: "Review metadata" }).click();

  await page.getByLabel("Review summary").fill("Retry after backend recovery.");
  await page.getByLabel("Operator name").fill("Operator One");
  await page.getByLabel("I understand this metadata review creates an audit log entry").check();
  await page.getByRole("button", { name: "Save metadata review (audit log entry)" }).click();

  await expect(page.getByText("Metadata review failed.")).toBeVisible();
  await expect(page.locator('button:has-text("Close review panel")')).toBeVisible();
});
