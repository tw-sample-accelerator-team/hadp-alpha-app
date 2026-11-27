import * as gcp from "@pulumi/gcp";

const services = [
  "compute.googleapis.com",
  "servicenetworking.googleapis.com",
  "sqladmin.googleapis.com",
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "secretmanager.googleapis.com",
  "iam.googleapis.com",
];

/** Google APIs the stack needs. Left enabled on destroy: other workloads may use them. */
export const apis = services.map(
  (service) => new gcp.projects.Service(service, { service, disableOnDestroy: false }),
);
