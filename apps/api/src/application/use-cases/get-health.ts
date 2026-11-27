import { assessHealth, type Health } from "../../domain/health";
import type { GetHealth } from "../ports/inbound/get-health";
import type { Clock } from "../ports/outbound/clock";
import type { DatabaseProbe } from "../ports/outbound/database-probe";

export class GetHealthUseCase implements GetHealth {
  constructor(
    private readonly clock: Clock,
    private readonly database: DatabaseProbe,
  ) {}

  async execute(): Promise<Health> {
    const database = await this.database.isReachable();
    return assessHealth(this.clock.now(), { database });
  }
}
