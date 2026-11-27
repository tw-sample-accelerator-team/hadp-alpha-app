import { ValidationError } from "./errors";

export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_BODY_MAX_LENGTH = 10_000;

export interface Note {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: Date;
}

export interface NewNoteInput {
  readonly title: string;
  readonly body?: string | undefined;
}

/** Applies the domain rules for a note and returns a valid entity. */
export const createNote = (input: NewNoteInput, id: string, createdAt: Date): Note => {
  const title = input.title.trim();
  const body = (input.body ?? "").trim();

  if (title.length === 0) {
    throw new ValidationError("title must not be empty");
  }
  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    throw new ValidationError(`title must be at most ${String(NOTE_TITLE_MAX_LENGTH)} characters`);
  }
  if (body.length > NOTE_BODY_MAX_LENGTH) {
    throw new ValidationError(`body must be at most ${String(NOTE_BODY_MAX_LENGTH)} characters`);
  }

  return { id, title, body, createdAt };
};
