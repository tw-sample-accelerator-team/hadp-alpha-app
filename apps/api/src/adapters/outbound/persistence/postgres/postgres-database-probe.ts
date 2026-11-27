import { sql } from "drizzle-orm";
import type { DatabaseProbe } from "../../../../application/ports/outbound/database-probe";
import type { Database } from "./client";

export class PostgresDatabaseProbe implements DatabaseProbe {
  constructor(private readonly db: Database) {}

  async isReachable(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch {
      return false;
    }
  }
}
