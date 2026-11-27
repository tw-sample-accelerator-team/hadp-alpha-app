import { NotFoundError } from "../../domain/errors";
import type { Note } from "../../domain/note";
import type { GetNote } from "../ports/inbound/get-note";
import type { NoteRepository } from "../ports/outbound/note-repository";

export class GetNoteUseCase implements GetNote {
  constructor(private readonly notes: NoteRepository) {}

  async execute(id: string): Promise<Note> {
    const note = await this.notes.findById(id);
    if (!note) {
      throw new NotFoundError(`note ${id} not found`);
    }
    return note;
  }
}
