import { sql } from "drizzle-orm";
import {
  connectDatabase,
  type DatabaseConnection,
} from "../../src/adapters/outbound/persistence/postgres/client";

/**
 * Shared connection to the test database for integration and e2e suites.
 * `bun test` sets NODE_ENV=test, so Bun loads DATABASE_URL from .env.test.
 */

let connection: DatabaseConnection | undefined;

export const testDatabaseUrl = (): string => {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL is not set; expected it from .env.test or the CI environment");
  }
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`refusing to run destructive tests against "${name}": database name must end in _test`);
  }
  return url;
};

export const testDatabase = (): DatabaseConnection => {
  connection ??= connectDatabase({ url: testDatabaseUrl(), maxConnections: 5 });
  return connection;
};

/** Empties every application table. Call in beforeEach so tests never share rows. */
export const resetDatabase = async (): Promise<void> => {
  const { db } = testDatabase();
  const tables = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const names = tables.map(({ tablename }) => `"public"."${tablename}"`);
  if (names.length > 0) {
    await db.execute(sql.raw(`truncate table ${names.join(", ")} restart identity cascade`));
  }
};

export const closeTestDatabase = async (): Promise<void> => {
  await connection?.close();
  connection = undefined;
};
