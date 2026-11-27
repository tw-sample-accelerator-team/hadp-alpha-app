import { desc, eq } from "drizzle-orm";
import type { NoteRepository } from "../../../../application/ports/outbound/note-repository";
import type { Note } from "../../../../domain/note";
import type { Database } from "./client";
import { notes, type NoteRow } from "./schema";

const toDomain = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.createdAt,
});

export class DrizzleNoteRepository implements NoteRepository {
  constructor(private readonly db: Database) {}

  async save(note: Note): Promise<void> {
    await this.db
      .insert(notes)
      .values(note)
      .onConflictDoUpdate({ target: notes.id, set: { title: note.title, body: note.body } });
  }

  async findById(id: string): Promise<Note | undefined> {
    const [row] = await this.db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return row ? toDomain(row) : undefined;
  }

  async list({ limit, offset }: { limit: number; offset: number }): Promise<Note[]> {
    const rows = await this.db
      .select()
      .from(notes)
      .orderBy(desc(notes.createdAt), desc(notes.id))
      .limit(limit)
      .offset(offset);
    return rows.map(toDomain);
  }
}
