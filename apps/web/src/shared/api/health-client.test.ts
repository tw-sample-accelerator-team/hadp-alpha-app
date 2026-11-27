import { http, HttpResponse } from "msw";

import { fetchHealth } from "@/shared/api/health-client";
import { server } from "@/test/mocks/server";
import { healthyResponse } from "@/test/mocks/handlers";

describe("fetchHealth", () => {
  it("returns the backend health", async () => {
    await expect(fetchHealth()).resolves.toEqual(healthyResponse);
  });

  it("passes the abort signal to the request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchHealth(controller.signal)).rejects.toThrow();
  });

  it("rejects an unknown status", async () => {
    server.use(http.get("/api/health", () => HttpResponse.json({ ...healthyResponse, status: "on-fire" })));

    await expect(fetchHealth()).rejects.toThrow();
  });
});
