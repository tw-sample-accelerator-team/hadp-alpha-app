import type { GetHealth } from "../../../application/ports/inbound/get-health";
import { handle } from "./responses";

export const healthRoutes = (getHealth: GetHealth) => ({
  "/health": {
    GET: handle(async () => {
      const health = await getHealth.execute();
      return Response.json(
        { status: health.status, checkedAt: health.checkedAt.toISOString(), checks: health.checks },
        { status: health.status === "ok" ? 200 : 503 },
      );
    }),
  },
});
