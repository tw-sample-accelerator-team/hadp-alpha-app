// The IAM roles the CI/CD deployer service account needs to run `bun run deploy`
// (setup + build + pulumi up) and `bun run destroy`. scripts/provision-deployer.mts grants
// exactly these; keep the README's table in step with this file (`bun run provision-deployer --list`).

export interface RoleGrant {
  readonly role: string;
  readonly why: string;
}

/** Granted on the project. */
export const PROJECT_ROLES: readonly RoleGrant[] = [
  { role: "roles/browser", why: "read the project (setup's project check, provider lookups)" },
  { role: "roles/serviceusage.serviceUsageAdmin", why: "list and enable the APIs; bill API calls to the project" },
  { role: "roles/firebase.admin", why: "add Firebase to the project; Hosting sites, versions and releases" },
];

/** Granted on the Pulumi state bucket only. */
export const BUCKET_ROLES: readonly RoleGrant[] = [
  { role: "roles/storage.admin", why: "read and write Pulumi state; setup checks the bucket's settings" },
];
