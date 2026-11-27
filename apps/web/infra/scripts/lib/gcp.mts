import { $ } from "bun";
import { change, firstLine, ok, output, run, SetupError } from "./shell.mjs";
import type { StackTarget } from "./target.mjs";

/** Checks gcloud and application-default credentials work and the project is reachable. */
export const checkGcloud = async ({ project }: StackTarget): Promise<void> => {
  const token = await run($`gcloud auth print-access-token`);
  if (token.exitCode !== 0) {
    throw new SetupError(`gcloud credentials are missing or expired: run \`gcloud auth login\`\n${firstLine(token)}`);
  }
  // Empty in CI, where gcloud authenticates with a credentials file rather than an account.
  const account = (await run($`gcloud config get-value account`)).stdout.toString().trim();
  ok(account ? `signed in as ${account}` : "gcloud credentials");

  const adc = await run($`gcloud auth application-default print-access-token`);
  if (adc.exitCode !== 0) {
    throw new SetupError(
      `application-default credentials, which Pulumi uses, are missing or expired: run \`gcloud auth application-default login\`\n${firstLine(adc)}`,
    );
  }
  ok("application-default credentials");

  const described = await run($`gcloud projects describe ${project} ${"--format=value(projectId)"}`);
  if (described.exitCode !== 0) {
    throw new SetupError(`cannot read project ${project}:\n${firstLine(described)}`);
  }
  ok(`project ${project}`);
};

export const enableApis = async (project: string, apis: readonly string[], dryRun: boolean): Promise<void> => {
  const enabled = new Set(
    (await output($`gcloud services list --enabled --project ${project} ${"--format=value(config.name)"}`)).split("\n"),
  );
  const missing = apis.filter((api) => !enabled.has(api));
  if (missing.length === 0) {
    ok(apis.join(", "));
    return;
  }
  change(`enable ${missing.join(", ")}`, dryRun);
  if (!dryRun) await output($`gcloud services enable ${missing} --project ${project}`);
};

interface BucketState {
  readonly versioning_enabled?: boolean;
  readonly public_access_prevention?: string;
  readonly uniform_bucket_level_access?: boolean;
}

/** Creates the state bucket or fixes its settings. Returns true when it exists afterwards. */
export const ensureBucket = async ({ project, region, bucket }: StackTarget, dryRun: boolean): Promise<boolean> => {
  const url = `gs://${bucket}`;
  const described = await run($`gcloud storage buckets describe ${url} --format=json`);

  if (described.exitCode !== 0) {
    const error = described.stderr.toString();
    if (!/404|not found|does not exist/i.test(error)) {
      throw new SetupError(
        `cannot read ${url}: ${error.trim()}\nBucket names are global; if someone else owns it, pick another in Pulumi.yaml`,
      );
    }
    change(`create ${url} in ${region} (versioned, uniform access, public access prevented)`, dryRun);
    if (!dryRun) {
      await output(
        $`gcloud storage buckets create ${url} --project ${project} --location ${region} --uniform-bucket-level-access --public-access-prevention`,
      );
      await output($`gcloud storage buckets update ${url} --versioning`);
    }
    return !dryRun;
  }

  const state = JSON.parse(described.stdout.toString()) as BucketState;
  const fixes: string[] = [];
  if (state.versioning_enabled !== true) fixes.push("--versioning");
  if (state.uniform_bucket_level_access !== true) fixes.push("--uniform-bucket-level-access");
  if (state.public_access_prevention !== "enforced") fixes.push("--public-access-prevention");
  if (fixes.length > 0) {
    change(`update ${url}: ${fixes.join(" ")}`, dryRun);
    if (!dryRun) await output($`gcloud storage buckets update ${url} ${fixes}`);
  } else {
    ok(`${url} (versioned, uniform access, public access prevented)`);
  }
  return true;
};

/** Calls the Firebase Management API with the application-default credentials Pulumi uses. */
const firebaseApi = async (project: string, path: string, init: RequestInit = {}): Promise<Response> => {
  const token = await run($`gcloud auth application-default print-access-token`);
  if (token.exitCode !== 0) {
    throw new SetupError(`application-default credentials do not work:\n${firstLine(token)}`);
  }
  return fetch(`https://firebase.googleapis.com/v1beta1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token.stdout.toString().trim()}`,
      "x-goog-user-project": project,
      "Content-Type": "application/json",
    },
  });
};

const apiError = async (response: Response): Promise<string> =>
  `HTTP ${String(response.status)}: ${(await response.text()).slice(0, 500)}`;

/**
 * Adds Firebase to the project unless it already has it. Firebase can't be removed from a
 * project, so this is a one-way setting of the project (like enabling an API), not part of
 * the stack: `bun run destroy` and a later deploy never try to add it twice.
 */
export const ensureFirebase = async (project: string, dryRun: boolean): Promise<void> => {
  const current = await firebaseApi(project, `projects/${project}`);
  if (current.status === 200) {
    ok(`Firebase is on ${project}`);
    return;
  }
  if (current.status !== 404) {
    throw new SetupError(`cannot check whether ${project} has Firebase: ${await apiError(current)}`);
  }
  change(`add Firebase to ${project} (this can't be undone)`, dryRun);
  if (dryRun) return;

  const added = await firebaseApi(project, `projects/${project}:addFirebase`, { method: "POST", body: "{}" });
  if (!added.ok) throw new SetupError(`cannot add Firebase to ${project}: ${await apiError(added)}`);
  let operation = (await added.json()) as { name: string; done?: boolean; error?: { message?: string } };
  for (let attempt = 0; !operation.done; attempt += 1) {
    if (attempt >= 60) throw new SetupError(`adding Firebase to ${project} is still running; run setup again later`);
    await Bun.sleep(3_000);
    const polled = await firebaseApi(project, operation.name);
    if (!polled.ok) throw new SetupError(`cannot follow ${operation.name}: ${await apiError(polled)}`);
    operation = (await polled.json()) as typeof operation;
  }
  if (operation.error) {
    throw new SetupError(`adding Firebase to ${project} failed: ${operation.error.message ?? "unknown error"}`);
  }
  ok(`added Firebase to ${project}`);
};
