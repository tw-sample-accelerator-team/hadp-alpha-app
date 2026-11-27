import { helloRoute } from "./adapters/inbound/http/hello-route";
import { SayHelloUseCase } from "./application/use-cases/say-hello";

const sayHello = new SayHelloUseCase();

Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/hello": helloRoute(sayHello),
  },
});
