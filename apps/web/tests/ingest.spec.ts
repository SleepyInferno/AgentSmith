import { expect, test } from "@playwright/test";
import { mockOperatorApp } from "./support/mockApi";

const mockIngestRun = {
  id: "run-1",
  triggeredBy: "manual",
  status: "done",
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  fileCount: 2,
  doneCount: 1,
  failedCount: 1,
  files: [
    {
      id: "file-1",
      filePath: "/tmp/source/readme.md",
      status: "done",
      errorMessage: null,
    },
    {
      id: "file-2",
      filePath: "/tmp/source/broken.txt",
      status: "failed",
      errorMessage: "Parse error",
    },
  ],
};

test.describe("Ingest UI on settings page", () => {
  test("Ingest section renders on settings page", async ({ page }) => {
    await mockOperatorApp(page);
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Ingest" })).toBeVisible();
    await expect(page.getByLabel("Source folder")).toBeVisible();
    await expect(page.getByLabel("Output folder")).toBeVisible();
  });

  test("Folder inputs pre-fill from settings API", async ({ page }) => {
    await mockOperatorApp(page, {
      ingestSettings: { sourceFolder: "/tmp/source", outputFolder: "/tmp/output" },
    });
    await page.goto("/settings");

    await expect(page.getByLabel("Source folder")).toHaveValue("/tmp/source");
    await expect(page.getByLabel("Output folder")).toHaveValue("/tmp/output");
  });

  test("Save button saves folder settings", async ({ page }) => {
    let putCalled = false;
    await mockOperatorApp(page);

    // Override PUT /api/settings to track the call
    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "PUT") {
        putCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");

    const sourceInput = page.getByLabel("Source folder");
    const outputInput = page.getByLabel("Output folder");
    await sourceInput.fill("/new/source");
    await outputInput.fill("/new/output");

    // Click Save in the Ingest section (the third Save button after Intune and OpenAI)
    const saveButtons = page.getByRole("button", { name: "Save" });
    await saveButtons.last().click();

    await expect(page.getByText("Folder settings saved")).toBeVisible();
    expect(putCalled).toBe(true);
  });

  test("Trigger ingest button starts a run", async ({ page }) => {
    let postCalled = false;
    await mockOperatorApp(page, {
      ingestSettings: { sourceFolder: "/tmp/source", outputFolder: "/tmp/output" },
    });

    // Track POST /api/ingest/run
    await page.route("**/api/ingest/run", async (route) => {
      postCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ runId: "test-run-id" }),
      });
    });

    await page.goto("/settings");

    const triggerButton = page.getByRole("button", { name: "Trigger ingest" });
    await expect(triggerButton).toBeEnabled();
    await triggerButton.click();

    await expect(page.getByText("Ingest started")).toBeVisible();
    expect(postCalled).toBe(true);
  });

  test("Status table shows ingest file results", async ({ page }) => {
    await mockOperatorApp(page, {
      ingestSettings: { sourceFolder: "/tmp/source", outputFolder: "/tmp/output" },
      ingestStatus: { run: mockIngestRun },
    });

    await page.goto("/settings");

    // Status table should show filenames and status pills
    await expect(page.getByText("readme.md")).toBeVisible();
    await expect(page.getByText("broken.txt")).toBeVisible();
    // Use span to target the status pill specifically (not the summary paragraph)
    await expect(page.locator("span").filter({ hasText: /^done$/ })).toBeVisible();
    await expect(page.locator("span").filter({ hasText: /^failed$/ })).toBeVisible();
  });

  test("Trigger button disabled when folders empty", async ({ page }) => {
    // Return empty settings so folders are not configured
    await mockOperatorApp(page, {
      ingestSettings: { sourceFolder: "", outputFolder: "" },
    });

    // Override settings route to return empty record
    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/settings");

    const triggerButton = page.getByRole("button", { name: "Trigger ingest" });
    await expect(triggerButton).toBeDisabled();
  });
});
