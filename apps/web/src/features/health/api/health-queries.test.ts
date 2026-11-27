import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { useHealthQuery } from "@/features/health/api/health-queries";
import { healthyResponse } from "@/test/mocks/handlers";
import { server } from "@/test/mocks/server";
import { createQueryWrapper } from "@/test/render";

describe("useHealthQuery", () => {
  it("returns the backend health", async () => {
    const { result } = renderHook(() => useHealthQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(healthyResponse);
  });

  it("exposes the error when the request fails", async () => {
    server.use(http.get("/api/health", () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useHealthQuery(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
