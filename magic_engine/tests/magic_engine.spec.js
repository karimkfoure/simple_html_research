const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/magic_engine/");
});

test("magic engine lab carga la shell estatica y sus controles base", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "magic engine lab" })).toBeVisible();
  await expect(page.getByTestId("api-key")).toBeVisible();
  await expect(page.getByTestId("cast-spell")).toBeVisible();
  await expect(page.getByTestId("model-list")).toBeVisible();
  await expect(page.getByTestId("research-list")).toContainText("foundations");
  await expect(page.getByTestId("log-view")).toContainText("[]");
});
