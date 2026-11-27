import { beforeEach, describe, expect, test } from "bun:test";
import { DrizzleNoteRepository } from "../../src/adapters/outbound/persistence/postgres/drizzle-note-repository";
import type { Note } from "../../src/domain/note";
import { resetDatabase, testDatabase } from "../support/database";

// Runs the Drizzle adapter against a real, migrated Postgres (the postgres-test service).

const note = (overrides: Partial<Note> = {}): Note => ({
  id: Bun.randomUUIDv7(),
  title: "Groceries",
  body: "milk",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

let repository: DrizzleNoteRepository;

beforeEach(async () => {
  await resetDatabase();
  repository = new DrizzleNoteRepository(testDatabase().db);
});

describe("DrizzleNoteRepository", () => {
  test("saves a note and finds it by id", async () => {
    const saved = note();
    await repository.save(saved);
    expect(await repository.findById(saved.id)).toEqual(saved);
  });

  test("returns undefined for an unknown id", async () => {
    expect(await repository.findById(Bun.randomUUIDv7())).toBeUndefined();
  });

  test("saving an existing id updates it", async () => {
    const saved = note();
    await repository.save(saved);
    await repository.save({ ...saved, title: "Updated" });
    expect((await repository.findById(saved.id))?.title).toBe("Updated");
  });

  test("lists newest first with limit and offset", async () => {
    const older = note({ createdAt: new Date("2026-01-01T00:00:00.000Z") });
    const newer = note({ createdAt: new Date("2026-01-02T00:00:00.000Z") });
    await repository.save(older);
    await repository.save(newer);

    expect(await repository.list({ limit: 10, offset: 0 })).toEqual([newer, older]);
    expect(await repository.list({ limit: 1, offset: 1 })).toEqual([older]);
  });

  test("the database enforces the title length", async () => {
    await expect(repository.save(note({ title: "x".repeat(201) }))).rejects.toThrow();
  });
});
