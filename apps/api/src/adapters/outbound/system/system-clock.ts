import type { Clock } from "../../../application/ports/outbound/clock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
