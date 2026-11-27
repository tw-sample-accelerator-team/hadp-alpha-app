import type { RouteObject } from "react-router";

import { RootLayout } from "@/app/layouts/root-layout";
import { RouteErrorPage } from "@/app/routes/route-error-page";

/**
 * The route tree. Feature pages are lazy-loaded so each feature ships as its
 * own chunk. Tests build a memory router from this same tree.
 */
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("@/features/home")).HomePage }),
      },
      {
        path: "health",
        lazy: async () => ({ Component: (await import("@/features/health")).HealthPage }),
      },
      {
        path: "*",
        lazy: async () => ({ Component: (await import("@/app/routes/not-found-page")).NotFoundPage }),
      },
    ],
  },
];
