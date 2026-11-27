import { screen, within } from "@testing-library/react";

import { renderRoute } from "@/test/render";

describe("routing", () => {
  it("navigates from home to the health page through the main nav", async () => {
    const { user, router } = renderRoute("/");
    await screen.findByRole("heading", { name: "Welcome" });

    const nav = screen.getByRole("navigation", { name: "Main" });
    await user.click(within(nav).getByRole("link", { name: "Health" }));

    expect(await screen.findByRole("heading", { name: "Health" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/health");
  });

  it("shows the not found page for an unknown route", async () => {
    renderRoute("/does-not-exist");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
