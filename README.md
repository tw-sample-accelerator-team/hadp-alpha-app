# CGM Actions Tracker

The Actions Tracker embedded in Project Accounting's Account Level View: a list of
actions per account, a create form and a status control. See `docs/product/prd.md`.

## Layout

| Path        | Holds                                                        |
| ----------- | ------------------------------------------------------------ |
| `apps/web`  | The web UI (React, Vite, feature folders)                    |
| `apps/api`  | The tracker API (TypeScript, hexagonal, Drizzle on Postgres) |
| `packages/` | Code shared between apps                                     |
| `infra/`    | Infrastructure as code shared by every environment           |
| `docs/`     | Product, requirements, architecture and operations docs      |

`config.json` holds the GCP project and region; each app's `infra/Pulumi.dev.yaml` uses them.

## Prerequisites

- Bun 1.3+
- Node.js 22.12+ (Vitest, Playwright and Pulumi run on Node)
- Docker, for the api's Postgres containers (integration and e2e tests)

## Build, test and run

```sh
bun install                              # one install for the whole workspace

cd apps/web && bun run build             # type-check and build to dist/
cd apps/web && bun run test              # unit and integration tests with coverage
cd apps/web && bun run dev               # http://localhost:5173, /api proxied to :3000

cd apps/api && bun run typecheck
cd apps/api && bun run test:unit         # no database needed
cd apps/api && bun run db:up && bun run test   # unit, integration and e2e on Postgres
cd apps/api && bun run dev               # http://localhost:3000
```

Each app's own `README.md` has the full list of scripts and how to deploy it.
