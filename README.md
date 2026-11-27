# CGM Coach

The CGM Coach helps Delivery Managers and the Client Leadership Team govern each
account's profitability: see where CGM falls short across the account's projects, record
the decisions taken and who owns them, and measure what those decisions achieved. See
`docs/product/` for the vision and PRD.

This is the iteration 0 skeleton: one hello world app per app component, generated from
the catalog templates. No product feature is built yet.

## Layout

| Path                  | Holds                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| `apps/cgm-coach-web`  | Web UI: React 19 + Vite, feature folders (`frontend-react` standard) |
| `apps/cgm-coach-api`  | Backend API: TypeScript on Bun, hexagonal (`backend-ts` standard)     |
| `packages/`           | Code shared between apps (none yet)                                   |
| `infra/`              | Infrastructure as code for every environment (none yet)               |
| `docs/`               | Product, requirements, architecture and operations docs               |

Each app records its template in `.copier-answers.yml`. Each app also carries an
`infra/` Pulumi program from its template that deploys it to Cloud Run; see the app's
template README for how to use it.

## Build, test and run

Needs [Bun](https://bun.sh) 1.3 or later, and Node.js 20 or later for the web app's
vitest coverage run.

```sh
bun install          # installs every workspace app
bun run build        # vite build of the web app, tsc typecheck of the api
bun run test         # vitest (web) and bun test (api), both with coverage
```

Run an app on its own:

```sh
bun run --filter cgm-coach-api start   # GET http://localhost:3000/hello
bun run --filter cgm-coach-web dev     # Vite dev server, proxies /api to the api
```
