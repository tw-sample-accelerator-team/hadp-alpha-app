import type { Note } from "../../../domain/note";

export interface ListNotesQuery {
  readonly limit: number;
  readonly offset: number;
}

export interface ListNotes {
  execute(query: ListNotesQuery): Promise<readonly Note[]>;
}
