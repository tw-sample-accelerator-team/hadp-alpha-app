import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { Subprocess } from "bun";
import { resolve } from "node:path";
import { resetDatabase, testDatabaseUrl } from "../support/database";

// Boots the real entry point (src/main.ts) as a separate process against the test
// database and drives it over HTTP, exactly as a client would.

const ROOT = resolve(import.meta.dir, "../..");
let app: Subprocess;
let baseUrl: string;

const freePort = (): number => {
  const probe = Bun.serve({ port: 0, fetch: () => new Response() });
  const { port } = probe;
  void probe.stop(true);
  if (port === undefined) throw new Error("could not allocate a port");
  return port;
};

const waitUntilHealthy = async (timeoutMs = 10_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${baseUrl}/health`)).ok) return;
    } catch {
      // not listening yet
    }
    await Bun.sleep(100);
  }
  throw new Error(`app did not become healthy within ${String(timeoutMs)}ms`);
};

beforeAll(async () => {
  const port = freePort();
  baseUrl = `http://127.0.0.1:${String(port)}`;
  app = Bun.spawn(["bun", "src/main.ts"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "test", PORT: String(port), DATABASE_URL: testDatabaseUrl() },
    stdout: "inherit",
    stderr: "inherit",
  });
  await waitUntilHealthy();
});

afterAll(async () => {
  app.kill("SIGTERM");
  await app.exited;
});

beforeEach(async () => {
  await resetDatabase();
});

const createNote = async (title: string, body?: string): Promise<{ id: string; title: string }> => {
  const response = await fetch(`${baseUrl}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string; title: string };
};

describe("notes API", () => {
  test("reports healthy with a live database", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", checks: { database: true } });
  });

  test("a created note can be fetched and listed", async () => {
    const created = await createNote("Groceries", "milk, eggs");

    const fetched = await fetch(`${baseUrl}/notes/${created.id}`);
    expect(fetched.status).toBe(200);
    expect(await fetched.json()).toEqual({ ...created, body: "milk, eggs" });

    const listed = (await (await fetch(`${baseUrl}/notes`)).json()) as { data: { id: string }[] };
    expect(listed.data.map(({ id }) => id)).toEqual([created.id]);
  });

  test("lists notes newest first and paginates", async () => {
    const first = await createNote("first");
    await Bun.sleep(5);
    const second = await createNote("second");

    const page = (await (await fetch(`${baseUrl}/notes?limit=1&offset=0`)).json()) as { data: { id: string }[] };
    expect(page.data.map(({ id }) => id)).toEqual([second.id]);
    const next = (await (await fetch(`${baseUrl}/notes?limit=1&offset=1`)).json()) as { data: { id: string }[] };
    expect(next.data.map(({ id }) => id)).toEqual([first.id]);
  });

  test("rejects an invalid note and stores nothing", async () => {
    const response = await fetch(`${baseUrl}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    expect(response.status).toBe(400);
    const listed = (await (await fetch(`${baseUrl}/notes`)).json()) as { data: unknown[] };
    expect(listed.data).toEqual([]);
  });

  test("returns 404 for a note that does not exist", async () => {
    const response = await fetch(`${baseUrl}/notes/${Bun.randomUUIDv7()}`);
    expect(response.status).toBe(404);
  });
});
