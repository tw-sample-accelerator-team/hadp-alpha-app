import type { IdGenerator } from "../../../application/ports/outbound/id-generator";

export class UuidGenerator implements IdGenerator {
  next(): string {
    return Bun.randomUUIDv7();
  }
}
