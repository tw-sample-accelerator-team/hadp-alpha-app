# Deploy the web and api apps to GCP from GitHub Actions (OIDC)

This runbook covers how `.github/workflows/deploy.yml` builds, tests and deploys both apps
to GCP without a service account key, and every step it took to set up. It's also the
source for a reusable skill: steps are written as a procedure, the values that differ between
projects are marked as **parameters**, and the last section lists what to check when you
reuse it on another repository.

## 1. What gets deployed where

| App        | Source      | Built by                                   | Runs on                                          | Pulumi program   |
| ---------- | ----------- | ------------------------------------------ | ------------------------------------------------ | ---------------- |
| Backend    | `apps/api`  | Docker (`apps/api/Dockerfile`), via Pulumi | Cloud Run `api-<stack>`, Cloud SQL Postgres 17 on a private IP, own VPC | `apps/api/infra` |
| Frontend   | `apps/web`  | `tsc -b && vite build` → `dist/`           | Firebase Hosting site `web-<stack>-<random>`, `/api/**` forwarded to Cloud Run `api-<stack>` | `apps/web/infra` |

```
push to main ──► api-check ──► deploy-api ──┐
             └─► web-check ─────────────────┴─► deploy-web
                                (GitHub OIDC ─► WIF ─► per-app deployer SA)
```

- **Checks gate deploys.** `deploy-api` needs `api-check`; `deploy-web` needs `web-check`
  and the api deploy (because the web forwards `/api/**` to it). If only the web is deployed,
  `deploy-web` still runs when `deploy-api` was skipped.
- **Each deploy job signs in as its own app's service account** (least privilege): the web
  deployer can't touch Cloud SQL, and the api deployer can't touch Firebase.
- **The workflow doesn't define infrastructure.** It calls each app's
  `bun run deploy --stack <stack> --refresh` (`infra/scripts/pulumi.mts`: setup checks →
  build → `pulumi up`), so a local deploy and a CI deploy run the same code.
- **Every deploy is smoke-tested**: the api's `GET /health` (200 only when Cloud SQL
  answers) and the web's `GET /`.

### Triggers

| Trigger             | What runs                                                                           |
| ------------------- | ----------------------------------------------------------------------------------- |
| push to `main`      | Both apps to the `dev` stack, when `apps/**`, `package.json`, `bun.lock` or the workflow change |
| `workflow_dispatch` | Inputs: `stack` (default `dev`) and `apps` (`all` / `api` / `web`)                    |

`concurrency: deploy-<stack>` with `cancel-in-progress: false` stops two deploys from
updating the same stack at once, and never cancels a Pulumi update halfway through.

## 2. Parameters (what differs per project)

| Parameter                     | This repository                                                     | Where it's set                              |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| GitHub repository             | `tw-sample-accelerator-team/hadp-alpha-app`                         | `provision-deployer --github`               |
| GCP project id / number       | `alpha-dev-80ca` / `943952667438`                                   | `apps/*/infra/Pulumi.<stack>.yaml`          |
| Region                        | `us-central1`                                                       | `apps/*/infra/Pulumi.<stack>.yaml`          |
| Pulumi state bucket           | `gs://alpha-dev-80ca-pulumi-state` (shared by every app in the project) | `apps/*/infra/Pulumi.yaml` → `backend.url` |
| Stack                         | `dev`                                                               | `Pulumi.dev.yaml`, workflow input           |
| WIF pool / provider           | `github` / `github`                                                 | created by `provision-deployer`             |
| Deployer service accounts     | `api-deployer@…`, `web-deployer@…` (`<pulumi project name>-deployer`) | created by `provision-deployer`           |
| Cloud Run service the web forwards to | `api-dev` (`<api pulumi name>-<stack>`)                     | `web:apiCloudRunService` in `apps/web/infra/Pulumi.dev.yaml` |
| Tool versions                 | Bun 1.3.14, Node 22, Pulumi 3.278.0                                 | workflow `env`, `apps/web/.nvmrc`           |

## 3. Build requirements

### 3.1 Shared (repository root)

- The repository is a **bun workspace** (`package.json` → `workspaces: ["apps/*", "packages/*"]`)
  with one lockfile at the root, `bun.lock`. Install from the root with
  `bun install --frozen-lockfile`; it installs both apps. CI fails if the lockfile is out of date.
