// The IAM roles the CI/CD deployer service account needs to run `bun run deploy`
// (setup + pulumi up) and `bun run destroy`. scripts/provision-deployer.mts grants exactly
// these; keep the README's table in step with this file (`bun run provision-deployer --list`).

export interface RoleGrant {
  readonly role: string;
  readonly why: string;
}

/** Granted on the project. */
export const PROJECT_ROLES: readonly RoleGrant[] = [
  { role: "roles/browser", why: "read the project (setup's project check, provider lookups)" },
  { role: "roles/serviceusage.serviceUsageAdmin", why: "list and enable the APIs the stack uses" },
  { role: "roles/compute.networkAdmin", why: "VPC, subnet and the range reserved for private services access" },
  { role: "roles/servicenetworking.networksAdmin", why: "peer the VPC with Google services (Cloud SQL private IP)" },
  { role: "roles/cloudsql.admin", why: "Cloud SQL instance, database and user" },
  { role: "roles/secretmanager.admin", why: "the DATABASE_URL secret, its versions and who can read it" },
  { role: "roles/artifactregistry.admin", why: "the image repository, and pushing images to it" },
  { role: "roles/run.admin", why: "Cloud Run service and migrate job, executions, public access (invoker IAM check)" },
  { role: "roles/iam.serviceAccountAdmin", why: "create and delete the app's runtime service account" },
  { role: "roles/iam.serviceAccountUser", why: "deploy Cloud Run workloads that run as the runtime service account" },
  { role: "roles/logging.viewer", why: "read service and migrate job logs when a deploy fails" },
];

/** Granted on the Pulumi state bucket only. */
export const BUCKET_ROLES: readonly RoleGrant[] = [
  { role: "roles/storage.admin", why: "read and write Pulumi state; setup checks the bucket's settings" },
];
