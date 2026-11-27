import { z } from "zod";

import { request } from "@/shared/api/http-client";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  checkedAt: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const fetchHealth = (signal?: AbortSignal): Promise<HealthResponse> =>
  request("/health", { schema: healthResponseSchema, init: signal ? { signal } : {} });
