import type { HealthResponse } from "@/shared/api/health-client";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

interface HealthStatusCardProps {
  health: HealthResponse;
}

const statusLabel: Record<HealthResponse["status"], string> = {
  ok: "Operational",
  degraded: "Degraded",
};

export const HealthStatusCard = ({ health }: HealthStatusCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Backend</CardTitle>
      <CardDescription>
        Checked at <time dateTime={health.checkedAt}>{new Date(health.checkedAt).toLocaleString()}</time>
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Badge variant={health.status === "ok" ? "default" : "destructive"}>{statusLabel[health.status]}</Badge>
    </CardContent>
  </Card>
);
