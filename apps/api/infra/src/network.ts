import * as gcp from "@pulumi/gcp";
import { apis } from "./apis";
import { prefix, region, settings } from "./config";

// A dedicated VPC. Cloud Run reaches it through Direct VPC egress on `subnet`; Cloud SQL
// sits on a Google-managed range peered into it (private services access), with no public IP.

export const network = new gcp.compute.Network(
  "vpc",
  { name: `${prefix}-vpc`, autoCreateSubnetworks: false, routingMode: "REGIONAL" },
  { dependsOn: apis },
);

export const subnet = new gcp.compute.Subnetwork("subnet", {
  name: `${prefix}-${region}`,
  network: network.id,
  region,
  ipCidrRange: settings.subnetCidr,
  privateIpGoogleAccess: true,
});

const servicesRange = new gcp.compute.GlobalAddress("private-services-range", {
  name: `${prefix}-psa`,
  network: network.id,
  purpose: "VPC_PEERING",
  addressType: "INTERNAL",
  prefixLength: settings.servicesRangePrefixLength,
});

export const privateServicesConnection = new gcp.servicenetworking.Connection(
  "private-services",
  {
    network: network.id,
    service: "servicenetworking.googleapis.com",
    reservedPeeringRanges: [servicesRange.name],
    // Google keeps the peering until the Cloud SQL instance is fully gone; abandoning it on
    // destroy avoids a "producer services still using this connection" failure.
    deletionPolicy: "ABANDON",
  },
  { dependsOn: apis },
);
