// Deploys the app in the folder above to GCP:
//   src/network.ts   a VPC, a subnet for Cloud Run egress, and private services access
//   src/database.ts  Cloud SQL for PostgreSQL on a private IP, its user, and DATABASE_URL in Secret Manager
//   src/service.ts   the image in Artifact Registry, a migration job, and a public Cloud Run service
// State lives in the GCS bucket named in Pulumi.yaml (scripts/setup.mts creates it).
import { instance } from "./src/database";
import { network } from "./src/network";
import { imageRef, migrationJob, url } from "./src/service";

export { url, imageRef, migrationJob };
export const vpc = network.name;
export const databaseInstance = instance.connectionName;
export const databasePrivateIp = instance.privateIpAddress;