- **Bun 1.3.14** (`apps/web/package.json` → `packageManager`; `apps/api` needs `>=1.3.0`).
- `apps/*/infra` are **not** workspace members: each has its own `bun.lock` and its own
  `bun install --frozen-lockfile` (setup runs it before every deploy).

### 3.2 Frontend: `apps/web`

| Requirement           | Detail                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Runtimes              | Bun 1.3.14 (installs, runs scripts) **and Node.js ≥ 22.12** (`.nvmrc`: 22). tsc, Vite, Vitest, Playwright, Pulumi and the Firebase CLI run on Node. |
| Build                 | `bun run build` = `tsc -b && vite build` → `apps/web/dist/` (`index.html` + fingerprinted `assets/`) |
| Build-time env        | `apps/web/.env` (committed, non-secret): `VITE_APP_TITLE`, `VITE_API_BASE_PATH=/api`. Every `VITE_*` value is bundled into the client: never put a secret in one. Validated in `src/shared/config/env.ts`. |
| Checks (CI gate)      | `typecheck`, `lint` (0 warnings), `format:check`, `knip`, `test` (Vitest unit + integration with an 80% coverage gate), `build`, then `infra` typecheck |
| Not in the gate       | `test:e2e` (Playwright): needs `bunx playwright install --with-deps`; run it separately |
| Deploy tools          | `gcloud`, `pulumi`. The Firebase CLI comes from `apps/web/infra` devDependencies; no `firebase login` is used (it runs on application-default credentials). |
| Container (optional)  | `apps/web/Dockerfile`: Node 22 build stage + `nginx-unprivileged` on port 8080 (`nginx.conf`). The Firebase deploy doesn't use it; it's there to run the SPA on Cloud Run or locally. |

### 3.3 Backend: `apps/api`

