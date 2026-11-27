import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { server } from "@/test/mocks/server";
import { renderRoute } from "@/test/render";

describe("Health page", () => {
  it("loads and shows the backend status", async () => {
    renderRoute("/health");

    expect(await screen.findByText("Operational")).toBeInTheDocument();
  });

  it("shows an error when the backend fails", async () => {
    server.use(http.get("/api/health", () => new HttpResponse(null, { status: 500 })));

    renderRoute("/health");

    expect(await screen.findByText("Could not reach the backend")).toBeInTheDocument();
  });

  it("refetches when the user asks to check again", async () => {
    let calls = 0;
    server.use(
      http.get("/api/health", () => {
        calls += 1;
        return HttpResponse.json({
          status: calls === 1 ? "ok" : "degraded",
          checkedAt: "2026-01-01T12:00:00.000Z",
        });
      }),
    );
    const { user } = renderRoute("/health");
    await screen.findByText("Operational");

    await user.click(screen.getByRole("button", { name: "Check again" }));

    expect(await screen.findByText("Degraded")).toBeInTheDocument();
  });
});
