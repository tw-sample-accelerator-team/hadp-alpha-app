import { afterAll, beforeAll } from "bun:test";
import { runMigrations } from "../../src/adapters/outbound/persistence/postgres/migrate";
import { closeTestDatabase, testDatabase } from "./database";

// Preloaded by test:integration and test:e2e (see package.json): migrate the test
// database once before any suite runs, and release the pool when they all finish.

beforeAll(async () => {
  await runMigrations(testDatabase().db);
});

afterAll(async () => {
  await closeTestDatabase();
});
