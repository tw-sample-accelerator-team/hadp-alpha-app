import type { Health } from "../../../domain/health";

export interface GetHealth {
  execute(): Promise<Health>;
}
