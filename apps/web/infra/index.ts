import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import * as command from "@pulumi/command";
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

import { buildHostingConfig } from "./hosting-config";
import { defaultSiteId, siteIdProblem } from "./site-id";

// Deploys the built app in ../dist to Firebase Hosting on an existing GCP project: enables
// the Firebase APIs, creates a Hosting site for this app and stack, and releases ../dist to
// it with the Firebase CLI. (`bun run setup` adds Firebase to the project beforehand.) `bun run deploy` runs scripts/setup.mts, builds the app, then this.
// State lives in the GCS bucket named in Pulumi.yaml (scripts/setup.mts creates it).

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const config = new pulumi.Config();
const appName = pulumi.getProject();
const stack = pulumi.getStack();

/** The existing GCP project and region, from Pulumi.<stack>.yaml (`gcp:project`, `gcp:region`). */
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.require("region");

/** An explicit Hosting site id, when set with `bun run pulumi config set siteId <id>`. */
const configuredSiteId = config.get("siteId");
if (configuredSiteId !== undefined) {
  const problem = siteIdProblem(configuredSiteId);
  if (problem) {
    throw new Error(
      `Invalid Hosting site id "${configuredSiteId}": ${problem}. Set another with \`pulumi config set siteId <id>\`.`,
    );
  }
}

/** Optional: forward /api/** to a Cloud Run backend in the same project. */
const apiService = config.get("apiCloudRunService");
const apiRegion = config.get("apiCloudRunRegion") ?? region;

const distDir = resolve(__dirname, "..", "dist");
if (!existsSync(join(distDir, "index.html"))) {
  throw new Error(
    `No build found at ${distDir}. Run \`bun run build\` in the app folder (\`bun run deploy\` in infra/ does).`,
  );
}

// ---------------------------------------------------------------------------
// Firebase on the existing project
// ---------------------------------------------------------------------------

// Firebase APIs bill and quota against the project itself, not the caller's
// gcloud project, so user credentials work without extra setup.
const provider = new gcp.Provider("gcp", { project, billingProject: project, userProjectOverride: true });

const apis = ["serviceusage.googleapis.com", "firebase.googleapis.com", "firebasehosting.googleapis.com"].map(
  (service) => new gcp.projects.Service(service, { project, service, disableOnDestroy: false }, { provider }),
);

// Firebase itself is added to the project by `bun run setup`, not by this stack: it can't be
// removed from a project, so owning it here would break a destroy followed by a deploy.

/**
 * A random suffix for the default site id, created with the stack and kept in its state.
 * Firebase reserves a deleted site's id, so after `bun run destroy` the next deploy gets a new
 * suffix (and a new, free id), while ordinary deploys keep the same id and url.
 */
const siteSuffix = new random.RandomId("site-suffix", { byteLength: 3 });

const siteId: pulumi.Output<string> = configuredSiteId
  ? pulumi.output(configuredSiteId)
  : siteSuffix.hex.apply((suffix) => defaultSiteId(appName, stack, suffix));

const site = new gcp.firebase.HostingSite("site", { project, siteId }, { provider, dependsOn: apis });

// ---------------------------------------------------------------------------
// Release ../dist with the Firebase CLI
// ---------------------------------------------------------------------------

/** A hash of every file in dist, so a new build (and only a new build) triggers a release. */
const hashDirectory = (dir: string): string => {
  const hash = createHash("sha256");
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        hash.update(relative(dir, path)).update("\0").update(readFileSync(path));
      }
    }
  };
  walk(dir);
  return hash.digest("hex");
};

const buildHash = hashDirectory(distDir);

// The release runs from infra/.firebase/: firebase.json is written there and the build is
// copied to .firebase/public, because the Firebase CLI only deploys folders inside its project.
/** The created site's id (the provider reports it back; fall back to the requested one). */
const releasedSiteId = pulumi.all([site.siteId, siteId]).apply(([created, requested]) => created ?? requested);

const firebaseJson = releasedSiteId.apply((id) =>
  JSON.stringify(
    buildHostingConfig({
      siteId: id,
      publicDir: "public",
      api: apiService ? { serviceId: apiService, region: apiRegion } : undefined,
    }),
    null,
    2,
  ),
);

const release = new command.local.Command(
  "release",
  {
    dir: __dirname,
    interpreter: ["/bin/bash", "-c"],
    create: [
      "set -euo pipefail",
      'mkdir -p .firebase "$XDG_CONFIG_HOME"',
      "rm -rf .firebase/public",
      "cp -R ../dist .firebase/public",
      'printf "%s" "$FIREBASE_JSON" > .firebase/firebase.json',
      './node_modules/.bin/firebase deploy --only "hosting:$SITE_ID" --project "$PROJECT" ' +
        '--config .firebase/firebase.json --non-interactive --message "$MESSAGE"',
    ].join("\n"),
    environment: {
      FIREBASE_JSON: firebaseJson,
      SITE_ID: releasedSiteId,
      PROJECT: project,
      MESSAGE: `pulumi ${stack} build ${buildHash.slice(0, 12)}`,
      // An empty config folder for the Firebase CLI, so a cached `firebase login` (which it
      // prefers, and which may be expired or another person) is never used: the release runs
      // with the same application-default credentials as the rest of this program.
      XDG_CONFIG_HOME: join(__dirname, ".firebase", "config"),
    },
    // Release again when the build or the hosting rules change.
    triggers: [buildHash, firebaseJson],
  },
  { dependsOn: [site] },
);

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export const projectId = project;
export const hostingSiteId = releasedSiteId;
export const url = site.defaultUrl;
export const releasedBuild = release.id.apply(() => buildHash.slice(0, 12));
