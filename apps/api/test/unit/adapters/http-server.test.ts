import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Server } from "bun";
import { startHttpServer } from "../../../src/adapters/inbound/http/server";
import { CreateNoteUseCase } from "../../../src/application/use-cases/create-note";
import { GetHealthUseCase } from "../../../src/application/use-cases/get-health";
import { GetNoteUseCase } from "../../../src/application/use-cases/get-note";
import { ListNotesUseCase } from "../../../src/application/use-cases/list-notes";
import { FixedClock, InMemoryNoteRepository, SequentialIdGenerator, StubDatabaseProbe } from "../../support/fakes";

// The HTTP adapter wired to real use cases over in-memory fakes: checks routing,
// parsing, status codes and error mapping without a database.

let server: Server<undefined>;
const probe = new StubDatabaseProbe(true);
const url = (path: string): string => new URL(path, server.url).href;

beforeAll(() => {
  const clock = new FixedClock();
  const notes = new InMemoryNoteRepository();
  server = startHttpServer(
    {
      getHealth: new GetHealthUseCase(clock, probe),
      createNote: new CreateNoteUseCase(notes, new SequentialIdGenerator(), clock),
      getNote: new GetNoteUseCase(notes),
      listNotes: new ListNotesUseCase(notes),
    },
    { port: 0, hostname: "127.0.0.1" },
  );
});

afterAll(async () => {
  await server.stop(true);
});

const postNote = (body: unknown): Promise<Response> =>
  fetch(url("/notes"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("HTTP adapter", () => {
  test("GET /health returns 200 when healthy and 503 when degraded", async () => {
    probe.reachable = true;
    expect((await fetch(url("/health"))).status).toBe(200);
    probe.reachable = false;
    const degraded = await fetch(url("/health"));
    expect(degraded.status).toBe(503);
    expect(await degraded.json()).toMatchObject({ status: "degraded", checks: { database: false } });
    probe.reachable = true;
  });

  test("POST /notes creates a note", async () => {
    const response = await postNote({ title: "Groceries" });
    expect(response.status).toBe(201);
    const note = (await response.json()) as { id: string };
    expect(response.headers.get("location")).toBe(`/notes/${note.id}`);
    expect(note).toMatchObject({ title: "Groceries", body: "", createdAt: "2026-01-01T00:00:00.000Z" });
  });

  test.each([
    ["malformed JSON", "{", "BAD_REQUEST"],
    ["a non-string title", { title: 1 }, "BAD_REQUEST"],
    ["an empty title", { title: "" }, "VALIDATION_FAILED"],
  ])("POST /notes returns 400 for %s", async (_, body, code) => {
    const response = await postNote(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code } });
  });

  test("GET /notes/:id returns 400 for a non-UUID and 404 for an unknown id", async () => {
    expect((await fetch(url("/notes/not-a-uuid"))).status).toBe(400);
    expect((await fetch(url("/notes/00000000-0000-4000-8000-999999999999"))).status).toBe(404);
  });

  test("GET /notes rejects a non-integer limit", async () => {
    expect((await fetch(url("/notes?limit=abc"))).status).toBe(400);
  });

  test("unknown routes return a JSON 404", async () => {
    const response = await fetch(url("/nope"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND", message: "route not found" } });
  });
});
