import { ValidationError } from "../../domain/errors";
import type { Note } from "../../domain/note";
import type { ListNotes, ListNotesQuery } from "../ports/inbound/list-notes";
import type { NoteRepository } from "../ports/outbound/note-repository";

export const LIST_NOTES_MAX_LIMIT = 100;

export class ListNotesUseCase implements ListNotes {
  constructor(private readonly notes: NoteRepository) {}

  async execute({ limit, offset }: ListNotesQuery): Promise<readonly Note[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > LIST_NOTES_MAX_LIMIT) {
      throw new ValidationError(`limit must be an integer between 1 and ${String(LIST_NOTES_MAX_LIMIT)}`);
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ValidationError("offset must be a non-negative integer");
    }
    return this.notes.list({ limit, offset });
  }
}
