import { describe, expect, test } from "bun:test";
import { ConfigError, loadConfig } from "../../../src/config/env";

const DATABASE_URL = "postgres://app:app@localhost:5432/app";

describe("loadConfig", () => {
  test("reads the port and database url", () => {
    expect(loadConfig({ PORT: "8080", DATABASE_URL })).toEqual({ port: 8080, databaseUrl: DATABASE_URL });
  });

  test("defaults the port", () => {
    expect(loadConfig({ DATABASE_URL }).port).toBe(3000);
  });

  test("requires DATABASE_URL", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
  });

  test("rejects an invalid port", () => {
    expect(() => loadConfig({ PORT: "abc", DATABASE_URL })).toThrow(ConfigError);
  });
});
