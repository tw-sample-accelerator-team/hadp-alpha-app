import type { NewNoteInput, Note } from "../../../domain/note";

export interface CreateNote {
  execute(input: NewNoteInput): Promise<Note>;
}
