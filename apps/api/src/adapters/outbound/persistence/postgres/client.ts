import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseConnection {
  readonly db: Database;
  close(): Promise<void>;
}

export interface DatabaseOptions {
  readonly url: string;
  readonly maxConnections?: number;
}

export const connectDatabase = ({ url, maxConnections = 10 }: DatabaseOptions): DatabaseConnection => {
  const client = postgres(url, { max: maxConnections, onnotice: () => undefined });
  const db = drizzle(client, { schema });
  return {
    db,
    close: () => client.end({ timeout: 5 }),
  };
};
