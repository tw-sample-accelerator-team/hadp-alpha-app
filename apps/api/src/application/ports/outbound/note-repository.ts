import type { Note } from "../../../domain/note";

export interface NoteRepository {
  save(note: Note): Promise<void>;
  findById(id: string): Promise<Note | undefined>;
  /** Newest first. */
  list(options: { limit: number; offset: number }): Promise<Note[]>;
}
