import * as dockerBuild from "@pulumi/docker-build";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { apis } from "./apis";
import { name, prefix, project, region, settings, shortName } from "./config";
import { databaseUrl } from "./database";
import { network, subnet } from "./network";

// The app image, a migration job that runs before each rollout, and the public Cloud Run
// service. Both workloads egress to the VPC for private ranges only, so Cloud SQL is
// reachable on its private IP while the internet stays on Cloud Run's own egress.

const repository = new gcp.artifactregistry.Repository(
  "images",
  { repositoryId: prefix, location: region, format: "DOCKER" },
  { dependsOn: apis },
);

const registry = `${region}-docker.pkg.dev`;
const image = new dockerBuild.Image("image", {
  context: { location: "../" },
  platforms: ["linux/amd64"],
  push: true,
  tags: [pulumi.interpolate`${registry}/${project}/${repository.repositoryId}/${name}:latest`],
  registries: [
    {
      address: registry,
      username: "oauth2accesstoken",
      password: gcp.organizations.getClientConfigOutput().accessToken,
    },
  ],
});

const runtime = new gcp.serviceaccount.Account(
  "runtime",
  { accountId: shortName("run"), displayName: `${name} (${pulumi.getStack()}) on Cloud Run` },
  { dependsOn: apis },
);

const secretAccess = new gcp.secretmanager.SecretIamMember("runtime-reads-database-url", {
  secretId: databaseUrl.secret.id,
  role: "roles/secretmanager.secretAccessor",
  member: pulumi.interpolate`serviceAccount:${runtime.email}`,
});

const vpcAccess = {
  egress: "PRIVATE_RANGES_ONLY",
  networkInterfaces: [{ network: network.id, subnetwork: subnet.id }],
};

const env = [
  { name: "NODE_ENV", value: "production" },
  {
    name: "DATABASE_URL",
    valueSource: { secretKeyRef: { secret: databaseUrl.secret.secretId, version: databaseUrl.version } },
  },
];

// Runs `bun scripts/migrate.ts` from the new image. Pulumi starts an execution whenever the
// image digest changes and waits for it to succeed before it updates the service.
const migrations = new gcp.cloudrunv2.Job(
  "migrate",
  {
    name: `${prefix}-migrate`,
    location: region,
    deletionProtection: false,
    runExecutionToken: image.digest.apply((digest) => digest.replace("sha256:", "").slice(0, 12)),
    template: {
      taskCount: 1,
      template: {
        serviceAccount: runtime.email,
        maxRetries: 1,
        timeout: "600s",
        vpcAccess,
        containers: [{ image: image.ref, commands: ["bun"], args: ["scripts/migrate.ts"], envs: env }],
      },
    },
  },
  { dependsOn: [...apis, secretAccess] },
);

const service = new gcp.cloudrunv2.Service(
  "service",
  {
    name: prefix,
    location: region,
    deletionProtection: settings.deletionProtection,
    ingress: "INGRESS_TRAFFIC_ALL",
    // Public for now (see `publicAccess` in config.ts). Organisations that enforce
    // run.managed.requireInvokerIam forbid this; set publicAccess to false there.
    invokerIamDisabled: settings.publicAccess,
    template: {
      serviceAccount: runtime.email,
      scaling: { minInstanceCount: settings.minInstances, maxInstanceCount: settings.maxInstances },
      vpcAccess,
      containers: [
        {
          image: image.ref,
          ports: { containerPort: 8080 },
          envs: env,
          resources: { limits: { cpu: "1", memory: "512Mi" }, cpuIdle: true, startupCpuBoost: true },
          // /health answers 503 until the database is reachable, so a revision that cannot
          // reach Cloud SQL never takes traffic.
          startupProbe: {
            httpGet: { path: "/health" },
            periodSeconds: 3,
            failureThreshold: 10,
            timeoutSeconds: 2,
          },
        },
      ],
    },
  },
  { dependsOn: [...apis, secretAccess, migrations] },
);

export const url = service.uri;
export const imageRef = image.ref;
export const migrationJob = migrations.name;
