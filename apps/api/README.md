# api

A backend service

Bun + TypeScript (strict), hexagonal (ports and adapters) structure, PostgreSQL through
Drizzle ORM, unit / integration / end-to-end tests, and Pulumi infrastructure that deploys
to Cloud Run and a private Cloud SQL on GCP.

- [Prerequisites](#prerequisites)
- [Run locally](#run-locally)
- [Test](#test)
- [Deploy to GCP](#deploy-to-gcp)
- [Project layout](#project-layout)
- [Scripts](#scripts)
- [Changing the schema](#changing-the-schema)

## Prerequisites

To run locally:

- [Bun](https://bun.sh) 1.3 or later
- Docker with the Compose plugin (`docker compose version` should work)

To deploy, also:

- The [gcloud CLI](https://cloud.google.com/sdk/docs/install), signed in to a GCP project you can create resources in
- The [Pulumi CLI](https://www.pulumi.com/docs/iac/download-install/)
- Docker with `buildx` (it builds the `linux/amd64` image, also on Apple Silicon)

## Run locally

```sh
# 1. Install dependencies
bun install

# 2. Create your local environment file
cp .env.example .env

# 3. Start Postgres in Docker: a dev database on :55432 and a test database on :55433
bun run db:up

# 4. Create the tables
bun run db:migrate

# 5. Start the service (restarts on file changes)
bun run dev
```

The service listens on http://localhost:3000. Try it:

```sh
curl http://localhost:3000/health
# {"status":"ok","checkedAt":"...","checks":{"database":true}}

curl -X POST http://localhost:3000/notes \
  -H 'content-type: application/json' \
  -d '{"title":"Groceries","body":"milk, eggs"}'

curl http://localhost:3000/notes
curl http://localhost:3000/notes/<id>
```

| Endpoint | Does |
| --- | --- |
| `GET /health` | `200` when the database answers, `503` when it doesn't |
| `POST /notes` | Creates a note from `{ "title": string, "body"?: string }`; `201` with the note |
| `GET /notes?limit=20&offset=0` | Lists notes, newest first (`limit` 1 to 100) |
| `GET /notes/:id` | One note; `404` when it doesn't exist |

Errors are JSON: `{ "error": { "code": "VALIDATION_FAILED", "message": "..." } }`.

To stop: `Ctrl+C` for the service, then `bun run db:down` for Postgres. The dev database
keeps its data in a Docker volume; `docker compose down -v` deletes it.

To run the production image locally instead of `bun run dev`:

```sh
docker build -t api .
docker run --rm -p 8080:8080 \
  -e DATABASE_URL=postgres://app:app@host.docker.internal:55432/api \
  api
```

## Test

```sh
bun run check              # typecheck + lint + unit tests (fast, no database)
bun run test               # unit, then integration, then e2e
```

| Suite | Folder | Needs |
| --- | --- | --- |
| Unit | `test/unit/` | nothing: domain, use cases, HTTP adapter and config with in-memory fakes |
| Integration | `test/integration/` | `bun run db:up`: the Drizzle adapters against the test database |
| End-to-end | `test/e2e/` | `bun run db:up`: starts `src/main.ts` as a process and calls it over HTTP |

Run one suite with `bun run test:unit`, `test:integration` or `test:e2e`; add a file name
or `-t "<test name>"` to narrow it down. `bun run test:coverage` reports unit coverage.

How the test database works: `bun test` loads `.env.test`, which points `DATABASE_URL` at
the `postgres-test` container (in memory, wiped when it restarts). The integration and e2e
suites migrate it once per run and empty every table before each test. They refuse to run
against a database whose name doesn't end in `_test`, so they can't wipe your dev data.
In CI (`.github/workflows/ci.yml`), a `DATABASE_URL` environment variable points them at
the job's Postgres service instead.

## Deploy to GCP

`infra/` is a Pulumi TypeScript program. One `bun run deploy` creates or updates:

```
VPC (custom mode)
├─ subnet                     Cloud Run sends traffic for private IPs through it (Direct VPC egress)
└─ private services access    a peered range for Google-managed services
   └─ Cloud SQL Postgres      private IP only, no public IP; reachable only from the VPC
Artifact Registry             the image built from ./Dockerfile
Cloud Run job (migrate)       runs `bun scripts/migrate.ts`; must succeed before the service updates
Cloud Run service             public HTTPS URL; a revision only takes traffic once /health is ok
```

Pulumi keeps its state in a GCS bucket (`gs://alpha-dev-80ca-pulumi-state`, set as `backend.url` in `infra/Pulumi.yaml`), so anyone with access to the bucket works on the same stack.

### 1. Sign in to GCP

```sh
gcloud auth login
gcloud auth application-default login     # the credentials Pulumi uses
```

### 2. Point the stack at your project

Already done by copier: `infra/Pulumi.dev.yaml` targets project `alpha-dev-80ca` in
`us-central1`, and `infra/Pulumi.yaml` stores state in `gs://alpha-dev-80ca-pulumi-state`.
Edit those two files to change them.

### 3. Deploy

```sh
cd infra
bun run preview            # optional: shows what will change
bun run deploy             # builds and pushes the image, migrates, rolls out
```

`preview`, `deploy` and `destroy` first run `scripts/setup.mts`, which gets everything Pulumi
needs in place. It's idempotent: the first run creates what's missing, later runs only check
(a few seconds). To run it on its own, `bun run setup`, or see what it would change with
`bun run setup --dry-run`.

| Step | Checks, and creates or fixes when needed |
| --- | --- |
| Tools | `gcloud`, `pulumi`, `docker` (daemon running) and `docker buildx` are installed |
| gcloud | you're signed in, application-default credentials work, the project is reachable, billing is on |
| APIs | Service Usage, Resource Manager and Cloud Storage are enabled (the stack enables the rest) |
| State bucket | the bucket from `Pulumi.yaml` exists, versioned, with uniform access and public access prevented |
| Dependencies | `bun install` in `infra/` |
| Stack | the stack exists on the bucket (created on first run) and is selected |

When a check fails, setup stops before Pulumi runs and says what to do, for example
`gcloud credentials are missing or expired: run gcloud auth login`.

Secrets in the stack's state are **not encrypted** for now; see
[Secrets in Pulumi state](#secrets-in-pulumi-state). The `bun run` scripts set the empty
passphrase this needs. To run `pulumi` directly, export it once in your shell:

```sh
export PULUMI_CONFIG_PASSPHRASE=""
```

The first deploy takes a while (often 10 to 15 minutes), most of it creating Cloud SQL. When it finishes,
it prints the service URL:

```sh
URL=$(pulumi stack output url --stack dev)
curl "$URL/health"
curl -X POST "$URL/notes" -H 'content-type: application/json' -d '{"title":"Hello from Cloud Run"}'
```

### Deploy a change

Run `bun run deploy` from `infra/` again. It rebuilds the image. When the image changed, it
runs the migrate job with the new image and waits for it to succeed, then rolls out a new
Cloud Run revision. If migrations fail, the service is not updated.

### Deploy from CI/CD

`.github/workflows/deploy.yml` deploys the dev stack after CI passes on `main` (or on demand
from the Actions tab, for any stack). It signs in to GCP as a dedicated **deployer service
account** through Workload Identity Federation, so there is no key file to leak or rotate.

A project admin sets this up once, with their own (Owner-level) credentials:

```sh
cd infra
bun run provision-deployer --github <owner>/<repo> --dry-run    # shows what it would do
bun run provision-deployer --github <owner>/<repo>
```

It's idempotent (re-run it to add another repository or repair grants), and it:

1. enables the APIs setup and federation need;
2. creates the state bucket, so the deployer only needs to use it, not create it;
3. creates the `api-deployer` service account;
4. grants it the roles below, and no others;
5. with `--github`, creates a workload identity pool and GitHub OIDC provider (limited to the
   repository's owner) and lets workflows in exactly that repository sign in as the deployer.

It ends by printing the two repository variables to set (`GCP_WORKLOAD_IDENTITY_PROVIDER` and
`GCP_DEPLOYER_SERVICE_ACCOUNT`) as `gh variable set` commands. They aren't secrets.

The admin needs Owner, or: Project IAM Admin, Service Account Admin, Service Usage Admin,
Storage Admin and, with `--github`, Workload Identity Pool Admin.

#### Roles the deployer gets

The list lives in `infra/scripts/lib/deployer-roles.mts`; `bun run provision-deployer --list`
prints it.

| Role | Granted on | Why |
| --- | --- | --- |
| `roles/browser` | project | read the project (setup's project check, provider lookups) |
| `roles/serviceusage.serviceUsageAdmin` | project | list and enable the APIs the stack uses |
| `roles/compute.networkAdmin` | project | VPC, subnet and the range reserved for private services access |
| `roles/servicenetworking.networksAdmin` | project | peer the VPC with Google services (Cloud SQL private IP) |
| `roles/cloudsql.admin` | project | Cloud SQL instance, database and user |
| `roles/secretmanager.admin` | project | the `DATABASE_URL` secret, its versions and who can read it |
| `roles/artifactregistry.admin` | project | the image repository, and pushing images to it |
| `roles/run.admin` | project | Cloud Run service and migrate job, executions, public access (invoker IAM check) |
| `roles/iam.serviceAccountAdmin` | project | create and delete the app's runtime service account |
| `roles/iam.serviceAccountUser` | project | deploy Cloud Run workloads that run as the runtime service account |
| `roles/logging.viewer` | project | read service and migrate job logs when a deploy fails |
| `roles/storage.admin` | state bucket only | read and write Pulumi state; setup checks the bucket's settings |
| `roles/iam.workloadIdentityUser` | the deployer itself, for the GitHub repository | GitHub Actions in that repository sign in as the deployer |

The deployer isn't granted permission to create buckets, so in CI, setup only
checks them. If you add resources to `infra/`, add the roles they need to
`deployer-roles.mts` and re-run `provision-deployer`.

To check the roles are enough before wiring up CI, an admin who also has Service Account
Token Creator on the deployer can deploy as it locally:

```sh
DEPLOYER=api-deployer@<project>.iam.gserviceaccount.com
CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT=$DEPLOYER \
GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=$DEPLOYER \
  bun run preview
```

The first variable makes gcloud (setup) act as the deployer, the second makes Pulumi's GCP
provider do so. The state bucket is still read with your own credentials.

### Other stack outputs and logs

```sh
pulumi stack output --stack dev            # url, image, migration job, VPC, Cloud SQL instance and private IP
gcloud run services logs read api-dev --region us-central1
gcloud run jobs executions list --job api-dev-migrate --region us-central1
```

### Settings

Change with `pulumi config set api:<key> <value> --stack dev`, then deploy:

| Key | Default | |
| --- | --- | --- |
| `databaseTier` | `db-f1-micro` | Cloud SQL machine type |
| `databaseVersion` | `POSTGRES_17` | |
| `publicAccess` | `true` | anyone can call the URL; `false` requires callers with `roles/run.invoker` |
| `minInstances` / `maxInstances` | `0` / `3` | Cloud Run scaling |
| `deletionProtection` | `true` | guards Cloud SQL and Cloud Run from destroy; the dev stack sets `false` |
| `subnetCidr` | `10.10.0.0/24` | subnet Cloud Run egresses through |
| `servicesRangePrefixLength` | `16` | size of the range peered for Cloud SQL |

For another environment, copy `Pulumi.dev.yaml` to `Pulumi.<stack>.yaml` and pass the stack:
`bun run deploy --stack <stack>` (or `preview`, `destroy`, `setup <stack>`). Any other Pulumi
command can go through setup too: `bun run pulumi -- refresh --stack <stack>`.

### Tear down

```sh
bun run destroy            # deletes everything the stack created
```

The state bucket stays. A destroyed Cloud SQL instance's name can't be reused for about a
week, so a stack recreated under the same service name fails until then.

Destroy usually stops at the subnet the first time, with `already being used by
.../addresses/serverless-ipv4-cloudrun-...`. Cloud Run releases the internal IPs it reserved
for Direct VPC egress an hour or two after the service and job are deleted. Nothing in the
subnet or VPC is billed; wait, then run `bun run destroy` again. If it then fails on the VPC
or `private-services-range` because of peering, run
`gcloud compute networks peerings delete servicenetworking-googleapis-com --network api-dev-vpc --project <project>`
and destroy once more. On a stack with `deletionProtection: true`, set it to `false` and deploy before destroying.

### Secrets in Pulumi state

Pulumi stores a few secret values in the stack's state: the generated Cloud SQL password, the
`DATABASE_URL` that contains it, and the short-lived token used to push the image. For this
first stage they are **not protected**. Stacks use Pulumi's passphrase provider with an empty
passphrase, so there's no key to manage or share, but anyone who can read the state bucket
can read those values. The bucket is private, with public access prevented; check who can read it with
`gcloud storage buckets get-iam-policy gs://<bucket>` (project-level roles count too). The app itself still reads the password from Secret Manager.

Before a stack holds real data, encrypt its secrets with Cloud KMS. Nothing in GCP is
recreated; Pulumi re-encrypts the stack's state:

```sh
gcloud kms keyrings create pulumi --location us-central1 --project <project>
gcloud kms keys create api-state --keyring pulumi --location us-central1 \
  --project <project> --purpose encryption
# Everyone who deploys (people and the deployer) needs roles/cloudkms.cryptoKeyEncrypterDecrypter
# on that key. Owner does not include it.
pulumi stack change-secrets-provider --stack dev \
  "gcpkms://projects/<project>/locations/us-central1/keyRings/pulumi/cryptoKeys/api-state"
```

Then set `SECRETS_PROVIDER` in `infra/scripts/lib/target.mts` to the same `gcpkms://` URL,
so new stacks start encrypted.

### Troubleshooting

- **The service URL answers 403**: `publicAccess` is `false`, or the deploy couldn't turn the
  invoker check off because your organisation enforces `run.managed.requireInvokerIam`. Call it
  with a token: `curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" "$URL/health"`.
  The service is public through Cloud Run's invoker check switch rather than an `allUsers`
  grant, so domain-restricted sharing (`iam.allowedPolicyMemberDomains`) doesn't block it.
- **`failed to get regions list ... Compute Engine API has not been used`** on a first deploy:
  a harmless warning; the stack enables the Compute API a moment later.
- **The new revision fails its startup probe**: `/health` returns 503 until Cloud SQL
  answers. Check the service logs above.
- **The migrate job fails**: `gcloud run jobs executions list ...` (above), then open the
  failed execution's logs in the console.
- **Setup says `PULUMI_BACKEND_URL` overrides `backend.url`**: that environment variable
  would point Pulumi at different state; unset it.

## Project layout

```
src/
  domain/                       entities, value objects, domain errors; imports nothing outside domain/
  application/
    ports/inbound/              what the outside world can ask the service to do
    ports/outbound/             what the service needs from the outside world
    use-cases/                  one file per use case; implements an inbound port, uses outbound ports
  adapters/
    inbound/http/               Bun.serve routes that call inbound ports and map errors to HTTP
    outbound/persistence/postgres/
                                Drizzle schema, client, migrator, repository and probe
    outbound/system/            clock and id generator
  config/env.ts                 typed, validated environment
  composition-root.ts           the only file that knows every layer: wires adapters to ports
  main.ts                       process entry point: loads config, starts the app, handles signals
drizzle/                        SQL migrations generated by drizzle-kit (commit them)
scripts/migrate.ts              applies migrations (bun run db:migrate, and the Cloud Run job)
test/
  unit/  integration/  e2e/     the three suites
  support/                      fakes, test-database helpers and the database preload
infra/
  index.ts                      stack outputs
  src/network.ts                VPC, subnet, private services access
  src/database.ts               Cloud SQL instance, database and user
  src/service.ts                image, migrate job, Cloud Run service
  scripts/setup.mts             prerequisites: tools, auth, APIs, state bucket, stack
  scripts/pulumi.mts            runs setup, then the given pulumi command
  scripts/provision-deployer.mts  admin, once: CI/CD deployer service account, its roles, GitHub federation
  scripts/lib/deployer-roles.mts  the deployer's roles
Dockerfile                      production image
docker-compose.yml              local Postgres for dev and tests
```

Dependencies point inward: `adapters -> application -> domain`. ESLint enforces it
(`no-restricted-imports` in `eslint.config.ts`): the domain and application layers can't
import adapters, Drizzle, the Postgres driver or Bun APIs.

The walking skeleton has two slices wired end to end: `GET /health` and the `notes`
resource. Copy the notes slice when adding a feature, then delete it.

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` / `bun start` | Run the service (with / without watch) |
| `bun run typecheck` | `tsc --noEmit` with the strict settings in `tsconfig.json` |
| `bun run lint` / `lint:fix` | Type-aware ESLint plus the layer boundary rules |
| `bun run check` | typecheck + lint + unit tests |
| `bun run test` | All three suites (`test:unit`, `test:integration`, `test:e2e`) |
| `bun run test:coverage` | Unit tests with coverage |
| `bun run db:up` / `db:down` | Start / stop the Postgres containers |
| `bun run db:generate` | Generate a migration from changes to `schema.ts` |
| `bun run db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `bun run db:studio` | Open Drizzle Studio |

In `infra/`: `bun run setup`, `preview`, `deploy`, `destroy`, `pulumi -- <command>`,
`provision-deployer` and `typecheck`.

## Changing the schema

1. Edit `src/adapters/outbound/persistence/postgres/schema.ts`.
2. `bun run db:generate --name <what-changed>` and review the SQL in `drizzle/`.
3. `bun run db:migrate` locally. Tests pick up new migrations on their own, and the next
   `bun run deploy` runs them in GCP before the new revision goes live.
