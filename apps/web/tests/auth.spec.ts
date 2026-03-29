import { expect, test } from "@playwright/test";
import { mockOperatorApp } from "./support/mockApi";

test("redirects unauthenticated users to login and preserves the original path", async ({ page }) => {
  await mockOperatorApp(page, { authenticated: false });

  await page.goto("/docs/search?q=sharepoint");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fdocs%2Fsearch%3Fq%3Dsharepoint$/);
  await expect(page.getByRole("heading", { name: "AgentSmith" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with Microsoft" })).toHaveAttribute(
    "href",
    "/auth/login?redirect=%2Fdocs%2Fsearch%3Fq%3Dsharepoint",
  );
});

test("shows the auth failure banner on the login page", async ({ page }) => {
  await mockOperatorApp(page, { authenticated: false });

  await page.goto("/login?error=auth_failed");

  await expect(page.getByRole("alert")).toContainText("Microsoft sign-in did not complete");
});

test("signs out from the protected shell", async ({ page }) => {
  await mockOperatorApp(page);

  await page.goto("/connectors");
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Sign in with Microsoft" })).toBeVisible();
});
