# web

A React single-page app: Vite, TypeScript (strict), shadcn/ui on Tailwind CSS v4, React Router and TanStack Query.

## Run locally

Prerequisites: [Bun](https://bun.sh) 1.3+ (see `packageManager` in `package.json`) and Node.js 22.12+ (see `.nvmrc`).
Bun installs packages and runs the scripts; Vitest, Playwright and Pulumi still run on Node, which `bun run` starts
for them. Use `bun run test`, not `bun test`: `bun test` is Bun's own test runner, not this project's Vitest suite.

```sh
bun install                         # install dependencies
bun run dev                         # http://localhost:5173, /api proxied to http://localhost:3000
```

Run the production build locally:

```sh
bun run build                       # type-check and build to dist/
bun run preview                     # http://localhost:4173
```

Run the checks and tests:

```sh
bun run check                       # typecheck, lint, format, knip, unit + integration tests with coverage
bun run test:unit                   # unit tests only
bun run test:integration            # integration tests only
bun run test:watch                  # re-run tests as you edit

bunx playwright install chromium    # once, for the end-to-end tests
bun run test:e2e                    # Playwright against the production build
bun run test:e2e:ui                 # the same, in Playwright's interactive UI
```

The `/health` page calls `GET /api/health` on the backend; without one running it shows "Could not reach the backend".

## Scripts

| Script                     | What it does                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `bun run dev`              | Start the dev server                                                  |
| `bun run build`            | Type-check and build to `dist/`                                       |
| `bun run preview`          | Serve the production build on port 4173                               |
| `bun run check`            | Everything CI runs except e2e: typecheck, lint, format, knip, tests   |
| `bun run typecheck`        | `tsc -b` across app, tests and config files                           |
| `bun run lint`             | ESLint (type-aware), zero warnings allowed                            |
| `bun run format`           | Prettier (with Tailwind class sorting); `format:check` in CI          |
| `bun run knip`             | Unused files, exports and dependencies                                |
| `bun run test`             | Unit and integration tests with coverage (80% gate)                   |
| `bun run test:unit`        | Unit tests only                                                       |
| `bun run test:integration` | Integration tests only                                                |
| `bun run test:e2e`         | Playwright against the production build (Chromium locally, all in CI) |

## Structure

```
src/
  app/                        composition root: providers, router, layouts, app-wide routes
    routes.tsx                the route tree (feature pages are lazy-loaded)
    query-client.ts           TanStack Query defaults (retry policy, stale time)
    layouts/  routes/  styles/
  features/<feature>/         one folder per feature
    api/                      query keys, queryOptions and hooks for the feature
    components/               components only this feature uses
    <feature>-page.tsx        the route component
    index.ts                  the feature's public API: the only file app/ may import
  shared/                     code with no knowledge of any feature
    api/                      the HTTP client and typed, schema-validated backend clients
    config/env.ts             validated VITE_* environment variables
    lib/                      small utilities (cn)
    ui/                       shadcn/ui components (generated: `bunx shadcn@latest add <name>`)
  test/                       test setup, MSW handlers and render helpers
e2e/                          Playwright specs and fixtures
infra/                        Pulumi program that deploys dist/ to Firebase Hosting
```

### Rules ESLint enforces

- Import with the `@/` alias; relative parent imports (`../`) are an error.
- `shared/` never imports from `features/` or `app/`.
- A feature imports only from `shared/` and from itself, never from another feature or from `app/`.
- `app/` imports a feature only through its `index.ts`.

### Conventions

- **Server state lives in TanStack Query**, not in component state or a global store. Each feature keeps its query keys
  and `queryOptions` together in `api/`. Use local `useState` for UI state; reach for a client store only when you
  need cross-feature client state.
- **Validate at the boundary.** Every backend response is parsed with a zod schema in `shared/api/`, so the app only
  sees data that matches its types. Non-2xx responses throw `ApiError`; 4xx are not retried.
- **Add a route** in `src/app/routes.tsx` with `lazy`, pointing at the feature's `index.ts`.
- **Add a component** with `bunx shadcn@latest add <name>`; it lands in `src/shared/ui/`.

## Testing

| Layer       | Files                           | Tools                        | Scope                                                   |
| ----------- | ------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Unit        | `src/**/*.test.ts(x)`           | Vitest, Testing Library, MSW | One function, hook or component                         |
| Integration | `src/**/*.integration.test.tsx` | Vitest, Testing Library, MSW | Real route tree + providers, network mocked at the edge |
| End-to-end  | `e2e/**/*.spec.ts`              | Playwright, axe-core         | The production build in real browsers, incl. a11y       |

- MSW's default handlers in `src/test/mocks/handlers.ts` cover the happy path; override one per test with
  `server.use(...)`. A request without a handler fails the test.
- `renderRoute(path)` in `src/test/render.tsx` renders the app's real routes in a memory router.
- E2E tests stub the backend with `page.route` (see `e2e/fixtures.ts`). Set `E2E_BASE_URL` to run them against a
  deployed environment, and `E2E_ALL_BROWSERS=1` to run Firefox and WebKit locally.

## Environment

`.env` holds committed, non-secret defaults; put local overrides in `.env.local`. Every `VITE_*` variable is bundled
into the client, so never put a secret in one. Add new variables to the schema in `src/shared/config/env.ts`.

## Deploy to Firebase Hosting

`infra/` is a Pulumi TypeScript program. One `bun run deploy` builds the app and creates or updates:

```
Firebase APIs          firebase and firebasehosting, enabled on the project
Hosting site           <app>-<stack>-<random>.web.app, separate from the project's default site
Release                dist/, uploaded with the Firebase CLI whenever the build or hosting rules change
```

Pulumi keeps its state in a GCS bucket (`gs://alpha-dev-80ca-pulumi-state`, set as `backend.url` in `infra/Pulumi.yaml`), so anyone with access to the bucket works on the same stack.

### 1. Sign in to GCP

```sh
gcloud auth login
gcloud auth application-default login     # the credentials Pulumi and the Firebase CLI use
```

### 2. Point the stack at your project

Already done by copier: `infra/Pulumi.dev.yaml` targets project `alpha-dev-80ca` in
`us-central1`, and `infra/Pulumi.yaml` stores state in `gs://alpha-dev-80ca-pulumi-state`.
Edit those two files to change them.

### 3. Deploy

```sh
cd infra
bun run preview            # optional: shows what will change
bun run deploy             # builds the app, deploys, prints the url
```

`preview`, `deploy` and `destroy` first run `scripts/setup.mts`, which gets everything Pulumi
needs in place; `preview` and `deploy` then build the app. Setup is idempotent: the first run
creates what's missing, later runs only check (a few seconds). To run it on its own,
`bun run setup`, or see what it would change with `bun run setup --dry-run`.

| Step         | Checks, and creates or fixes when needed                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Tools        | `gcloud` and `pulumi` are installed                                                                  |
| gcloud       | you're signed in, application-default credentials work, the project is reachable                     |
| APIs         | Service Usage, Resource Manager, Cloud Storage and Firebase are enabled (the stack enables the rest) |
| State bucket | the bucket from `Pulumi.yaml` exists, versioned, with uniform access and public access prevented     |
| Dependencies | `bun install` in the app and in `infra/`                                                             |
| Stack        | the stack exists on the bucket (created on first run) and is selected                                |
| Firebase     | Firebase is on the project, added if missing (one-way: Firebase can't be removed from a project)     |

When a check fails, setup stops before Pulumi runs and says what to do, for example
`gcloud credentials are missing or expired: run gcloud auth login`. API calls are billed to the
stack's project for that run only; your gcloud credentials file is not changed.

The stack holds no secrets, so its state uses an empty passphrase, which the `bun run` scripts
set. To run `pulumi` directly, export it once in your shell:

```sh
export PULUMI_CONFIG_PASSPHRASE=""
```

When the deploy finishes, open the site:

```sh
bun run pulumi stack output url
```

After a stack's first deploy, commit `infra/Pulumi.<stack>.yaml`: setup wrote its encryption salt
there.

### Deploy a change

Run `bun run deploy` from `infra/` again. It rebuilds the app and uploads a new release only when
the build or the hosting rules changed. From the app folder, `bun run deploy` does the same.

### Tear down and deploy again

```sh
bun run destroy            # removes the Hosting site and its releases
bun run deploy             # creates a new site and releases the app again
```

This works any number of times. Firebase keeps a deleted site's id reserved, so a destroyed
stack can't get its old id back; the default id ends in a random suffix kept in the stack's
state, so every deploy after a destroy creates a site with a new, free id and url, while
ordinary deploys keep the same one. Firebase stays on the project and setup only checks it.
To also drop the stack's state, run `bun run pulumi stack rm --preserve-config --yes` after
`destroy`; `--preserve-config` keeps `Pulumi.<stack>.yaml`, which setup needs to recreate it.

### Other environments

Copy `infra/Pulumi.dev.yaml` to `infra/Pulumi.<stack>.yaml`, set its `gcp:project`, then
`bun run deploy --stack <stack>`. Each stack gets its own Hosting site.

### Configuration

Set with `bun run pulumi config set <key> <value>`; they're saved in `infra/Pulumi.<stack>.yaml`.

| Key                  | Default                  | Use                                                                                              |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `gcp:project`        | (required)               | The existing project to deploy to                                                                |
| `gcp:region`         | copier's `gcp_region`    | The state bucket's location, and the default region for `apiCloudRunService`                     |
| `siteId`             | `<app>-<stack>-<random>` | The Hosting site id; global across Firebase, may not start with `demo` (then `web-` is prefixed) |
| `apiCloudRunService` | (none)                   | Forward `/api/**` to this Cloud Run service                                                      |
| `apiCloudRunRegion`  | `gcp:region`             | The region of that service                                                                       |

The hosting rules are in `infra/hosting-config.ts`: every unknown path falls back to `index.html`
for React Router, `/assets/**` is cached for a year (Vite fingerprints it), `index.html` is always
revalidated, and security headers are set on every response. `bun run destroy` removes the Hosting
site and its releases; it keeps Firebase, the APIs and the state bucket.

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

1. enables the APIs setup, Firebase Hosting and federation need;
2. creates the state bucket, so the deployer only needs to use it, not create it;
3. creates the `web-deployer` service account;
4. grants it the roles below, and no others;
5. with `--github`, creates a workload identity pool and GitHub OIDC provider (limited to the
   repository's owner) and lets workflows in exactly that repository sign in as the deployer.

It ends by printing the two repository variables to set (`GCP_WORKLOAD_IDENTITY_PROVIDER` and
`GCP_DEPLOYER_SERVICE_ACCOUNT`) as `gh variable set` commands. They aren't secrets. Until they
exist, the Deploy workflow is skipped.

The admin needs Owner, or: Project IAM Admin, Service Account Admin, Service Usage Admin,
Storage Admin and, with `--github`, Workload Identity Pool Admin.

#### Roles the deployer gets

The list lives in `infra/scripts/lib/deployer-roles.mts`; `bun run provision-deployer --list`
prints it.

| Role                                   | Granted on                                     | Why                                                               |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `roles/browser`                        | project                                        | read the project (setup's project check, provider lookups)        |
| `roles/serviceusage.serviceUsageAdmin` | project                                        | list and enable the APIs; bill API calls to the project           |
| `roles/firebase.admin`                 | project                                        | add Firebase to the project; Hosting sites, versions and releases |
| `roles/storage.admin`                  | state bucket only                              | read and write Pulumi state; setup checks the bucket's settings   |
| `roles/iam.workloadIdentityUser`       | the deployer itself, for the GitHub repository | GitHub Actions in that repository sign in as the deployer         |

The deployer isn't granted permission to create buckets, so in CI, setup only checks them. If
you add resources to `infra/`, add the roles they need to `deployer-roles.mts` and re-run
`provision-deployer`.

To check the roles are enough before wiring up CI, an admin who also has Service Account
Token Creator on the deployer can deploy as it locally:

```sh
DEPLOYER=web-deployer@<project>.iam.gserviceaccount.com
gcloud auth application-default login --impersonate-service-account=$DEPLOYER   # for Pulumi and the Firebase CLI
CLOUDSDK_AUTH_IMPERSONATE_SERVICE_ACCOUNT=$DEPLOYER bun run deploy             # gcloud in setup
```

### Troubleshooting

- **`Invalid name ... try something like fir-...`** or **`Invalid Hosting site id`:** the site id
  breaks Firebase's rules (see `infra/site-id.ts`); set another with `bun run pulumi config set siteId <id>`.
- **`... is reserved by another project`** on the Hosting site: that id belonged to a deleted site.
  With the default id this can't happen; if you set `siteId`, choose another.
- **`cannot read gs://...`:** bucket names are global and another project owns that one; set
  another in `backend.url` in `infra/Pulumi.yaml`.
- **`application-default credentials ... missing or expired`:** run `gcloud auth application-default login`.
