import type { Clock } from "../../src/application/ports/outbound/clock";
import type { DatabaseProbe } from "../../src/application/ports/outbound/database-probe";
import type { IdGenerator } from "../../src/application/ports/outbound/id-generator";
import type { NoteRepository } from "../../src/application/ports/outbound/note-repository";
import type { Note } from "../../src/domain/note";

/** In-memory test doubles for outbound ports. Unit tests use these instead of Postgres. */

export class FixedClock implements Clock {
  constructor(public current = new Date("2026-01-01T00:00:00.000Z")) {}

  now(): Date {
    return this.current;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  next(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${this.counter.toString().padStart(12, "0")}`;
  }
}

export class StubDatabaseProbe implements DatabaseProbe {
  constructor(public reachable = true) {}

  isReachable(): Promise<boolean> {
    return Promise.resolve(this.reachable);
  }
}

export class InMemoryNoteRepository implements NoteRepository {
  readonly notes = new Map<string, Note>();

  save(note: Note): Promise<void> {
    this.notes.set(note.id, note);
    return Promise.resolve();
  }

  findById(id: string): Promise<Note | undefined> {
    return Promise.resolve(this.notes.get(id));
  }

  list({ limit, offset }: { limit: number; offset: number }): Promise<Note[]> {
    const sorted = [...this.notes.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
    );
    return Promise.resolve(sorted.slice(offset, offset + limit));
  }
}
