import { greet, type Greeting } from "../../domain/greeting";
import type { SayHello } from "../ports/inbound/say-hello";

export class SayHelloUseCase implements SayHello {
  execute(name = "world"): Greeting {
    return greet(name);
  }
}
