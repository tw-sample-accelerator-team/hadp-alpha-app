import type { SayHello } from "../../../application/ports/inbound/say-hello";

export const helloRoute = (sayHello: SayHello) => (request: Request): Response => {
  const name = new URL(request.url).searchParams.get("name") ?? undefined;
  return Response.json(sayHello.execute(name));
};
