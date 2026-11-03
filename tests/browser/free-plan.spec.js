import { test, expect } from "@playwright/test";
import { emptyWorkspace, defaultElements } from "../../src/model.js";
async function freeAccount(page) {
  const user = {
    id: "41000000-0000-4000-8000-000000000001",
    email: "teacher@example.invalid",
    app_metadata: { provider: "google" },
    user_metadata: {},
    aud: "authenticated",
  };
  await page.addInitScript(
    ({ user }) => {
      localStorage.setItem(
        "sb-cdhiyvqszsqwhteapxpg-auth-token",
        JSON.stringify({
          access_token: "mock-token",
          refresh_token: "mock-refresh",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { user },
  );
  const payload = emptyWorkspace();
  payload.classes.push({
    id: "class",
    name: "Year 4",
    students: [],
    subjects: [
      { id: "math", name: "Math", elements: defaultElements(), syllabus: [] },
    ],
  });
  let row = {
    id: "42000000-0000-4000-8000-000000000001",
    owner_id: user.id,
    payload,
    revision: 0,
  };
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
  await page.route("**/rest/v1/**", async (route) => {
    const req = route.request(),
      url = req.url();
    if (url.includes("rpc/ci_admin_overview"))
      return route.fulfill({
        status: 403,
        json: { message: "Administrator access required" },
      });
    if (url.includes("rpc/ci_plan"))
      return route.fulfill({ json: { pro: false, owner: true } });
    if (url.includes("/ci_workspaces")) {
      if (req.method() === "PATCH") row = { ...row, ...req.postDataJSON() };
      return route.fulfill({ json: req.method() === "PATCH" ? row : [row] });
    }
    return route.fulfill({ json: [] });
  });
}
test("free teacher completes schedule; paid actions locked; guide available", async ({
  page,
}) => {
  await freeAccount(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ready in three simple steps." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByRole("button", { name: "Add lesson", exact: true }).click();
  await expect(page.getByRole("cell", { name: "Year 4 · Math" })).toBeVisible();
  await page.getByRole("button", { name: "Add lesson", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("already has a lesson");
  await page
    .getByRole("button", { name: "Assessments · Pro", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unlock student progress with Pro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New assessment", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "School settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your plan, clearly explained." }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Assessments · Pro" })
    .click();
  await expect(
    page.getByText("Leave unassessed skills blank", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request Pro activation" }),
  ).toBeVisible();
});
test("teacher opening admin URL sees no user data or payment controls", async ({
  page,
}) => {
  await freeAccount(page);
  await page.goto("/admin");
  await expect(page.getByRole("alert")).toContainText(
    "Administrator access required",
  );
  await expect(
    page.getByRole("heading", { name: "Accounts & activation requests" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Record verified payment" }),
  ).toHaveCount(0);
});
