import type { z } from "zod";

import { env } from "@/shared/config/env";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions<TSchema extends z.ZodType> {
  schema: TSchema;
  init?: RequestInit;
}

/**
 * Fetches `path` from the backend and validates the JSON body with `schema`,
 * so the rest of the app only ever sees data that matches its types.
 */
export const request = async <TSchema extends z.ZodType>(
  path: string,
  { schema, init }: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(`${env.VITE_API_BASE_PATH}${path}`, { ...init, headers });

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed with ${response.status}`);
  }

  const body: unknown = await response.json();
  return schema.parse(body);
};
