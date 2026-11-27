import eslint from "@eslint/js";
import type { Linter } from "eslint";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Hexagonal dependency rule: dependencies point inward only.
//   domain       -> nothing outside domain
//   application  -> domain
//   adapters     -> application, domain
//   composition-root / main -> everything
const frameworks = "^(drizzle-orm|drizzle-kit|postgres|bun)(/.*)?$";
const restrict = (layers: string[], message: string): Linter.RulesRecord => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        { group: layers.map((layer) => `**/${layer}/**`), message },
        { regex: frameworks, message: "Only adapters may depend on frameworks and drivers." },
      ],
    },
  ],
});

export default defineConfig(
  // infra/ is its own Pulumi project with its own tsconfig; `cd infra && bun run typecheck`.
  { ignores: ["node_modules/", "coverage/", "dist/", "drizzle/", "infra/"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, Bun: "readonly" },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": ["error", { allow: ["info", "warn", "error"] }],
    },
  },
  {
    files: ["src/domain/**/*.ts"],
    rules: restrict(["application", "adapters", "config"], "The domain must not depend on outer layers."),
  },
  {
    files: ["src/application/**/*.ts"],
    rules: restrict(["adapters", "config"], "The application layer depends on ports, never on adapters."),
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      // bun:test types `expect(promise).rejects.toThrow()` as void, but it must be awaited.
      "@typescript-eslint/await-thenable": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
    },
  },
);
