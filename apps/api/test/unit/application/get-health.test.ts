import { describe, expect, test } from "bun:test";
import { GetHealthUseCase } from "../../../src/application/use-cases/get-health";
import { FixedClock, StubDatabaseProbe } from "../../support/fakes";

describe("GetHealthUseCase", () => {
  test("reports ok with the clock's time when the database is reachable", async () => {
    const clock = new FixedClock();
    const health = await new GetHealthUseCase(clock, new StubDatabaseProbe(true)).execute();
    expect(health).toEqual({ status: "ok", checkedAt: clock.current, checks: { database: true } });
  });

  test("reports degraded when the database is unreachable", async () => {
    const health = await new GetHealthUseCase(new FixedClock(), new StubDatabaseProbe(false)).execute();
    expect(health.status).toBe("degraded");
  });
});
