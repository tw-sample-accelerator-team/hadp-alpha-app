import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";

import { server } from "@/test/mocks/server";

// Any request without a handler fails the test, so no test talks to a real backend.
beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => {
  server.close();
});
