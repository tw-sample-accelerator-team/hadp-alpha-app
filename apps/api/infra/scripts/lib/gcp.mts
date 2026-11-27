import { $ } from "bun";
import { change, firstLine, ok, output, run, SetupError, warn } from "./shell.mjs";
import type { StackTarget } from "./target.mjs";

interface AdcFile {
  readonly type?: string;
  readonly client_email?: string;
  readonly service_account_impersonation_url?: string;
}

/**
 * Says who Pulumi acts as. Pulumi uses application-default credentials, not the gcloud login,
 * and they can differ: `gcloud auth application-default login --impersonate-service-account`
 * makes them a service account, and GOOGLE_IMPERSONATE_SERVICE_ACCOUNT then impersonates again.
 */
const describeAdc = async (): Promise<string> => {
  const path =
    process.env["GOOGLE_APPLICATION_CREDENTIALS"] ??
    `${process.env["HOME"] ?? ""}/.config/gcloud/application_default_credentials.json`;
  const file = Bun.file(path);
  const adc: AdcFile = (await file.exists()) ? ((await file.json()) as AdcFile) : {};
  const impersonated = /serviceAccounts\/([^:]+):generateAccessToken/.exec(adc.service_account_impersonation_url ?? "")?.[1];
  const base =
    impersonated !== undefined
      ? `impersonating ${impersonated}`
      : adc.type === "service_account"
        ? `service account ${adc.client_email ?? "?"}`
        : adc.type === "external_account"
          ? "workload identity federation"
          : (adc.type ?? "metadata server");
  const extra = process.env["GOOGLE_IMPERSONATE_SERVICE_ACCOUNT"];
  if (extra && impersonated && extra !== impersonated) {
    throw new SetupError(
      `application-default credentials already impersonate ${impersonated}, so Pulumi would have to go from it to ${extra} (GOOGLE_IMPERSONATE_SERVICE_ACCOUNT), which usually fails with iam.serviceAccounts.getAccessToken denied.
Run \`gcloud auth application-default login\` to reset them to your own account, or unset GOOGLE_IMPERSONATE_SERVICE_ACCOUNT.`,
    );
  }
  return extra ? `${base}, then Pulumi impersonates ${extra}` : base;
};

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
  ok(`application-default credentials: ${await describeAdc()}`);

  const described = await run($`gcloud projects describe ${project} ${"--format=value(projectId)"}`);
  if (described.exitCode !== 0) {
    throw new SetupError(`cannot read project ${project}:\n${firstLine(described)}`);
  }
  ok(`project ${project}`);

  const billing = await run($`gcloud billing projects describe ${project} ${"--format=value(billingEnabled)"}`);
  const enabled = billing.stdout.toString().trim().toLowerCase();
  if (billing.exitCode !== 0) {
    warn("could not check billing (needs billing.resourceAssociations.list); Cloud SQL needs billing enabled");
  } else if (enabled !== "true") {
    throw new SetupError(`billing is not enabled on ${project}; Cloud SQL and Cloud Run need it`);
  } else {
    ok("billing enabled");
  }
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
