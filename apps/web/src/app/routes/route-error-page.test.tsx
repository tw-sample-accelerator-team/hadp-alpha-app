import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";

import { RouteErrorPage } from "@/app/routes/route-error-page";

const renderWithLoaderThrowing = (thrown: unknown) => {
  const router = createMemoryRouter([
    {
      path: "/",
      errorElement: <RouteErrorPage />,
      loader: () => {
        throw thrown;
      },
      Component: () => null,
    },
  ]);
  render(<RouterProvider router={router} />);
};

describe("RouteErrorPage", () => {
  it("shows the status of a thrown route response", async () => {
    renderWithLoaderThrowing(new Response(null, { status: 404, statusText: "Not Found" }));

    expect(await screen.findByText("404 Not Found")).toBeInTheDocument();
  });

  it("shows the message of a thrown Error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderWithLoaderThrowing(new Error("Boom"));

    expect(await screen.findByText("Boom")).toBeInTheDocument();
  });

  it("falls back to a generic message for anything else", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderWithLoaderThrowing("a string");

    expect(await screen.findByText("Unknown error")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });
});
