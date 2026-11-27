import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { HelloPage } from "./hello-page";

describe("HelloPage", () => {
  test("greets the world when no name is given", () => {
    expect(renderToStaticMarkup(<HelloPage />)).toBe("<h1>Hello, world!</h1>");
  });

  test("greets the name it is given", () => {
    expect(renderToStaticMarkup(<HelloPage name="Ada" />)).toBe("<h1>Hello, Ada!</h1>");
  });
});
