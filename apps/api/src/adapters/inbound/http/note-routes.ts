import type { BunRequest } from "bun";
import type { CreateNote } from "../../../application/ports/inbound/create-note";
import type { GetNote } from "../../../application/ports/inbound/get-note";
import type { ListNotes } from "../../../application/ports/inbound/list-notes";
import type { NewNoteInput, Note } from "../../../domain/note";
import { BadRequestError, handle, readJson } from "./responses";

export interface NoteRoutesDeps {
  readonly createNote: CreateNote;
  readonly getNote: GetNote;
  readonly listNotes: ListNotes;
}

export interface NoteDto {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
}

export const toNoteDto = (note: Note): NoteDto => ({
  id: note.id,
  title: note.title,
  body: note.body,
  createdAt: note.createdAt.toISOString(),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const parseNewNote = (payload: unknown): NewNoteInput => {
  if (typeof payload !== "object" || payload === null) {
    throw new BadRequestError("request body must be a JSON object");
  }
  const { title, body } = payload as Record<string, unknown>;
  if (typeof title !== "string") {
    throw new BadRequestError("title must be a string");
  }
  if (body !== undefined && typeof body !== "string") {
    throw new BadRequestError("body must be a string");
  }
  return { title, body };
};

const parseIntegerParam = (value: string | null, fallback: number, name: string): number => {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new BadRequestError(`${name} must be an integer`);
  }
  return parsed;
};

export const noteRoutes = ({ createNote, getNote, listNotes }: NoteRoutesDeps) => ({
  "/notes": {
    GET: handle(async (request: BunRequest<"/notes">) => {
      const { searchParams } = new URL(request.url);
      const notes = await listNotes.execute({
        limit: parseIntegerParam(searchParams.get("limit"), 20, "limit"),
        offset: parseIntegerParam(searchParams.get("offset"), 0, "offset"),
      });
      return Response.json({ data: notes.map(toNoteDto) });
    }),
    POST: handle(async (request: BunRequest<"/notes">) => {
      const note = await createNote.execute(parseNewNote(await readJson(request)));
      return Response.json(toNoteDto(note), {
        status: 201,
        headers: { Location: `/notes/${note.id}` },
      });
    }),
  },
  "/notes/:id": {
    GET: handle(async (request: BunRequest<"/notes/:id">) => {
      const { id } = request.params;
      if (!UUID_PATTERN.test(id)) {
        throw new BadRequestError("id must be a UUID");
      }
      return Response.json(toNoteDto(await getNote.execute(id)));
    }),
  },
});
