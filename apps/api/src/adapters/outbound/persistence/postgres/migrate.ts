import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "./client";

/** The folder drizzle-kit writes migrations to (see drizzle.config.ts). */
export const MIGRATIONS_FOLDER = resolve(import.meta.dir, "../../../../../drizzle");

export const runMigrations = (db: Database, migrationsFolder = MIGRATIONS_FOLDER): Promise<void> =>
  migrate(db, { migrationsFolder });
