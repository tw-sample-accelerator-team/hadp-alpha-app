import { createNote, type NewNoteInput, type Note } from "../../domain/note";
import type { CreateNote } from "../ports/inbound/create-note";
import type { Clock } from "../ports/outbound/clock";
import type { IdGenerator } from "../ports/outbound/id-generator";
import type { NoteRepository } from "../ports/outbound/note-repository";

export class CreateNoteUseCase implements CreateNote {
  constructor(
    private readonly notes: NoteRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: NewNoteInput): Promise<Note> {
    const note = createNote(input, this.ids.next(), this.clock.now());
    await this.notes.save(note);
    return note;
  }
}
