import { startApp } from "./composition-root";
import { loadConfig } from "./config/env";

const app = startApp(loadConfig());
console.info(`api listening on ${app.server.url.href}`);

const shutdown = (signal: NodeJS.Signals): void => {
  console.info(`received ${signal}, shutting down`);
  void app.stop().then(() => process.exit(0));
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
