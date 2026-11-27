import { expect, test } from "./fixtures";

test.describe("health", () => {
  test("a user checks the backend health from the home page", async ({ page, stubHealth }) => {
    await stubHealth({ status: "ok", checkedAt: "2026-01-01T12:00:00.000Z" });

    await page.goto("/");
    await page.getByRole("link", { name: "Check backend health" }).click();

    await expect(page).toHaveURL("/health");
    await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
    await expect(page.getByText("Operational")).toBeVisible();
  });

  test("a user sees an error when the backend is down", async ({ page, stubHealth }) => {
    await stubHealth(503);

    await page.goto("/health");

    await expect(page.getByText("Could not reach the backend")).toBeVisible({ timeout: 15_000 });
  });

  test("the health page is accessible", async ({ page, stubHealth, expectAccessible }) => {
    await stubHealth({ status: "ok", checkedAt: "2026-01-01T12:00:00.000Z" });

    await page.goto("/health");
    await expect(page.getByText("Operational")).toBeVisible();

    await expectAccessible(page);
  });
});
