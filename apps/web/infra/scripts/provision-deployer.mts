// One-time, run by a project admin: creates the CI/CD deployer service account and grants
// it exactly the roles in lib/deployer-roles.mts, so a pipeline can run `bun run deploy`
// without Owner. It also creates the state bucket up front (the deployer can use it but
// not create it), and with --github lets that repository's GitHub Actions
// sign in as the deployer through Workload Identity Federation, with no key file.
// Idempotent: re-run it to add a repository or to repair missing grants.
//
//   bun run provision-deployer [stack] [--github <owner>/<repo>] [--dry-run]
//   bun run provision-deployer --list         # print the roles and exit
//
// The admin running it needs Owner, or: Project IAM Admin, Service Account Admin,
// Service Usage Admin, Storage Admin and (with --github) Workload
// Identity Pool Admin.
import { $ } from "bun";
import { BUCKET_ROLES, PROJECT_ROLES, type RoleGrant } from "./lib/deployer-roles.mjs";
import { checkGcloud, enableApis, ensureBucket } from "./lib/gcp.mjs";
import { change, main, ok, output, run, SetupError, type ShellPromise, step, succeeds, warn } from "./lib/shell.mjs";
import { readTarget, type StackTarget } from "./lib/target.mjs";
import { SETUP_APIS } from "./setup.mjs";

const POOL = "github";
const PROVIDER = "github";
const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

interface Policy {
  readonly bindings?: readonly { role: string; members?: readonly string[]; condition?: unknown }[];
}

const hasBinding = (policy: Policy, role: string, member: string): boolean =>
  (policy.bindings ?? []).some(
    (binding) => binding.role === role && !binding.condition && (binding.members ?? []).includes(member),
  );

/** Retries while a just-created service account is still propagating through IAM. */
const withPropagationRetry = async (command: () => ShellPromise): Promise<void> => {
  for (let attempt = 1; ; attempt += 1) {
    const result = await run(command());
    if (result.exitCode === 0) return;
    const error = result.stderr.toString();
    if (attempt >= 8 || !/does not exist|not found|invalid.*member/i.test(error)) {
      throw new SetupError(error.trim());
    }
    await Bun.sleep(5_000);
  }
};

interface GrantTarget {
  readonly label: string;
  /** False in a dry run when the resource doesn't exist yet: report the grants without reading a policy. */
  readonly exists: boolean;
  readonly policy: () => ShellPromise;
  readonly add: (role: string, member: string) => ShellPromise;
}

const grant = async (
  target: GrantTarget,
  roles: readonly RoleGrant[],
  member: string,
  dryRun: boolean,
): Promise<void> => {
  const policy: Policy = target.exists ? (JSON.parse(await output(target.policy())) as Policy) : {};
  for (const { role } of roles) {
    if (hasBinding(policy, role, member)) {
      ok(`${role} on ${target.label}`);
      continue;
    }
    change(`grant ${role} on ${target.label}`, dryRun);
    if (!dryRun) await withPropagationRetry(() => target.add(role, member));
  }
};

const deployerId = (name: string): string => `${name.slice(0, 30 - "-deployer".length).replace(/-+$/, "")}-deployer`;

const ensureServiceAccount = async (
  target: StackTarget,
  dryRun: boolean,
): Promise<{ email: string; exists: boolean }> => {
  const id = deployerId(target.name);
  const email = `${id}@${target.project}.iam.gserviceaccount.com`;
  if (await succeeds($`gcloud iam service-accounts describe ${email} --project ${target.project}`)) {
    ok(email);
    return { email, exists: true };
  }
  change(`create service account ${email}`, dryRun);
  if (!dryRun) {
    await output(
      $`gcloud iam service-accounts create ${id} --project ${target.project} --display-name ${`${target.name} CI/CD deployer`} --description ${"Runs `bun run deploy` for this app from CI/CD; see infra/scripts/provision-deployer.mts"}`,
    );
  }
  return { email, exists: !dryRun };
};

