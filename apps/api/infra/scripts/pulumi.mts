// Runs setup (scripts/setup.mts), then the Pulumi command, so prerequisites are always in place.
//
//   bun scripts/pulumi.mts <pulumi args>       e.g. `up --yes`, `preview --stack prod`
//
// The stack comes from --stack/-s in the args, else PULUMI_STACK, else dev.
import { setup, SetupError } from "./setup.mjs";

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
  console.error(`\nsetup failed: ${error instanceof SetupError || error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const pulumi = Bun.spawn(["pulumi", ...pulumiArgs], {
  cwd: `${import.meta.dir}/..`,
  stdio: ["inherit", "inherit", "inherit"],
  env: process.env, // includes the PULUMI_CONFIG_PASSPHRASE default that setup applied
});
process.exit(await pulumi.exited);
