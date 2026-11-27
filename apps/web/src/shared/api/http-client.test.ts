import { http, HttpResponse } from "msw";
import { z } from "zod";

import { ApiError, request } from "@/shared/api/http-client";
import { server } from "@/test/mocks/server";

const schema = z.object({ id: z.number() });

describe("request", () => {
  it("returns the parsed body when the response matches the schema", async () => {
    server.use(http.get("/api/thing", () => HttpResponse.json({ id: 1 })));

    await expect(request("/thing", { schema })).resolves.toEqual({ id: 1 });
  });

  it("asks for JSON unless the caller sets its own Accept header", async () => {
    const accepts: (string | null)[] = [];
    server.use(
      http.get("/api/thing", ({ request: req }) => {
        accepts.push(req.headers.get("Accept"));
        return HttpResponse.json({ id: 1 });
      }),
    );

    await request("/thing", { schema });
    await request("/thing", { schema, init: { headers: { Accept: "application/vnd.api+json" } } });

    expect(accepts).toEqual(["application/json", "application/vnd.api+json"]);
  });

  it("throws an ApiError carrying the status on a non-2xx response", async () => {
    server.use(http.get("/api/thing", () => new HttpResponse(null, { status: 503 })));

    const error: unknown = await request("/thing", { schema }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503 });
  });

  it("rejects a body that does not match the schema", async () => {
    server.use(http.get("/api/thing", () => HttpResponse.json({ id: "not-a-number" })));

    await expect(request("/thing", { schema })).rejects.toThrow(z.ZodError);
  });
});
