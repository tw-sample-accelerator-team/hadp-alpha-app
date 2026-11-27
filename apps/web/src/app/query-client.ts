import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/shared/api/http-client";

const MAX_RETRIES = 2;

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  // A 4xx will not fix itself; retrying only delays the error the user needs to see.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
};

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
