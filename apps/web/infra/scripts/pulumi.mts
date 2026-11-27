// Runs setup (scripts/setup.mts), builds the app for `preview` and `up`, then runs the
// Pulumi command, so prerequisites and a fresh build are always in place.
//
//   bun scripts/pulumi.mts <pulumi args>       e.g. `up --yes`, `preview --stack prod`
//
// The stack comes from --stack/-s in the args, else PULUMI_STACK, else dev.
import { APP_ROOT, setup, SetupError } from "./setup.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: bun scripts/pulumi.mts <pulumi command> [args]");
  process.exit(2);
}

const flagIndex = args.findIndex((arg) => arg === "--stack" || arg === "-s");
const inline = args.find((arg) => arg.startsWith("--stack="))?.slice("--stack=".length);
const stack = inline ?? (flagIndex >= 0 ? args[flagIndex + 1] : undefined) ?? process.env["PULUMI_STACK"] ?? "dev";
const pulumiArgs = inline !== undefined || flagIndex >= 0 ? args : [...args, "--stack", stack];

try {
  await setup({ stack });
} catch (error) {
  console.error(
    `\nsetup failed: ${error instanceof SetupError || error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

// The program releases ../dist, so preview and up need a build of the current code.
if (["preview", "up", "update"].includes(args[0] ?? "")) {
  console.info("build: bun run build\n");
  const build = Bun.spawn(["bun", "run", "build"], { cwd: APP_ROOT, stdio: ["inherit", "inherit", "inherit"] });
  const code = await build.exited;
  if (code !== 0) {
    console.error("\nbuild failed; fix it and run again");
    process.exit(code);
  }
  console.info("");
}

const pulumi = Bun.spawn(["pulumi", ...pulumiArgs], {
  cwd: `${import.meta.dir}/..`,
  stdio: ["inherit", "inherit", "inherit"],
  env: process.env, // includes the passphrase default and quota project that setup applied
});
process.exit(await pulumi.exited);
