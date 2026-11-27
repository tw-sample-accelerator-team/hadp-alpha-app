import { expect, test } from "./fixtures";

test("an unknown URL shows the not found page", async ({ page }) => {
  await page.goto("/does-not-exist");

  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Go home" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("the home page is accessible", async ({ page, expectAccessible }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();

  await expectAccessible(page);
});
