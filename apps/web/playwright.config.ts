import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const isCI = Boolean(process.env["CI"]);
// Chromium locally for a fast loop; the full matrix in CI, or locally with E2E_ALL_BROWSERS=1.
const allBrowsers = isCI || Boolean(process.env["E2E_ALL_BROWSERS"]);

/**
 * End-to-end tests run against the production build (`vite preview`), so they
 * exercise the same bundle that ships. The backend is stubbed per test in
 * `e2e/fixtures.ts`; point `baseURL` at a deployed environment to run them for real.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? `http://localhost:${String(port)}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(allBrowsers
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : []),
  ],
  webServer: {
    command: "bun run build && bun run preview",
    url: `http://localhost:${String(port)}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
