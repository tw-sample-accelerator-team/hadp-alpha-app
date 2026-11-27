import { describe, expect, test } from "bun:test";
import { connectDatabase } from "../../src/adapters/outbound/persistence/postgres/client";
import { PostgresDatabaseProbe } from "../../src/adapters/outbound/persistence/postgres/postgres-database-probe";
import { testDatabase } from "../support/database";

describe("PostgresDatabaseProbe", () => {
  test("is reachable against the test database", async () => {
    expect(await new PostgresDatabaseProbe(testDatabase().db).isReachable()).toBe(true);
  });

  test("is unreachable when nothing listens, without throwing", async () => {
    const unreachable = connectDatabase({ url: "postgres://app:app@127.0.0.1:1/nowhere", maxConnections: 1 });
    try {
      expect(await new PostgresDatabaseProbe(unreachable.db).isReachable()).toBe(false);
    } finally {
      await unreachable.close();
    }
  });
});
