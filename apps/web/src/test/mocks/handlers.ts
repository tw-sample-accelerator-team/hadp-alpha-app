import { http, HttpResponse } from "msw";

import type { HealthResponse } from "@/shared/api/health-client";

export const healthyResponse: HealthResponse = {
  status: "ok",
  checkedAt: "2026-01-01T12:00:00.000Z",
};

/**
 * Default handlers: the happy path for every endpoint the app calls.
 * Override one in a test with `server.use(...)`.
 */
export const handlers = [http.get("/api/health", () => HttpResponse.json(healthyResponse))];
