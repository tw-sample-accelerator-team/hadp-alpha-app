import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchHealth } from "@/shared/api/health-client";

/**
 * Query keys and options for the health feature live together, so every
 * caller (hooks, prefetching, invalidation, tests) shares one definition.
 */
const healthKeys = {
  all: ["health"] as const,
  status: () => [...healthKeys.all, "status"] as const,
};

const healthQueryOptions = () =>
  queryOptions({
    queryKey: healthKeys.status(),
    queryFn: ({ signal }) => fetchHealth(signal),
    refetchInterval: 30_000,
  });

export const useHealthQuery = () => useQuery(healthQueryOptions());
