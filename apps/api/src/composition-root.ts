import type { Server } from "bun";
import { startHttpServer } from "./adapters/inbound/http/server";
import { connectDatabase } from "./adapters/outbound/persistence/postgres/client";
import { DrizzleNoteRepository } from "./adapters/outbound/persistence/postgres/drizzle-note-repository";
import { PostgresDatabaseProbe } from "./adapters/outbound/persistence/postgres/postgres-database-probe";
import { SystemClock } from "./adapters/outbound/system/system-clock";
import { UuidGenerator } from "./adapters/outbound/system/uuid-generator";
import { CreateNoteUseCase } from "./application/use-cases/create-note";
import { GetHealthUseCase } from "./application/use-cases/get-health";
import { GetNoteUseCase } from "./application/use-cases/get-note";
import { ListNotesUseCase } from "./application/use-cases/list-notes";
import type { AppConfig } from "./config/env";

export interface App {
  readonly server: Server<undefined>;
  stop(): Promise<void>;
}

/** The only place that knows about every layer: wires adapters to ports. */
export const startApp = (config: AppConfig): App => {
  const database = connectDatabase({ url: config.databaseUrl });
  const clock = new SystemClock();
  const notes = new DrizzleNoteRepository(database.db);

  const server = startHttpServer(
    {
      getHealth: new GetHealthUseCase(clock, new PostgresDatabaseProbe(database.db)),
      createNote: new CreateNoteUseCase(notes, new UuidGenerator(), clock),
      getNote: new GetNoteUseCase(notes),
      listNotes: new ListNotesUseCase(notes),
    },
    { port: config.port },
  );

  return {
    server,
    stop: async () => {
      await server.stop();
      await database.close();
    },
  };
};
