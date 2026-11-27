import type { Greeting } from "../../../domain/greeting";

export interface SayHello {
  execute(name?: string): Greeting;
}
