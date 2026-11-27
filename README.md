# Delivery Commercial Governance

Shows Delivery Managers, CLT members and action owners the contribution gross margin (CGM)
of their entitled accounts, explains gaps and drivers with evidence, and tracks optimization
plans and actions to their outcome. See [docs/product/prd.md](docs/product/prd.md).

This is iteration 0: a hello world monorepo with one app per component in
[docs/architecture/app-components.json](docs/architecture/app-components.json). No feature is
built yet.

## Layout

| Path        | Holds                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| `apps/web`  | Browser UI: React + Vite, feature folders (`frontend-react` standard)  |
| `apps/api`  | HTTP service: Bun + TypeScript, hexagonal, Drizzle on PostgreSQL (`backend-ts` standard) |
| `packages/` | Code shared between apps (none yet)                                    |
| `infra/`    | Shared infrastructure as code (none yet; each app deploys from its own `infra/`) |
| `docs/`     | Product, requirements and architecture docs                            |
| `config.json` | The GCP project (`gcp_project_id`) and region (`region`); set by the project owner |

Each app's Pulumi dev stack (`apps/<app>/infra/Pulumi.dev.yaml`) targets the GCP project and
region in `config.json`, and its state lives in the `gs://<gcp_project_id>-pulumi-state` bucket.

## Prerequisites

- [Bun](https://bun.sh) 1.3 or later
- Node 22.12 or later (Vitest and Playwright in `apps/web`)
- Docker with the Compose plugin (PostgreSQL for `apps/api` tests)

## Build, test and run

The root `package.json` is a bun workspace over `apps/*` and `packages/*`.

```sh
bun install                 # installs every app
bun run build               # builds apps/web
bun run typecheck           # every app
bun run lint                # every app
bun run test                # every app; apps/api needs its test database (below)
```

`apps/api` runs its integration and end-to-end suites against PostgreSQL in Docker:

```sh
cd apps/api
cp .env.example .env
bun run db:up && bun run db:migrate
bun run test
```

Run the apps locally with `bun run dev` in `apps/web` and in `apps/api`; the web dev server
proxies `/api` to the api on port 3000. Each app's README covers its scripts and how to deploy
it to GCP.
