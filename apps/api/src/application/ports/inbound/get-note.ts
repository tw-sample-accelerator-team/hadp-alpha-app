import type { Note } from "../../../domain/note";

export interface GetNote {
  /** @throws NotFoundError when no note has the given id. */
  execute(id: string): Promise<Note>;
}
