import { describe, expect, test } from "bun:test";
import { helloRoute } from "../src/adapters/inbound/http/hello-route";
import { SayHelloUseCase } from "../src/application/use-cases/say-hello";

describe("say-hello", () => {
  test("greets the world when no name is given", () => {
    expect(new SayHelloUseCase().execute()).toEqual({ message: "Hello, world!" });
  });

  test("greets the name the HTTP request gives", async () => {
    const response = helloRoute(new SayHelloUseCase())(new Request("http://localhost/hello?name=Ada"));
    expect(await response.json()).toEqual({ message: "Hello, Ada!" });
  });
});
