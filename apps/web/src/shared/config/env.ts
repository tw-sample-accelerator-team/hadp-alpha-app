import { z } from "zod";

/**
 * Typed, validated access to `import.meta.env`.
 * Add every `VITE_*` variable the app reads here, so a missing or malformed
 * value fails fast at start-up instead of deep inside a component.
 */
const envSchema = z.object({
  VITE_APP_TITLE: z.string().min(1).default("App"),
  VITE_API_BASE_PATH: z.string().startsWith("/").default("/api"),
});

export const env = envSchema.parse(import.meta.env);
