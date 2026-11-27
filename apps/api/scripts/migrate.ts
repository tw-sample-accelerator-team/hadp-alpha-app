import { connectDatabase } from "../src/adapters/outbound/persistence/postgres/client";
import { runMigrations } from "../src/adapters/outbound/persistence/postgres/migrate";
import { loadConfig } from "../src/config/env";

const { databaseUrl } = loadConfig();
const database = connectDatabase({ url: databaseUrl, maxConnections: 1 });

try {
  await runMigrations(database.db);
  console.info("migrations applied");
} finally {
  await database.close();
}
