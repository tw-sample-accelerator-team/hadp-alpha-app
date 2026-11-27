import * as pulumi from "@pulumi/pulumi";

const gcp = new pulumi.Config("gcp");
const app = new pulumi.Config();

export const project = gcp.require("project");
export const region = gcp.require("region");
/** The Pulumi project name, which is the service name. */
export const name = pulumi.getProject();
export const stack = pulumi.getStack();

export const settings = {
  /** Primary range of the subnet Cloud Run egresses through (Direct VPC egress needs at least a /26). */
  subnetCidr: app.get("subnetCidr") ?? "10.10.0.0/24",
  /** Size of the range reserved for Google-managed services (Cloud SQL) via private services access. */
  servicesRangePrefixLength: app.getNumber("servicesRangePrefixLength") ?? 16,
  databaseTier: app.get("databaseTier") ?? "db-f1-micro",
  databaseVersion: app.get("databaseVersion") ?? "POSTGRES_17",
  /** Keep true for any stack holding real data; it guards Cloud SQL and Cloud Run from `pulumi destroy`. */
  deletionProtection: app.getBoolean("deletionProtection") ?? true,
  /**
   * Anyone can call the service without credentials. Uses Cloud Run's invoker IAM check
   * switch rather than an `allUsers` binding, so domain-restricted sharing doesn't block it.
   * Set false to require callers with roles/run.invoker.
   */
  publicAccess: app.getBoolean("publicAccess") ?? true,
  minInstances: app.getNumber("minInstances") ?? 0,
  maxInstances: app.getNumber("maxInstances") ?? 3,
};

/** Resource name prefix: `<service>-<stack>`, trimmed to fit GCP's shortest limits. */
export const prefix = `${name}-${stack}`;
export const shortName = (suffix: string, max = 30): string =>
  `${prefix}`.slice(0, max - suffix.length - 1).replace(/-+$/, "") + `-${suffix}`;
