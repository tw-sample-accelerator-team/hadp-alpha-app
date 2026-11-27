import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config.ts";

const integrationGlob = "src/**/*.integration.test.{ts,tsx}";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      clearMocks: true,
      restoreMocks: true,
      css: false,
      projects: [
        {
          extends: true,
          test: {
            name: "unit",
            include: ["src/**/*.test.{ts,tsx}"],
            exclude: [integrationGlob],
          },
        },
        {
          extends: true,
          test: {
            name: "integration",
            include: [integrationGlob],
          },
        },
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/main.tsx", "src/test/**", "src/shared/ui/**", "src/**/*.d.ts", "src/**/index.ts"],
        thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
      },
    },
  }),
);
