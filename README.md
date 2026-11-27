# Delivery Commercial Governance

An account-level CGM Coach for Delivery Managers and CLT members: it shows where CGM
falls short across an account's projects, records the optimization plan people decide on,
and measures what those decisions achieved. See `docs/product/` for the vision and PRD.

## Layout

| Path        | Holds                                                       |
| ----------- | ----------------------------------------------------------- |
| `apps/`     | One folder per app component                                |
| `packages/` | Code shared between apps                                    |
| `infra/`    | Infrastructure as code for every environment                |
| `docs/`     | Product, requirements, architecture and operations docs     |

Apps (see `docs/architecture/app-components.json` and `tech-stack.json`):

- `apps/web`: React web UI (frontend-react, feature folders)
- `apps/api`: TypeScript backend service (backend-ts, hexagonal)

## Build, test and run

The repo is a bun workspace. From the root:

```sh
bun install
bun run build   # builds every app
bun run test    # runs every app's tests
```

What the root scripts need:

- Node 22 on the PATH (see `apps/web/.nvmrc`): Vitest and Playwright in `apps/web` run on Node.
- The api's test Postgres: run `bun run db:up` in `apps/api` (Docker) before `bun run test`,
  because its integration and e2e suites use a real database.
- `apps/api` has no build step: Bun runs its TypeScript directly; `bun run typecheck` checks it.

Each app's own README describes how to run it locally and how to deploy it.
