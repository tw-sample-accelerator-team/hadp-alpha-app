import * as dockerBuild from "@pulumi/docker-build";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

// Deploys the app in the folder above to Cloud Run: an Artifact Registry repo for its
// image, the image built from the app's Dockerfile, a runtime service account with no
// roles, and a public Cloud Run service. `pulumi up --stack dev` prints its url.
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.require("region");
const name = pulumi.getProject();

const apis = ["run.googleapis.com", "artifactregistry.googleapis.com"].map(
  (service) => new gcp.projects.Service(service, { service, disableOnDestroy: false }),
);

const repository = new gcp.artifactregistry.Repository(
  "images",
  { repositoryId: name, location: region, format: "DOCKER" },
  { dependsOn: apis },
);

const registry = `${region}-docker.pkg.dev`;
const image = new dockerBuild.Image("image", {
  context: { location: ".." },
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

const runtime = new gcp.serviceaccount.Account("runtime", {
  accountId: `${name}-run`.slice(0, 30).replace(/-+$/, ""),
  displayName: `${name} on Cloud Run`,
});

const service = new gcp.cloudrunv2.Service(
  "service",
  {
    name,
    location: region,
    deletionProtection: false,
    ingress: "INGRESS_TRAFFIC_ALL",
    template: {
      serviceAccount: runtime.email,
      containers: [{ image: image.ref, ports: { containerPort: 8080 } }],
    },
  },
  { dependsOn: apis },
);

new gcp.cloudrunv2.ServiceIamMember("public", {
  name: service.name,
  location: region,
  role: "roles/run.invoker",
  member: "allUsers",
});

export const url = service.uri;
