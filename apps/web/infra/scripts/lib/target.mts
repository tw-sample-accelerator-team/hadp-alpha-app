import { SetupError } from "./shell.mjs";

export const INFRA_ROOT = `${import.meta.dir}/../..`;

/**
 * Stage one: secrets in Pulumi state are not protected. Stacks use the passphrase provider
 * with an empty passphrase, so nobody needs a key or a shared secret, but anyone who can read
 * the state bucket can read the values Pulumi marks secret (this app has none yet). Move to
 * Cloud KMS before the stack holds a secret.
 */
export const SECRETS_PROVIDER = "passphrase";

/** Sets the empty passphrase unless the environment already chose a passphrase. */
export const usePassphraseDefault = (): void => {
  if (
    process.env["PULUMI_CONFIG_PASSPHRASE"] === undefined &&
    process.env["PULUMI_CONFIG_PASSPHRASE_FILE"] === undefined
  ) {
    process.env["PULUMI_CONFIG_PASSPHRASE"] = "";
  }
};

export interface StackTarget {
  /** The Pulumi project name, which is the app name. */
  readonly name: string;
  readonly stack: string;
  readonly project: string;
  readonly region: string;
  readonly bucket: string;
  readonly backendUrl: string;
}

const readYaml = async (path: string): Promise<unknown> => {
  const file = Bun.file(path);
  if (!(await file.exists())) throw new SetupError(`${path} does not exist`);
  try {
    return Bun.YAML.parse(await file.text());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SetupError(`${path} is not valid YAML (${reason}); check its indentation and for duplicate keys`);
  }
};

/** Reads the app name, project, region and state bucket from Pulumi.yaml and Pulumi.<stack>.yaml. */
export const readTarget = async (stack: string): Promise<StackTarget> => {
  const pulumiProject = (await readYaml(`${INFRA_ROOT}/Pulumi.yaml`)) as {
    name?: string;
    backend?: { url?: string };
  };
  const name = pulumiProject.name ?? "app";
  const backendUrl = pulumiProject.backend?.url;
  if (!backendUrl?.startsWith("gs://")) {
    throw new SetupError(
      "set `backend.url: gs://<bucket>` in infra/Pulumi.yaml (see the README, Deploy to Firebase Hosting)",
    );
  }
  const bucket = backendUrl.slice("gs://".length).split("/")[0] ?? "";

  const stackFile = `${INFRA_ROOT}/Pulumi.${stack}.yaml`;
  if (!(await Bun.file(stackFile).exists())) {
    throw new SetupError(`infra/Pulumi.${stack}.yaml does not exist; copy Pulumi.dev.yaml to start a new stack`);
  }
  const config = ((await readYaml(stackFile)) as { config?: Record<string, unknown> }).config ?? {};
  const project = config["gcp:project"];
  const region = config["gcp:region"];
  if (typeof project !== "string" || project === "") {
    throw new SetupError(`set gcp:project in infra/Pulumi.${stack}.yaml`);
  }
  if (typeof region !== "string" || region === "") {
    throw new SetupError(`set gcp:region in infra/Pulumi.${stack}.yaml`);
  }

  return { name, stack, project, region, bucket, backendUrl };
};
