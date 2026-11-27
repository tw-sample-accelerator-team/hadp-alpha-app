import type { Server } from "bun";
import { healthRoutes } from "./health-routes";
import { noteRoutes, type NoteRoutesDeps } from "./note-routes";
import { errorResponse, toErrorResponse } from "./responses";
import type { GetHealth } from "../../../application/ports/inbound/get-health";

export interface HttpServerDeps extends NoteRoutesDeps {
  readonly getHealth: GetHealth;
}

export interface HttpServerOptions {
  readonly port: number;
  readonly hostname?: string;
}

export const startHttpServer = (deps: HttpServerDeps, options: HttpServerOptions): Server<undefined> =>
  Bun.serve({
    port: options.port,
    hostname: options.hostname ?? "0.0.0.0",
    routes: {
      ...healthRoutes(deps.getHealth),
      ...noteRoutes(deps),
    },
    fetch: () => errorResponse(404, "NOT_FOUND", "route not found"),
    error: toErrorResponse,
  });
