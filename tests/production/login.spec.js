import { test, expect } from "@playwright/test";

test("production has no sample access; disabled Google stays on login", async ({ page }) => {
  await page.route("**/auth/v1/settings", route => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ external: { google: false } }),
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: /sample classroom/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText("Google sign-in is not available yet");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.getByRole("button", { name: /sample classroom/i })).toHaveCount(0);
});

test("auth dependency failure offers retry without a broken redirect", async ({ page }) => {
  await page.route("**/auth/v1/settings", route => route.fulfill({status: 503, body: "Unavailable"}));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  await expect(page).toHaveURL(/\/$/);
});
