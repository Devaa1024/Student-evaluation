import { test, expect } from "@playwright/test";
import path from "node:path";
const evidence = process.env.QA_OUTPUT;
async function sample(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore a sample classroom" })
    .click();
  await expect(
    page.getByRole("heading", { name: "School overview" }),
  ).toBeVisible();
}
test("login, overview, filters, private report and follow-up goal", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/ClassInsights/);
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  if (evidence)
    await page.screenshot({
      path: path.join(evidence, "login.png"),
      fullPage: true,
    });
  await sample(page);
  if (evidence)
    await page.screenshot({
      path: path.join(evidence, "desktop.png"),
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Needs support · 1", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Priya Suresh" }),
  ).toBeVisible();
  await expect(page.locator("#student-progress tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "See progress", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Priya Suresh’s learning journey" }),
  ).toBeVisible();
  await page
    .getByLabel("Parent update (included in this report)")
    .fill("One clear next step.");
  await expect(page.locator("#print-report")).toContainText(
    "One clear next step.",
  );
  await page
    .getByLabel("Follow-up goal", { exact: true })
    .fill("Practise paragraph structure");
  await page.getByRole("button", { name: "Add goal", exact: true }).click();
  await expect(page.getByLabel("Practise paragraph structure")).toBeVisible();
  if (evidence) {
    await page.emulateMedia({ media: "print" });
    await page.pdf({
      path: path.join(evidence, "parent-report.pdf"),
      format: "A4",
      printBackground: true,
    });
    await page.emulateMedia({ media: "screen" });
  }
  expect(errors).toEqual([]);
});
test("partial scores, absence, stable session edits, reload and historical scale", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Assessments", exact: true }).click();
  await page
    .getByRole("button", { name: "New assessment", exact: true })
    .click();
  await page
    .getByLabel("Assessment name", { exact: true })
    .fill("Regression assessment");
  await page.getByLabel("Aisha Rahman Reading", { exact: true }).fill("8");
  await page
    .getByLabel("Attendance for Daniel Lee", { exact: true })
    .selectOption("absent");
  await expect(
    page.getByRole("row").filter({ hasText: "Aisha Rahman" }),
  ).toContainText("80%");
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Regression assessment" }),
  ).toContainText("/10");
  await page
    .getByRole("row")
    .filter({ hasText: "Regression assessment" })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page
    .getByLabel("Assessment name", { exact: true })
    .fill("Renamed assessment");
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(7);
  await page
    .getByRole("button", { name: "School settings", exact: true })
    .click();
  await page.getByLabel("Default maximum mark").selectOption("5");
  await page
    .getByRole("button", { name: "Save school settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Assessments", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Renamed assessment" }),
  ).toContainText("/10");
  await page.reload();
  await page
    .getByRole("button", { name: "Explore a sample classroom" })
    .click();
  await page.getByRole("button", { name: "Assessments", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Renamed assessment" }),
  ).toBeVisible();
});
test("leaderboard achievement and growth, sharing restricted to cloud", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Classroom champions" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Most improved", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The growth club" }),
  ).toBeVisible();
  await expect(page.locator(".rank-row")).toHaveCount(10);
  if (evidence)
    await page.screenshot({
      path: path.join(evidence, "leaderboard.png"),
      fullPage: true,
    });
  await page
    .getByRole("button", { name: "Share leaderboard", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("after Google sign-in");
});
test("student creation defaults to no leaderboard permission; text is escaped", async ({
  page,
}) => {
  await sample(page);
  await page
    .getByRole("button", { name: "Classes & students", exact: true })
    .click();
  await page.getByRole("button", { name: "Add student", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("<img src=x onerror=alert(1)>");
  await expect(
    page.getByRole("dialog").getByRole("checkbox"),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Save student", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "<img src=x onerror=alert(1)>" }),
  ).toContainText("Private");
  await expect(page.locator("img[src=x]")).toHaveCount(0);
});
test("failed persistence retains draft and never reports success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "classinsights_demo_v2")
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      return original.call(this, k, v);
    };
  });
  await sample(page);
  await page.getByRole("button", { name: "Assessments", exact: true }).click();
  await page
    .getByRole("button", { name: "New assessment", exact: true })
    .click();
  await page.getByLabel("Assessment name", { exact: true }).fill("Unsaved");
  await page.getByLabel("Aisha Rahman Reading", { exact: true }).fill("8");
  await page
    .getByRole("button", { name: "Save assessment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Storage quota exceeded");
  await expect(page.getByLabel("Assessment name", { exact: true })).toHaveValue(
    "Unsaved",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
});
test("mobile has no page overflow and keeps teacher actions reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sample(page);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  if (evidence)
    await page.screenshot({
      path: path.join(evidence, "mobile.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Share leaderboard", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});