const ensureGithubFederation = async (
  { project }: StackTarget,
  repository: string,
  deployer: { email: string; exists: boolean },
  dryRun: boolean,
): Promise<string> => {
  const owner = repository.split("/")[0] ?? "";
  const projectNumber = await output($`gcloud projects describe ${project} ${"--format=value(projectNumber)"}`);
  const poolArgs = ["--project", project, "--location", "global"];

  if (await succeeds($`gcloud iam workload-identity-pools describe ${POOL} ${poolArgs}`)) {
    ok(`workload identity pool ${POOL}`);
  } else {
    change(`create workload identity pool ${POOL}`, dryRun);
    if (!dryRun) {
      await output($`gcloud iam workload-identity-pools create ${POOL} ${poolArgs} --display-name ${"GitHub Actions"}`);
    }
  }

  const provider = await run(
    $`gcloud iam workload-identity-pools providers describe ${PROVIDER} --workload-identity-pool ${POOL} ${poolArgs} --format=json`,
  );
  if (provider.exitCode === 0) {
    const condition =
      (JSON.parse(provider.stdout.toString()) as { attributeCondition?: string }).attributeCondition ?? "";
    if (condition.includes(`'${owner}'`)) {
      ok(`provider ${PROVIDER} (tokens from ${owner}'s repositories)`);
    } else {
      warn(`provider ${PROVIDER} exists with condition "${condition}", which may not admit ${owner}; check it`);
    }
  } else {
    change(`create OIDC provider ${PROVIDER} for ${GITHUB_ISSUER}, limited to ${owner}'s repositories`, dryRun);
    if (!dryRun) {
      await output(
        $`gcloud iam workload-identity-pools providers create-oidc ${PROVIDER} --workload-identity-pool ${POOL} ${poolArgs} --display-name ${"GitHub Actions"} --issuer-uri ${GITHUB_ISSUER} --attribute-mapping ${"google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner"} --attribute-condition ${`assertion.repository_owner == '${owner}'`}`,
      );
    }
  }

  // Only workflows in this exact repository may impersonate the deployer.
  const principal = `principalSet://iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${repository}`;
  await grant(
    {
      label: `${deployer.email} for ${repository}`,
      exists: deployer.exists,
      policy: () => $`gcloud iam service-accounts get-iam-policy ${deployer.email} --project ${project} --format=json`,
      add: (role, member) =>
        $`gcloud iam service-accounts add-iam-policy-binding ${deployer.email} --project ${project} --role ${role} --member ${member} --format=none`,
    },
    [{ role: "roles/iam.workloadIdentityUser", why: "GitHub Actions in the repository sign in as the deployer" }],
    principal,
    dryRun,
  );

  return `projects/${projectNumber}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}`;
};

const printRoles = (): void => {
  const table = (scope: string, roles: readonly RoleGrant[]): void => {
    for (const { role, why } of roles) console.info(`  ${role.padEnd(42)} ${scope.padEnd(14)} ${why}`);
  };
  console.info(`  ${"role".padEnd(42)} ${"granted on".padEnd(14)} why`);
  table("project", PROJECT_ROLES);
  table("state bucket", BUCKET_ROLES);
};

const provision = async (stack: string, repository: string | undefined, dryRun: boolean): Promise<void> => {
  const target = await readTarget(stack);
  console.info(
    `provision-deployer${dryRun ? " (dry run, no changes)" : ""}: ${target.name}, project ${target.project}, region ${target.region}`,
  );

  step("1. admin credentials");
  await checkGcloud(target);

  step("2. APIs");
  const apis = [...SETUP_APIS, "firebasehosting.googleapis.com", "iam.googleapis.com", "iamcredentials.googleapis.com"];
  if (repository) apis.push("sts.googleapis.com");
  await enableApis(target.project, apis, dryRun);

  step("3. state bucket");
  const bucketExists = await ensureBucket(target, dryRun);

  step("4. deployer service account");
  const deployer = await ensureServiceAccount(target, dryRun);
  const member = `serviceAccount:${deployer.email}`;

  step("5. roles");
  await grant(
    {
      label: "project",
      exists: true,
      policy: () => $`gcloud projects get-iam-policy ${target.project} --format=json`,
      add: (role, m) =>
        $`gcloud projects add-iam-policy-binding ${target.project} --member ${m} --role ${role} --condition=None --quiet --format=none`,
    },
    PROJECT_ROLES,
    member,
    dryRun,
  );
  await grant(
    {
      label: `gs://${target.bucket}`,
      exists: bucketExists,
      policy: () => $`gcloud storage buckets get-iam-policy ${`gs://${target.bucket}`} --format=json`,
      add: (role, m) =>
        $`gcloud storage buckets add-iam-policy-binding ${`gs://${target.bucket}`} --member ${m} --role ${role} --format=none`,
    },
    BUCKET_ROLES,
    member,
    dryRun,
  );
  let provider: string | undefined;
  if (repository) {
    step(`6. GitHub Actions federation for ${repository}`);
    provider = await ensureGithubFederation(target, repository, deployer, dryRun);
  }

  console.info(`\n${dryRun ? "dry run done" : "done"}: deployer ${deployer.email}`);
  if (provider && repository) {
    console.info(`
Set these as GitHub Actions variables on ${repository} (they are not secrets):
  gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo ${repository} --body ${provider}
  gh variable set GCP_DEPLOYER_SERVICE_ACCOUNT --repo ${repository} --body ${deployer.email}
.github/workflows/deploy.yml uses them.`);
  } else {
    console.info(`
Run with --github <owner>/<repo> to let GitHub Actions sign in as the deployer, or point
another CI system's workload identity at ${deployer.email}. Avoid service account keys.`);
  }
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    printRoles();
    process.exit(0);
  }
  const githubIndex = args.indexOf("--github");
  const repository = githubIndex >= 0 ? args[githubIndex + 1] : undefined;
  const positional = args.filter(
    (arg, index) => !arg.startsWith("-") && (githubIndex < 0 || index !== githubIndex + 1),
  );
  await main("provision-deployer", async () => {
    if (githubIndex >= 0 && !/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) {
      throw new SetupError("--github takes <owner>/<repo>, for example --github acme/web-app");
    }
    await provision(positional[0] ?? "dev", repository, args.includes("--dry-run"));
  });
}
