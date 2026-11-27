import { createQueryClient } from "@/app/query-client";
import { ApiError } from "@/shared/api/http-client";

const retry = createQueryClient().getDefaultOptions().queries?.retry;
if (typeof retry !== "function") throw new Error("Expected retry to be a function");

describe("createQueryClient retry policy", () => {
  it("does not retry client errors", () => {
    expect(retry(0, new ApiError(404, "Not found"))).toBe(false);
  });

  it("retries server errors up to the limit", () => {
    const serverError = new ApiError(503, "Unavailable");

    expect(retry(0, serverError)).toBe(true);
    expect(retry(1, serverError)).toBe(true);
    expect(retry(2, serverError)).toBe(false);
  });

  it("retries network errors", () => {
    expect(retry(0, new TypeError("Failed to fetch"))).toBe(true);
  });
});
