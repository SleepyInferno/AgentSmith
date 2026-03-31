import { expect, test } from "@playwright/test";
import { mockOperatorApp } from "./support/mockApi";

test.beforeEach(async ({ page }) => {
  await mockOperatorApp(page);
});

test("navigates to /settings via sidebar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Integrations" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Integrations", level: 1 })).toBeVisible();
});

test("renders Intune section with pre-filled fields", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Microsoft Intune" })).toBeVisible();
  await expect(page.getByLabel("Tenant ID")).toHaveValue("mock-tenant-id");
  await expect(page.getByLabel("Client ID")).toHaveValue("mock-client-id");
});

test("renders OpenAI section", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "OpenAI" })).toBeVisible();
  const apiKeyInput = page.getByLabel("API Key");
  await expect(apiKeyInput).toBeVisible();
  await expect(apiKeyInput).toHaveAttribute("type", "password");
});

test("shows Configured badge for Intune when configured is true", async ({ page }) => {
  await page.goto("/settings");
  // The Configured badge appears next to the Client Secret label (isSecret field when configured: true)
  const intuneSection = page.getByRole("article").first();
  await expect(intuneSection.getByText("Configured")).toBeVisible();
});

test("shows health status row with Not yet verified on page load", async ({ page }) => {
  await page.goto("/settings");
  // Both integrations return lastTestedAt: null, so both show "Not yet verified"
  const notYetVerified = page.getByText("Not yet verified");
  await expect(notYetVerified.first()).toBeVisible();
});

test("test connection shows success result for Intune", async ({ page }) => {
  await page.goto("/settings");
  // The Test connection button is enabled only when configured: true (Intune mock returns configured: true)
  const testButton = page.getByRole("button", { name: "Test connection" }).first();
  await testButton.click();
  await expect(page.getByText("Connected successfully").first()).toBeVisible();
});

test("no secret values are visible in page content", async ({ page }) => {
  await page.goto("/settings");
  // The mock GET response does not include clientSecret or apiKey values
  // Verify the page content does not contain mock-secret or any actual credential value
  const content = await page.textContent("body");
  expect(content).not.toContain("mock-secret");
  // clientSecret field should be empty (password type, no value from server)
  const clientSecretInput = page.getByLabel("Client Secret");
  await expect(clientSecretInput).toHaveValue("");
  await expect(clientSecretInput).toHaveAttribute("type", "password");
});
