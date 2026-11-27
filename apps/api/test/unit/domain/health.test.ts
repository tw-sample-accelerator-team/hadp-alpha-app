import { describe, expect, test } from "bun:test";
import { assessHealth } from "../../../src/domain/health";

const at = new Date("2026-01-01T00:00:00.000Z");

describe("assessHealth", () => {
  test("is ok when every check passes", () => {
    expect(assessHealth(at, { database: true }).status).toBe("ok");
  });

  test("is degraded when any check fails", () => {
    expect(assessHealth(at, { database: true, cache: false }).status).toBe("degraded");
  });
});
