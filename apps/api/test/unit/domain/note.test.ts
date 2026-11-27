import { describe, expect, test } from "bun:test";
import { ValidationError } from "../../../src/domain/errors";
import { createNote, NOTE_BODY_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from "../../../src/domain/note";

const at = new Date("2026-01-01T00:00:00.000Z");

describe("createNote", () => {
  test("trims the title and body", () => {
    expect(createNote({ title: "  Groceries ", body: " milk " }, "id-1", at)).toEqual({
      id: "id-1",
      title: "Groceries",
      body: "milk",
      createdAt: at,
    });
  });

  test("defaults the body to an empty string", () => {
    expect(createNote({ title: "Groceries" }, "id-1", at).body).toBe("");
  });

  test.each([
    ["an empty title", { title: "   " }],
    ["a title that is too long", { title: "x".repeat(NOTE_TITLE_MAX_LENGTH + 1) }],
    ["a body that is too long", { title: "ok", body: "x".repeat(NOTE_BODY_MAX_LENGTH + 1) }],
  ])("rejects %s", (_, input) => {
    expect(() => createNote(input, "id-1", at)).toThrow(ValidationError);
  });
});
