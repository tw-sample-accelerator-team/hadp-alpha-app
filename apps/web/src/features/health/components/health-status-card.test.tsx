import { render, screen } from "@testing-library/react";

import { HealthStatusCard } from "@/features/health/components/health-status-card";

describe("HealthStatusCard", () => {
  it("shows an operational badge when the backend is ok", () => {
    render(<HealthStatusCard health={{ status: "ok", checkedAt: "2026-01-01T12:00:00.000Z" }} />);

    expect(screen.getByText("Operational")).toBeInTheDocument();
  });

  it("shows a degraded badge when the backend is degraded", () => {
    render(<HealthStatusCard health={{ status: "degraded", checkedAt: "2026-01-01T12:00:00.000Z" }} />);

    expect(screen.getByText("Degraded")).toBeInTheDocument();
  });

  it("renders the check time as a machine-readable <time>", () => {
    render(<HealthStatusCard health={{ status: "ok", checkedAt: "2026-01-01T12:00:00.000Z" }} />);

    expect(screen.getByText(/2026|1\/1/).closest("time")).toHaveAttribute("datetime", "2026-01-01T12:00:00.000Z");
  });
});
