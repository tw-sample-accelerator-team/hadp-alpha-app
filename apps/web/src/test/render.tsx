import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { routes } from "@/app/routes";

/** A fresh client per test: no shared cache, no retries. */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

/** Unit tests for hooks: `renderHook(() => useThing(), { wrapper: createQueryWrapper() })`. */
export const createQueryWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/** Integration tests: render the real route tree at `path`, with the network mocked by MSW. */
export const renderRoute = (path: string) => {
  const queryClient = createTestQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    user: userEvent.setup(),
    queryClient,
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
};
