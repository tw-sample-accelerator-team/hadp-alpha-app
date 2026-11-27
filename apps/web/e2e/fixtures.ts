import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export interface HealthStub {
  status: "ok" | "degraded";
  checkedAt: string;
}

interface Fixtures {
  /** Replies to GET /api/health with `body`, or with an HTTP error when given a number. */
  stubHealth: (body: HealthStub | number) => Promise<void>;
  /** Fails the test if the current page has any WCAG A/AA violations. */
  expectAccessible: (page: Page) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  stubHealth: async ({ page }, use) => {
    await use(async (body) => {
      await page.route("**/api/health", (route) =>
        typeof body === "number" ? route.fulfill({ status: body }) : route.fulfill({ json: body }),
      );
    });
  },
  // eslint-disable-next-line no-empty-pattern -- Playwright requires an object pattern here.
  expectAccessible: async ({}, use) => {
    await use(async (page) => {
      // Let CSS transitions settle so axe never samples a half-faded element.
      await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations).toEqual([]);
    });
  },
});

export { expect };
