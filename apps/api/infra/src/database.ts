import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import { apis } from "./apis";
import { name, prefix, region, settings } from "./config";
import { network, privateServicesConnection } from "./network";

// Cloud SQL for PostgreSQL on a private IP only. The connection string lives in Secret
// Manager; Cloud Run reads it as DATABASE_URL.

export const instance = new gcp.sql.DatabaseInstance(
  "postgres",
  {
    name: `${prefix}-pg`,
    region,
    databaseVersion: settings.databaseVersion,
    deletionProtection: settings.deletionProtection,
    settings: {
      // Shared-core tiers such as db-f1-micro exist only on the Enterprise edition.
      edition: "ENTERPRISE",
      tier: settings.databaseTier,
      availabilityType: "ZONAL",
      deletionProtectionEnabled: settings.deletionProtection,
      ipConfiguration: {
        ipv4Enabled: false,
        privateNetwork: network.id,
        sslMode: "ENCRYPTED_ONLY",
      },
      backupConfiguration: { enabled: true, pointInTimeRecoveryEnabled: true },
      insightsConfig: { queryInsightsEnabled: true },
    },
  },
  { dependsOn: [...apis, privateServicesConnection] },
);

const databaseName = name.replace(/-/g, "_");

const database = new gcp.sql.Database("database", { name: databaseName, instance: instance.name });

const password = new random.RandomPassword("database-password", { length: 32, special: false });

const user = new gcp.sql.User("database-user", {
  name: "app",
  instance: instance.name,
  password: password.result,
});

const databaseUrlSecret = new gcp.secretmanager.Secret(
  "database-url",
  { secretId: `${prefix}-database-url`, replication: { auto: {} } },
  { dependsOn: apis },
);

const databaseUrlVersion = new gcp.secretmanager.SecretVersion(
  "database-url",
  {
    secret: databaseUrlSecret.id,
    secretData: pulumi.secret(
      pulumi.interpolate`postgres://${user.name}:${password.result}@${instance.privateIpAddress}:5432/${database.name}?sslmode=require`,
    ),
  },
  { dependsOn: [database] },
);

export const databaseUrl = {
  secret: databaseUrlSecret,
  /** Pinned so a new connection string rolls out a new Cloud Run revision. */
  version: databaseUrlVersion.version,
};
