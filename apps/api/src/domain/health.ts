export type HealthStatus = "ok" | "degraded";

export interface Health {
  readonly status: HealthStatus;
  readonly checkedAt: Date;
  readonly checks: Readonly<Record<string, boolean>>;
}

export const assessHealth = (checkedAt: Date, checks: Record<string, boolean>): Health => ({
  status: Object.values(checks).every(Boolean) ? "ok" : "degraded",
  checkedAt,
  checks,
});