| Requirement           | Detail                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Runtime               | Bun ≥ 1.3 runs the TypeScript directly: **no build step**. `bun run typecheck` (tsc) is the compile check. |
| Checks (CI gate)      | `typecheck`, `lint`, `test:unit`, `test:integration`, `test:e2e`, then `infra` typecheck |
| Test database         | Integration and e2e tests need **Postgres 17**. CI uses a `postgres:17-alpine` service container and sets `DATABASE_URL=postgres://app:app@localhost:5432/api_test`, which overrides `.env.test` (that file points at docker-compose's port 55433, for `bun run db:up` locally). Migrations run automatically in the test preload. |
| Image                 | `apps/api/Dockerfile`: `oven/bun:1.3.14-alpine` pinned by digest, production-only deps, runs as user `bun`, port 8080. `.dockerignore` is an **allow list** (`package.json`, `bun.lock`, `tsconfig.json`, `src/`, `scripts/`, `drizzle/`), so env files and credentials never reach the build context. The image uses `apps/api/bun.lock`, not the root lockfile. |
| Deploy tools          | `gcloud`, `pulumi`, **Docker with buildx** (Pulumi's docker-build provider builds `linux/amd64` and pushes to Artifact Registry), Node 22 for Pulumi's nodejs runtime |
| Runtime config        | `DATABASE_URL` comes from Secret Manager (`api-<stack>-database-url`), written by Pulumi. Health: `GET /health` → 200 when the database answers, 503 otherwise. Cloud Run's startup probe uses it. |
| Migrations            | Cloud Run job `api-<stack>-migrate` (`bun scripts/migrate.ts`) runs whenever the image digest changes, before the service is updated. If migrations fail, the service isn't updated. |

### 3.4 Running the checks locally

```sh
bun install --frozen-lockfile                       # from the repo root

cd apps/web
bun run typecheck && bun run lint && bun run format:check && bun run knip && bun run test && bun run build

cd ../api
bun run db:up                                       # docker compose; needs `docker compose` (or run a postgres:17 container
                                                    # yourself and export DATABASE_URL to point at it)
bun run typecheck && bun run lint && bun run test:unit && bun run test:integration && bun run test:e2e
```

## 4. Pre-flight: inspect the repository and project before changing anything

Run these first. The answers decide the parameters in section 2 and catch clashes early.

| Check | Command | Why |
| ----- | ------- | --- |
| Which templates generated the apps | `cat apps/*/.copier-answers.yml` (`_src_path`, `gcp_project`, `pulumi_state_bucket`) | Confirms the recipe fits (section 12); blank project or bucket values mean you must set them |
| Uncommitted work in the checkout | `git status` | Don't sweep someone's work into your commits by accident; commit it separately, or ask |
| Workflows the templates left in the apps | `find apps -path '*/.github/workflows/*'` | They never run (section 10); the root workflow replaces them |
| Remote and GitHub access | `git remote -v`, `gh auth status` (needs the `workflow` scope to push workflow files), `gh variable list -R <repo>` | Finds the `<owner>/<repo>`; shows variables already set |
| Target project | `gcloud config list`, `gcloud projects describe <project>` (note `projectNumber`) | The project number goes into the WIF provider path |
| Your access | `gcloud projects get-iam-policy <project> --flatten=bindings --filter="bindings.members:<you>" --format='value(bindings.role)'` | `provision-deployer` needs Owner (or the roles in 6.1) |
| Billing | `gcloud billing projects describe <project>` | Cloud SQL and Cloud Run need it |
| Existing CI identity | `gcloud iam workload-identity-pools list --location global --project <project>`, `gcloud iam service-accounts list --project <project>` | Reuse a `github` pool if there is one (`provision-deployer` does); see other apps' deployers |
| State bucket and stack names | `gcloud storage ls -r gs://<bucket>/.pulumi/stacks/` | Another app with the same Pulumi project name and stack would share state |
| Firebase on the project | `gcloud projects describe <project> --format='value(labels.firebase)'` (`enabled`) | Web setup adds Firebase if it's missing, and that can't be undone: confirm with the project owner first |
| Local tools | `bun`, `node` ≥ 22.12, `pulumi`, `gcloud`, `docker` with buildx, and `docker compose` or `docker-compose` | To run the checks and the one-time setup locally |

Then run every app's checks locally (section 3.4). If they fail, fix the code before touching CI.

## 5. Decisions the setup has to make

| Decision | Choice here | When to choose differently |
| -------- | ----------- | -------------------------- |
| One deployer service account, or one per app | **One per app** (least privilege; `vars.GCP_<APP>_DEPLOYER_SERVICE_ACCOUNT`) | One shared account only when the apps are always deployed together and share one owner |
| Who may sign in | Any workflow in this **repository** (`attribute.repository`) | For prod, also limit to `main` or a GitHub environment: add `attribute.ref` to the mapping and bind `principalSet://…/attribute.ref/refs/heads/main`, or check `assertion.environment` in the attribute condition |
| Frontend calls the backend through Hosting (`/api/**` rewrite) | **Yes**, so `deploy-web` runs after `deploy-api` | No rewrite (the SPA calls the api's own URL): drop `apiCloudRunService` and the `needs: deploy-api` |
| Checks in the deploy workflow, or a separate CI workflow | **In the deploy workflow**, as gates | With an existing CI workflow, trigger the deploy with `workflow_run` on CI success instead, as the template's `apps/*/.github/workflows/deploy.yml` does |
| Stacks | `dev` only, deployed on every push to `main` | Add `Pulumi.prod.yaml` per app and deploy prod only by `workflow_dispatch` with a protected GitHub environment |
| What triggers a deploy | Push to `main` touching `apps/**`, root `package.json` or `bun.lock`, or the workflow | Narrow it to per-app paths if the apps release separately (split into two workflows) |

## 6. One-time setup (GCP project admin)

Run these once per project and repository. The scripts are idempotent: re-running them only
checks, or repairs what's missing.

### 6.1 Prerequisites

- An existing GCP project with **billing enabled** (Cloud SQL and Cloud Run need it).
- The admin is **Owner**, or has Project IAM Admin, Service Account Admin, Service Usage
  Admin, Storage Admin and Workload Identity Pool Admin.
- Locally: `gcloud`, `pulumi`, `bun`, Docker. Sign in with both:
  ```sh
  gcloud auth login
  gcloud auth application-default login   # Pulumi uses these, not the gcloud login
  ```

### 6.2 Point the Pulumi stacks at the project

In `apps/api/infra` and `apps/web/infra`:

- `Pulumi.yaml`: set `backend: { url: gs://<project>-pulumi-state }` (one bucket for all apps;
  stacks are scoped by Pulumi project name, so `api/dev` and `web/dev` don't collide).
- `Pulumi.dev.yaml`: set `gcp:project: <project>` (and `gcp:region`).
- `apps/web/infra/Pulumi.dev.yaml`: `web:apiCloudRunService: api-dev`, so Firebase Hosting
  forwards `/api/**` to the api.

Before picking stack names, check the bucket isn't already holding a stack of the same name:
`gcloud storage ls -r gs://<bucket>/.pulumi/stacks/`.

### 6.3 Create the deployers and GitHub OIDC trust

```sh
cd apps/api/infra
bun run provision-deployer dev --github <owner>/<repo> --dry-run   # review first
bun run provision-deployer dev --github <owner>/<repo>
cd ../../web/infra
bun run provision-deployer dev --github <owner>/<repo>
```

For each app, this:

1. enables Service Usage, Resource Manager, Storage, IAM, IAM Credentials and STS APIs;
2. creates the state bucket if it doesn't exist (versioned, uniform access, public access prevented);
3. creates `<app>-deployer@<project>.iam.gserviceaccount.com`;
4. grants it exactly the roles in `infra/scripts/lib/deployer-roles.mts` (list them with `bun run provision-deployer --list`);
5. creates (first app only) the workload identity pool `github` and the OIDC provider `github`:
   issuer `https://token.actions.githubusercontent.com`, attribute mapping
   `google.subject=assertion.sub, attribute.repository=assertion.repository, attribute.repository_owner=assertion.repository_owner`,
   attribute condition `assertion.repository_owner == '<owner>'`;
6. grants `roles/iam.workloadIdentityUser` on the deployer to
   `principalSet://iam.googleapis.com/projects/<number>/locations/global/workloadIdentityPools/github/attribute.repository/<owner>/<repo>`,
   so only workflows in that one repository can sign in as it.

The equivalent `gcloud` commands, for a project without these scripts:

```sh
gcloud iam workload-identity-pools create github --project=$PROJECT --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc github --project=$PROJECT --location=global \
  --workload-identity-pool=github --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '$OWNER'"
gcloud iam service-accounts create $APP-deployer --project=$PROJECT
# ...grant the app's roles to serviceAccount:$APP-deployer@$PROJECT.iam.gserviceaccount.com...
gcloud iam service-accounts add-iam-policy-binding $APP-deployer@$PROJECT.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$OWNER/$REPO"
```

Then make one grant that `provision-deployer` doesn't make. The web's setup bills API calls to
the project (it sets `CLOUDSDK_BILLING_QUOTA_PROJECT` and `GOOGLE_CLOUD_QUOTA_PROJECT`), so
the federated GitHub identity's token exchange (before it becomes the deployer) is billed to
the project too, and that identity needs `serviceusage.services.use` there. Without it,
`deploy-web` fails in setup with `USER_PROJECT_DENIED ... roles/serviceusage.serviceUsageConsumer`.

```sh
gcloud projects add-iam-policy-binding $PROJECT --condition=None \
  --role=roles/serviceusage.serviceUsageConsumer \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$OWNER/$REPO"
```

The role only lets the identity use APIs within the permissions it already has: it grants
no access to resources.

Deployer roles:

| Deployer       | Project roles                                                                                       | Bucket role          |
| -------------- | --------------------------------------------------------------------------------------------------- | -------------------- |
| `api-deployer` | browser, serviceusage.serviceUsageAdmin, compute.networkAdmin, servicenetworking.networksAdmin, cloudsql.admin, secretmanager.admin, artifactregistry.admin, run.admin, iam.serviceAccountAdmin, iam.serviceAccountUser, logging.viewer | storage.admin (state bucket) |
| `web-deployer` | browser, serviceusage.serviceUsageAdmin, firebase.admin                                             | storage.admin (state bucket) |

### 6.4 Set the GitHub repository variables

They're identifiers, not secrets, so they're **variables** (`vars.*`), not secrets:

```sh
R=<owner>/<repo>
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER   -R $R --body projects/<number>/locations/global/workloadIdentityPools/github/providers/github
gh variable set GCP_API_DEPLOYER_SERVICE_ACCOUNT -R $R --body api-deployer@<project>.iam.gserviceaccount.com
gh variable set GCP_WEB_DEPLOYER_SERVICE_ACCOUNT -R $R --body web-deployer@<project>.iam.gserviceaccount.com
```

`provision-deployer` prints `GCP_DEPLOYER_SERVICE_ACCOUNT`, a single name meant for a
one-app repository. In a monorepo with two deployers, use the two per-app names above,
which the workflow reads.

### 6.5 Create the stacks and commit their salt

```sh
(cd apps/api/infra && bun run setup dev)
(cd apps/web/infra && bun run setup dev)
git add apps/*/infra/Pulumi.dev.yaml && git commit -m "chore(infra): ..."
```

`setup` creates the stack on the bucket and writes `encryptionsalt:` into
`Pulumi.dev.yaml`. Commit it **before** the first CI deploy: a stack created inside CI
writes the salt to the runner's checkout, and it's lost when the job ends.

## 7. How the workflow authenticates

```yaml
permissions:
  contents: read
  id-token: write          # only on the deploy jobs
...
- uses: google-github-actions/auth@v3
  with:
    workload_identity_provider: ${{ vars.GCP_WORKLOAD_IDENTITY_PROVIDER }}
    service_account: ${{ vars.GCP_API_DEPLOYER_SERVICE_ACCOUNT }}
- uses: google-github-actions/setup-gcloud@v3
```

1. `id-token: write` lets the job request a GitHub OIDC token (`aud` = the provider).
2. `auth` exchanges it at Google STS. The provider admits it only when
   `repository_owner == <owner>`.
3. STS impersonates the deployer, which the pool's `attribute.repository/<owner>/<repo>`
   principal set is allowed to do. That gives a one-hour access token.
4. `auth` writes an `external_account` credentials file and sets
   `GOOGLE_APPLICATION_CREDENTIALS`. gcloud, Pulumi, the docker-build registry login and
   the Firebase CLI all pick that up. Nothing long-lived is stored in GitHub.

`id-token: write` is granted only to the two deploy jobs; the check jobs can't get a GCP token.

## 8. Testing the workflow before it reaches `main`

`workflow_dispatch` only works once the workflow file is on the default branch, so for the
first run:

1. Add the feature branch to `on.push.branches` in a separate commit marked `TEMP`.
2. Push. The workflow runs from the branch (the WIF trust is per repository, not per branch,
   so it can sign in).
3. Watch it: `gh run watch <id> --exit-status`, then `gh run view <id> --log-failed` if it fails.
   After fixing something outside the repository (an IAM grant, a deleted resource), re-run
   only the failed jobs with `gh run rerun <id> --failed` instead of pushing again.
4. Check the results (section 9), then remove the `TEMP` branch from the trigger. Do that in
   the same push as your last change: the commit that removes the branch doesn't trigger a run.

How long to expect:

| Stage                          | First deploy                              | Later deploys |
| ------------------------------ | ----------------------------------------- | ------------- |
| api-check / web-check          | ~40 s / ~1–1.5 min                         | same          |
| deploy-api                     | ~20 min (Cloud SQL alone takes ~15–17 min) | ~1–2 min      |
| deploy-web                     | ~1–2 min                                   | ~1 min        |

**IAM changes take time to apply.** A grant can take 2–7 minutes before a run sees it. If a run
still fails with the same permission error right after a grant, wait about 4 minutes and
`gh run rerun --failed`; don't change anything else yet.

## 9. Checking a deploy

The workflow smoke-tests both apps: `GET <api url>/health` must return 2xx, and
`GET <web url>/` must serve the SPA's `index.html`. By hand:

```sh
(cd apps/api/infra && pulumi stack output url --stack dev)   # Cloud Run URL
(cd apps/web/infra && pulumi stack output url --stack dev)   # https://web-dev-xxxxxx.web.app
curl -s "$API_URL/health"            # {"status":"ok",...}
curl -sI "$WEB_URL/"                 # 200, security headers
gcloud run jobs executions list --job api-dev-migrate --region us-central1 --project alpha-dev-80ca
```

Each job's GitHub environment (`dev`) shows the deployed URL.

## 10. Gotchas found while setting this up

- **Nested workflows don't run.** The app templates come with `apps/*/.github/workflows/*.yml`;
  GitHub reads only `.github/workflows/` at the repository root. A monorepo needs one root
  workflow; `working-directory:` points each job at its app.
- **`bun install` must run at the workspace root** in a monorepo: the frozen lockfile is
  the root `bun.lock`.
- **Infra folders have their own lockfiles** and aren't workspace members; each needs its own install.
- **The api's test DB URL**: `.env.test` points at docker-compose's port; in CI, set
  `DATABASE_URL` as a job environment variable (environment variables win over `.env.test`).
- **Docker Compose v1 vs v2**: `bun run db:up` calls `docker compose`; machines with only
  the standalone `docker-compose` need it run by hand, or a plain `docker run postgres:17-alpine`
  with `DATABASE_URL` exported.
- **Encryption salt**: commit `Pulumi.<stack>.yaml` after `setup`, before the first CI run (section 6.5).
- **`PULUMI_CONFIG_PASSPHRASE: ""`** must be set for `pulumi stack output` in CI; the
  `bun run` scripts set it for themselves, but direct `pulumi` calls don't get it.
- **`environment:` can't read `env.*`**: use `${{ inputs.stack || 'dev' }}` there.
- **The web's `/health` page calls `GET /api/health`**, but the api serves `GET /health`.
  Firebase forwards the path unchanged, so through Hosting that page shows "Could not reach
  the backend" until the api serves its routes under `/api` (or the rewrite strips it, which
  Firebase Hosting can't do). The smoke test checks the api at its Cloud Run URL directly.
- **A failed first create can stick.** On the first run, the Cloud Run service failed its
  startup probe once (the VPC, subnet and peering had been created seconds earlier; the
  same image and config started fine minutes later). Pulumi still saved the service in
  state, so the next `pulumi up` reported "unchanged" and left the broken revision with no
  URL. The workflow now deploys with `--refresh` (Pulumi re-reads the cloud first), and
  the outputs step fails at once when `url` is empty. To recover by hand: delete the broken
  resource (`gcloud run services delete api-dev --region us-central1`) and deploy again.
- **Diagnosing a startup probe failure**: read the revision's stdout and stderr, and the
  migrate job's:
  `gcloud logging read 'resource.labels.service_name="api-dev"' --freshness 1h`. If the
  image is in doubt, run it locally against a `postgres:17-alpine` container
  (`docker run -e PORT=8080 -e DATABASE_URL=… -p 58080:8080 <image>`, then `curl :58080/health`).
- **How the probe failure was narrowed down** (reuse the order): (1) the image ran locally
  against Postgres and answered `/health` with 200, so the image was fine; (2) the migrate
  job, from the same image, had logged `migrations applied`, so the secret and the database
  were fine; (3) the service had logged nothing, not even `api listening`. Throwaway services
  showed the sandbox wasn't the cause (gen1 and gen2 both started), and a copy with the exact
  VPC, secret and probe settings started and passed `/health`. So the config was right, and a
  plain re-deploy (with `--refresh`) fixed it. Delete throwaway services afterwards.
- **Pulumi rewrites stack config** when it writes the salt: `api:deletionProtection: false`
  becomes `"false"`. That's harmless: `config.getBoolean` parses the string.
- **`index.html` is cached for an hour at `/`.** Firebase's `no-cache` rule in
  `apps/web/infra/hosting-config.ts` matches `/index.html`, but a request for `/` (or a deep
  link rewritten to `index.html`) gets the default `max-age=3600`, so a new release can take
  up to an hour to reach a returning visitor. This came with the template; fix it by giving
  `**` the `no-cache` header and keeping `/assets/**` immutable.
- **Action majors**: `actions/checkout@v4`, `cache@v4` and `setup-node@v4` target Node 20,
  which GitHub has deprecated. The workflow uses checkout v7, cache v6, setup-node v7,
  google-github-actions/auth v3 and setup-gcloud v3, and setup-buildx v4.
- **The deploy is not cheap to tear down**: the api stack creates a Cloud SQL instance (billed
  hourly). `cd apps/api/infra && bun run destroy` removes it; `api:deletionProtection: false`
  allows that on `dev` only.

### Cleaning up

| What | Command |
| ---- | ------- |
| The api stack (Cloud SQL, VPC, Cloud Run, image repository, secret) | `cd apps/api/infra && bun run destroy` |
| The web stack (Hosting site and its releases) | `cd apps/web/infra && bun run destroy` (Firebase stays on the project) |
| The CI identity | `gcloud iam service-accounts delete <app>-deployer@<project>.iam.gserviceaccount.com`; remove the `serviceUsageConsumer` binding; `gcloud iam workload-identity-pools delete github --location global` if nothing else uses it |
| GitHub | `gh variable delete GCP_WORKLOAD_IDENTITY_PROVIDER` (and the two deployer variables); the `dev` environment, under Settings → Environments |

Two things went wrong on the first local teardown:

- **Check who Pulumi runs as locally.** Application-default credentials can be set to
  impersonate a service account (`gcloud auth application-default login
  --impersonate-service-account=…`), which is easy to leave behind from work on another app. Here
  they impersonated `demo-portal-deployer`, so `bun run destroy` for the api ran as that account
  and failed with `secretmanager.versions.destroy denied`. Setup prints the identity
  (`application-default credentials: impersonating …`). Check it with
  `python3 -c "import json,os;print(json.load(open(os.path.expanduser('~/.config/gcloud/application_default_credentials.json'))).get('type'))"`.
  To run once as your own gcloud account without touching that file:
  `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token) bun run destroy --stack dev --yes`
  (the token lasts an hour).
- **The api's subnet can't be deleted straight away.** Cloud Run's Direct VPC egress reserves
  an IP in the subnet (`serverless-ipv4-cloudrun-…`, purpose `SERVERLESS`). Google releases it
  on its own, usually 1–2 hours after the service is deleted, and it can't be deleted by hand.
  Until then the destroy fails at `Subnetwork subnet` with `already being used by`, and stops
  before the VPC, image repository, secret and runtime account. Cloud SQL, the costly part, is
  already gone by then. Wait until
  `gcloud compute addresses list --filter='subnetwork~<app>-<stack>'` is empty, then run the
  destroy again.

## 11. Test results (first setup, 2026-11-27)

| Run | Result | What it showed |
| --- | ------ | -------------- |
| [46043962151](https://github.com/tw-sample-accelerator-team/hadp-alpha-app/actions/runs/46043962151) | checks ✓, api deploy ✗ | OIDC sign-in, image build and push, VPC, Cloud SQL (~17 min to create) and migrations all worked; the Cloud Run service's first revision failed its startup probe |
| [46047136602](https://github.com/tw-sample-accelerator-team/hadp-alpha-app/actions/runs/46047136602) | api smoke test ✗ | Pulumi kept the broken service as "unchanged" (no URL) → added `--refresh` and the empty-url check |
| [46047650171](https://github.com/tw-sample-accelerator-team/hadp-alpha-app/actions/runs/46047650171) | ✓ all four jobs (web deploy re-run twice) | the web deploy needed `serviceUsageConsumer` for the federated identity, and a few minutes for that grant to take effect |

Deployed: api `https://api-dev-m3ocxweahq-uc.a.run.app/health` → 200 `{"status":"ok","checks":{"database":true}}`;
web `https://web-dev-91c36c.web.app/` → 200. `https://web-dev-91c36c.web.app/api/health` reaches the api,
which answers 404 because the api serves `/health` (see gotchas).

## 12. Reusing this on another repository (skill checklist)

A repository fits this recipe when it has:

- [ ] a bun workspace with `apps/<frontend>` (Vite SPA) and `apps/<backend>` (Bun + Dockerfile),
- [ ] an `infra/` Pulumi program per app, with `scripts/pulumi.mts`, `scripts/setup.mts`,
      `scripts/provision-deployer.mts` and `scripts/lib/deployer-roles.mts` (from the
      `frontend-react-vite-template` and `backend-ts-hex-drizzle-template` templates),
- [ ] `bun run deploy` in each `infra/` that deploys by itself.

Steps:

1. Run the pre-flight checks (section 4) and fill in the parameters in section 2 (project and
   project number, region, bucket, repository, stack, app folders and Pulumi project names).
2. Make the decisions in section 5, and confirm with the person anything that reaches beyond the
   repository: the target project, adding Firebase, creating Cloud SQL (billed hourly).
3. Run every app's checks locally (section 3.4), so CI failures are about CI, not code.
4. Point every `infra/Pulumi.yaml` / `Pulumi.<stack>.yaml` at the project (6.2), checking
   the bucket for clashing stack names.
5. Run `provision-deployer --github <owner>/<repo>` per app (6.3), dry run first, then grant
   `serviceusage.serviceUsageConsumer` to the repository's principal set (also 6.3).
6. Set `GCP_WORKLOAD_IDENTITY_PROVIDER` and one `GCP_<APP>_DEPLOYER_SERVICE_ACCOUNT` per app (6.4).
7. Run `bun run setup <stack>` per app and commit the salts (6.5).
8. Copy `.github/workflows/deploy.yml`. Rename the app folders and jobs, and the
   `vars.GCP_<APP>_…` names. Keep the job graph: check → deploy, frontend after the backend
   it forwards to.
9. Test from the branch with a `TEMP` trigger (section 8), check it (section 9), then remove the trigger.
   Budget ~25 min for the first run (section 8).
10. Record anything new in this file's gotchas.
