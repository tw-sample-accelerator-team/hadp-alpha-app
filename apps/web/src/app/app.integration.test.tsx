import { render, screen } from "@testing-library/react";

import { App } from "@/app/app";

describe("App", () => {
  it("boots with the real providers and router", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Welcome" })).toBeInTheDocument();
  });
});
