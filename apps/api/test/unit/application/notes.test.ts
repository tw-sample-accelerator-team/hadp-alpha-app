import { beforeEach, describe, expect, test } from "bun:test";
import { CreateNoteUseCase } from "../../../src/application/use-cases/create-note";
import { GetNoteUseCase } from "../../../src/application/use-cases/get-note";
import { LIST_NOTES_MAX_LIMIT, ListNotesUseCase } from "../../../src/application/use-cases/list-notes";
import { NotFoundError, ValidationError } from "../../../src/domain/errors";
import { FixedClock, InMemoryNoteRepository, SequentialIdGenerator } from "../../support/fakes";

let repository: InMemoryNoteRepository;
let clock: FixedClock;
let createNote: CreateNoteUseCase;

beforeEach(() => {
  repository = new InMemoryNoteRepository();
  clock = new FixedClock();
  createNote = new CreateNoteUseCase(repository, new SequentialIdGenerator(), clock);
});

describe("CreateNoteUseCase", () => {
  test("persists a valid note with a generated id and the current time", async () => {
    const note = await createNote.execute({ title: "Groceries", body: "milk" });

    expect(note).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      title: "Groceries",
      body: "milk",
      createdAt: clock.current,
    });
    expect(repository.notes.get(note.id)).toEqual(note);
  });

  test("does not persist an invalid note", async () => {
    await expect(createNote.execute({ title: "" })).rejects.toThrow(ValidationError);
    expect(repository.notes.size).toBe(0);
  });
});

describe("GetNoteUseCase", () => {
  test("returns the stored note", async () => {
    const note = await createNote.execute({ title: "Groceries" });
    expect(await new GetNoteUseCase(repository).execute(note.id)).toEqual(note);
  });

  test("throws NotFoundError for an unknown id", async () => {
    await expect(new GetNoteUseCase(repository).execute("missing")).rejects.toThrow(NotFoundError);
  });
});

describe("ListNotesUseCase", () => {
  test("returns notes newest first, paginated", async () => {
    const first = await createNote.execute({ title: "first" });
    clock.advance(1_000);
    const second = await createNote.execute({ title: "second" });

    const listNotes = new ListNotesUseCase(repository);
    expect(await listNotes.execute({ limit: 10, offset: 0 })).toEqual([second, first]);
    expect(await listNotes.execute({ limit: 1, offset: 1 })).toEqual([first]);
  });

  test.each([
    { limit: 0, offset: 0 },
    { limit: LIST_NOTES_MAX_LIMIT + 1, offset: 0 },
    { limit: 10, offset: -1 },
  ])("rejects out-of-range pagination %o", async (query) => {
    await expect(new ListNotesUseCase(repository).execute(query)).rejects.toThrow(ValidationError);
  });
});
