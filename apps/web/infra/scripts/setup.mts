// Prepares everything Pulumi needs before it runs. Idempotent and quick on repeat runs,
// so `bun run preview`, `deploy` and `destroy` run it every time (through scripts/pulumi.mts).
//
//   1. tools      gcloud and pulumi
//   2. gcloud     credentials work, application-default credentials work, the project is reachable
//   3. APIs       the ones setup itself and Pulumi's provider need (the stack enables the rest)
//   4. bucket     the state bucket from Pulumi.yaml: versioned, uniform access, public access prevented
//   5. deps       `bun install` for the app and for infra/
//   6. stack      selects the stack, creating it on first run (secrets unencrypted for now; see lib/target.mts)
//   7. Firebase   added to the project unless it has it (one-way: Firebase can't be removed from a project)
//
//   bun run setup [stack] [--dry-run]     # stack defaults to dev; --dry-run changes nothing
import { $ } from "bun";
import { checkGcloud, enableApis, ensureBucket, ensureFirebase } from "./lib/gcp.mjs";
import { change, main, ok, output, run, SetupError, step, succeeds } from "./lib/shell.mjs";
import { INFRA_ROOT, readTarget, SECRETS_PROVIDER, type StackTarget, usePassphraseDefault } from "./lib/target.mjs";

export { SetupError };

export const APP_ROOT = `${INFRA_ROOT}/..`;

export interface SetupOptions {
  readonly stack: string;
  readonly dryRun?: boolean;
}

/** APIs setup uses directly, plus the two Pulumi's GCP provider calls to enable the rest. */
export const SETUP_APIS = [
  "serviceusage.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "storage.googleapis.com",
  "firebase.googleapis.com",
];

const checkTools = async (): Promise<void> => {
  const hints: Record<string, string> = {
    gcloud: "https://cloud.google.com/sdk/docs/install",
    pulumi: "https://www.pulumi.com/docs/iac/download-install/",
  };
  const missing = Object.keys(hints).filter((tool) => !Bun.which(tool));
  if (missing.length > 0) {
    throw new SetupError(missing.map((tool) => `${tool} is not installed: ${hints[tool] ?? ""}`).join("\n"));
  }

  const pulumi = await run($`pulumi version`);
  if (pulumi.exitCode !== 0) {
    throw new SetupError(`pulumi is installed but does not run:\n${pulumi.stderr.toString().trim()}`);
  }
  ok(`pulumi ${pulumi.stdout.toString().trim()}`);
};

/**
 * Bills and rate-limits API calls to the target project for this run only: Google's client
 * libraries (the Firebase CLI) read GOOGLE_CLOUD_QUOTA_PROJECT, gcloud reads
 * CLOUDSDK_BILLING_QUOTA_PROJECT. Your gcloud credentials file is left as it is.
 */
const useQuotaProject = (project: string): void => {
  process.env["GOOGLE_CLOUD_QUOTA_PROJECT"] = project;
  process.env["CLOUDSDK_BILLING_QUOTA_PROJECT"] = project;
};

const install = async (label: string, cwd: string, dryRun: boolean): Promise<void> => {
  if (dryRun) {
    change(`run bun install in ${label}`, dryRun);
    return;
  }
  await output($`bun install --frozen-lockfile`.cwd(cwd));
  ok(`bun install in ${label}`);
};

const ensureStack = async (target: StackTarget, stateReady: boolean, dryRun: boolean): Promise<void> => {
  const override = process.env["PULUMI_BACKEND_URL"];
  if (override && override !== target.backendUrl) {
    throw new SetupError(
      `PULUMI_BACKEND_URL=${override} overrides backend.url (${target.backendUrl}) in Pulumi.yaml; unset it`,
    );
  }
  if (stateReady && (await succeeds($`pulumi stack select ${target.stack} --non-interactive`.cwd(INFRA_ROOT)))) {
    ok(`${target.stack} on ${target.backendUrl}`);
    return;
  }
  change(`create stack ${target.stack} on ${target.backendUrl}`, dryRun);
  if (!dryRun) {
    await output(
      $`pulumi stack init ${target.stack} --secrets-provider ${SECRETS_PROVIDER} --non-interactive`.cwd(INFRA_ROOT),
    );
  }
};

export const setup = async ({ stack, dryRun = false }: SetupOptions): Promise<StackTarget> => {
  usePassphraseDefault();
  const target = await readTarget(stack);
  useQuotaProject(target.project);
  console.info(
    `setup${dryRun ? " (dry run, no changes)" : ""}: stack ${stack}, project ${target.project}, region ${target.region}`,
  );
  step("1. tools");
  await checkTools();
  step("2. gcloud");
  await checkGcloud(target);
  step("3. APIs");
  await enableApis(target.project, SETUP_APIS, dryRun);
  step("4. state bucket");
  const bucketReady = await ensureBucket(target, dryRun);
  step("5. dependencies");
  await install("the app", APP_ROOT, dryRun);
  await install("infra/", INFRA_ROOT, dryRun);
  step("6. Pulumi stack");
  await ensureStack(target, bucketReady, dryRun);
  step("7. Firebase");
  await ensureFirebase(target.project, dryRun);
  console.info(`\nready${dryRun ? " (dry run)" : ""}\n`);
  return target;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  await main("setup", () =>
    setup({ stack: args.find((arg) => !arg.startsWith("-")) ?? "dev", dryRun: args.includes("--dry-run") }),
  );
}
