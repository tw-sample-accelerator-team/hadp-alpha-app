import { $ } from "bun";

export type ShellPromise = $.ShellPromise;
export type ShellOutput = $.ShellOutput;

/** A failure the person running the script can fix; printed without a stack trace. */
export class SetupError extends Error {}

export const step = (title: string): void => console.info(`\n${title}`);
export const ok = (message: string): void => console.info(`  ✓ ${message}`);
export const warn = (message: string): void => console.warn(`  ! ${message}`);
export const change = (message: string, dryRun: boolean): void =>
  console.info(dryRun ? `  ~ would ${message}` : `  + ${message}`);

export const run = (command: ShellPromise): Promise<ShellOutput> => command.nothrow().quiet();

export const succeeds = async (command: ShellPromise): Promise<boolean> => (await run(command)).exitCode === 0;

/** The first meaningful stderr line; skips gcloud's WARNING lines (e.g. about impersonation). */
export const firstLine = (result: ShellOutput): string =>
  result.stderr
    .toString()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("WARNING:"))
    ?.replace(/^ERROR: /, "") ?? "";

/** Runs a command and returns its stdout; throws SetupError with its stderr when it fails. */
export const output = async (command: ShellPromise): Promise<string> => {
  const result = await run(command);
  if (result.exitCode !== 0) throw new SetupError(result.stderr.toString().trim());
  return result.stdout.toString().trim();
};

/** Runs a script's main function, printing SetupError messages cleanly and exiting non-zero. */
export const main = async (name: string, body: () => Promise<unknown>): Promise<void> => {
  try {
    await body();
  } catch (error) {
    console.error(`\n${name} failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
};
