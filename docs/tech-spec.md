# Tech spec: CGM Actions Tracker (Slice 1), web and backend

| | |
| --- | --- |
| Status | Draft for review · v0.1 · 28 Nov 2026 |
| Implements | `docs/product/prd.md` v0.1 (FR-1 to FR-12; FR-13 is PA-side) |
| Based on | `docs/plans/technical-implementation.md` (design and data sources), `spikes_learning/` (what the spikes proved) |
| Build platform | HADP (`docs/plans/hadp-todo.md`) |

## 1. Scope

### 1.1 In scope

This spec covers building the two parts of the CGM Actions Tracker:

- **`apps/web`:** the tracker UI. A React single-page app that runs inside an iframe.
- **`apps/api`:** the tracker backend. A TypeScript service that owns its PostgreSQL database.

It also covers their infrastructure (Cloud Run, Cloud SQL), configuration per environment, local development, tests and delivery.

### 1.2 Not in scope: the Project Accounting (PA) frontend change

**This work does not include any change to the PA frontend.** The tracker is built and tested on its own, against a local dev host page (§11.2) and PA's real dev backend.

It will be **plugged into the PA frontend later, as a separate PA-team change**:

- **Where:** a new **Actions Tracker** tab in **Account Level View** (`src/pages/account-level-view/page.tsx`), shown when exactly one account is selected.
- **How:** an `<iframe>` pointing at the tracker web URL, with PA's **existing** token bridge `useCoachAuthBridge` (the one CGM Coach uses).
- **Gating:** a toggle and the `CGM_ACTIONS_TRACKER` rollout record.

§10 defines the integration contract the tracker must honour so that plugging in needs no tracker change. A working reference of the PA side, 80 lines, was proven in the spikes: `spikes_learning/pa-frontend-spike-branch.patch`.

### 1.3 Out of scope (product)

As in PRD §4.2:
- measuring actual CGM impact
- editing fields other than status, and deleting actions
- notifications
- cross-account views
- standalone use outside PA
- writing to Salesforce or PA.

## 2. Context

- Account, project and people data live in Salesforce, behind PA's backend. PA has no database.
- The tracker stores only actions. It reads everything else **through PA's backend with the user's own token**, so access rules are exactly PA's.
- The user's PA session is handed to the iframe by PA, so there is no second sign-in.

```
 PA frontend (later, PA team)            Tracker (this spec)
 ┌───────────────────────────┐   iframe   ┌──────────────────────┐  Bearer <PA token>  ┌──────────────────────┐
 │ Account Level View        │──────────► │ apps/web (Cloud Run) │ ──────────────────► │ apps/api (Cloud Run) │
 │  tab "Actions Tracker"    │ postMessage│ React SPA            │                     │ bun, TS, hexagonal   │
 │  useCoachAuthBridge       │◄─────────► │ token in memory      │                     │  ├─ Postgres (Cloud SQL)
 └───────────────────────────┘  (token)   └──────────────────────┘                     │  └─ PA backend (user's token)
                                                                                         └──────────────────────┘
```

## 3. Requirements traceability

| FR | Web | API | Section |
| --- | --- | --- | --- |
| FR-1 open for account, no sign-in | Bootstrap, auth bridge client, header | `GET /api/me`, auth middleware | §6.2, §7.3 |
| FR-2 create form | Create dialog | `POST …/actions` | §6.3, §7.4 |
| FR-3 project picker | Project combobox | `GET …/projects` | §6.3, §7.4 |
| FR-4 owner picker | Owner combobox | `GET /api/people`, owner re-check on create | §6.3, §7.4 |
| FR-5 validation | Field errors | zod schema, 422 field errors | §6.3, §7.5 |
| FR-6 appears without reload | Query invalidation | 201 returns the action | §6.4 |
| FR-7 list and ordering | Actions table | `GET …/actions` ordering | §6.2, §7.4 |
| FR-8 empty state | Empty state | none | §6.2 |
| FR-9 status update | Status select | `PATCH …/status`, optimistic concurrency | §6.3, §7.4 |
| FR-10 audit | "Created by / updated" | `cgm_action_status_change` | §8 |
| FR-11 access | "No access" state | PA access check on every account route | §7.3 |
| FR-12 session end | "Session ended" state | 401 handling | §6.5 |
| FR-13 tab visibility | **PA side** (§10) | none | §10 |

## 4. Technology

| Concern | Choice |
| --- | --- |
| Monorepo | HADP layout: bun workspace, `apps/web`, `apps/api`, `docs/`, root `package.json` |
| Web | React 19, Vite, TypeScript, TanStack Query, react-hook-form + zod, an accessible combobox (shadcn/Radix), Tailwind; vitest + Testing Library; Playwright + axe |
| API | bun 1.3, TypeScript, hexagonal layout (HADP backend standard), `jose` (JWT), zod, `drizzle-orm` + `drizzle-kit`, `postgres` driver, `bun test` |
| Database | PostgreSQL 17 on Cloud SQL, owned by `apps/api` (HADP Postgres standard: drizzle migrations only, snake_case, `id, created_at, updated_at`) |
| Runtime | Cloud Run, one service each for web (nginx-unprivileged, port 8080) and api (bun, port 8080) |
| IaC / CI | Pulumi (TypeScript) per app in `apps/*/infra`; CircleCI with contexts `project-accounting-<env>` (PA's pattern) |
| Coverage gates | web ≥ 70%, api ≥ 80% (HADP standards) |

## 5. Configuration per environment

| Key | local | dev | qa | uat | prod |
| --- | --- | --- | --- | --- | --- |
| `OKTA_ISSUER` (api) | `https://integrator-8215941.okta.com/oauth2/default` | same | same | `https://thoughtworks.oktapreview.com/oauth2/ausjs00lctzrNgRMj0h7` | `https://thoughtworks.okta.com/oauth2/default` |
| `OKTA_AUDIENCE` (api) | `api://default` | same | same | same | same |
| `ALLOWED_CIDS` (api) | `0oawcpprzyKXJOSQn697` | `0oawcsr8xirsn4tSE697,0oawcpprzyKXJOSQn697` | `0oawe097ymU2tbhcL697` | `0oa2ivhae4eJAmMgo0h8` | `0oa24vkbvicjHZe1k0h8` |
| `PA_BACKEND_URL` (api) | dev PA backend | `https://project-accounting-backend-dev-52f19b4-387514796579.us-central1.run.app` | `…-qa-b085e2b-777619863595…` | `…-uat-3fc1b50-782737339399…` | `…-prod-8974dda-685940200225…` |
| `WEB_ORIGIN` (api CORS) | `http://localhost:5175` | tracker web dev URL | qa URL | uat URL | prod URL |
| `PA_ORIGINS` (web: frame-ancestors + postMessage) | `http://localhost:5173` | `https://project-accounting-dev.web.app http://localhost:5173` | `https://project-accounting-qa.web.app` | `https://project-accounting-uat.web.app` | `https://project-accounting-prod.web.app` |
| `API_BASE_URL` (web) | `http://localhost:8080` | tracker api dev URL | … | … | … |
| `AUTH_MODE` (api) | `okta` or `dev-local` (§11.2) | `okta` | `okta` | `okta` | `okta` |
| GCP project | none | `project-accounting-dev-8394` | `project-accounting-qa-0c37` | `project-accounting-uat-5d80` | `project-accounting-prod-8999` |

- Web config is injected at container start (`/config.json` rendered from env vars by the nginx entrypoint), so one image runs in every environment.
- `AUTH_MODE=dev-local` is refused at startup unless `NODE_ENV=development`.

## 6. Web (`apps/web`)

### 6.1 Structure

The structure follows HADP feature folders; features don't import each other.

```
apps/web/src/
  app/            App.tsx, router-less shell, QueryClient, ErrorBoundary
  shared/
    auth/         pa-bridge.ts (handshake + inbound checks), token-store.ts (memory), useSession()
    api/          http.ts (fetch wrapper: Bearer, 401 retry-once, error shape), types.ts
    config/       config.ts (loads /config.json)
    ui/           design-system re-exports
  features/
    actions-list/   ActionsTable, EmptyState, StatusSelect, useActions()
    create-action/  CreateActionDialog, ProjectCombobox, OwnerCombobox, schema.ts
  main.tsx
```

### 6.2 Screens and states (one screen, no routing)

The URL is `/?account_id=<18-char SF id>&account_name=<text>&_embed=1`.

| State | When | Shows |
| --- | --- | --- |
| Connecting | Handshake in progress (up to 3 s) | Skeleton |
| Not embedded | `window.parent === window`, or no `account_id` | "Open the Actions Tracker from Project Accounting → Account Level View" |
| No token | Handshake timeout | Same as Session ended |
| No access | API 403 | "You don't have access to this account" (FR-11) |
| PA unavailable | API 503 | "Project Accounting is unavailable, try again" + Retry |
| Empty | 0 actions | Empty-state text + **Create Action** button (FR-8) |
| List | ≥ 1 action | Header ("Actions: {account_name}", **Create Action**) + table (FR-7) |
| Session ended | `COACH_AUTH_CLEAR`, or a 401 after retry | "Session ended, reload Project Accounting" (FR-12) |

- **Table columns:** Title (with planned change as a secondary line), Related project (or "Account-wide"), Owner, Expected improvement (`+1.0 pp`), Status (select), Last updated (date, with the updater's name in a tooltip).
- **Order:** as returned by the API (FR-7).
- **Width:** works from 900 px with no horizontal scroll; columns wrap below 1,100 px.

### 6.3 Create Action form and status change

| Field | Control | Client rule (mirrors API, §7.5) |
| --- | --- | --- |
| Action title | text | required, 1–120 |
| Planned change | textarea | required, 1–2,000 |
| Account | read-only text | `account_name` |
| Related project | combobox, loaded when the dialog opens (`GET …/projects`), active first, first option "No specific project (account-wide)" | optional |
| Owner | async combobox, debounced 300 ms, ≥ 2 chars (`GET /api/people`), shows name + email | required |
| Expected CGM improvement | number input with "pp" suffix, step 0.1 | required, −100.0..+100.0, ≤ 1 decimal |

- **Saving.** Save sends an `Idempotency-Key` (UUID generated when the dialog opens).
  - On 201 the dialog closes, the list query is invalidated and the new row is shown (FR-6).
  - On 422, `fields` errors are shown next to each field (FR-5).
- **Status select** (FR-9). It sends `PATCH` with the row's `version`.
  - Optimistic update.
  - On 409 it reverts, refetches and shows a toast "Someone else changed this action".

### 6.4 Data fetching

- TanStack Query keys: `['actions', accountId]`, `['projects', accountId]` (stale 5 min), `['people', query]` (stale 1 min).
- No retries on 4xx; one retry on 503.

### 6.5 Auth bridge client (`shared/auth/pa-bridge.ts`)

1. **Detect embedding.** Embedded means `window.parent !== window`.
2. **Find the parent origin.** It must be one of `PA_ORIGINS`. Read it from `document.referrer`'s origin, and fall back to trying each `PA_ORIGINS` entry with `postMessage` targeted to that origin, never `*`.
3. **Send the request.** Post `{source:'cgm-coach', version:1, type:'COACH_AUTH_REQUEST'}` and wait up to 3 s.
4. **Check every incoming message.** Accept it only if all of these hold:
   - `event.origin ∈ PA_ORIGINS`
   - `event.source === window.parent`
   - `data.source === 'project-accounting'`
   - `data.version === 1`
   - `data.type` is `COACH_AUTH_TOKEN` (with a non-empty string `accessToken` and a number `expiresAt`) or `COACH_AUTH_CLEAR`.

   Ignore everything else.
5. **Hold the token.** Keep `{accessToken, expiresAt}` in a module variable only; never in storage, the URL or logs. Each new TOKEN replaces it. CLEAR drops it and switches to the Session ended state.
6. **On a 401 from the API.** Request again once, then retry the call once. If that fails, show Session ended.
7. **Before expiry.** If `expiresAt − now < 60 s` before a call, request a fresh token first.

The `source:'cgm-coach'` value is reused so PA's bridge works unchanged (§10). If PA later generalises the protocol, only this file changes.

### 6.6 Hosting headers (nginx)

```
Content-Security-Policy: frame-ancestors ${PA_ORIGINS}; default-src 'self'; connect-src 'self' ${API_BASE_URL}; img-src 'self' data:; style-src 'self' 'unsafe-inline'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Cache-Control: no-cache            (index.html, config.json);  public, max-age=31536000, immutable  (hashed assets)
```

- **No `X-Frame-Options`**; it would block PA.
- The page needs no cookies.

## 7. API (`apps/api`)

### 7.1 Structure (hexagonal)

```
apps/api/
  src/
    domain/          Action, ActionStatus, ExpectedImprovement, AccountId (15→18 normalise, 001 prefix), errors
    application/
      ports/         ActionRepository, AccountDirectory, PeopleDirectory, Clock, IdGenerator
      use-cases/     ListActions, CreateAction, ChangeActionStatus, ListProjects, SearchPeople, GetMe
    adapters/
      inbound/http/  router.ts, auth.ts (JWT), cors.ts, errors.ts, schemas.ts (zod), handlers/*
      outbound/pg/   schema.ts (drizzle), DrizzleActionRepository.ts
      outbound/pa/   PaClient.ts (fetch, timeouts, status mapping), PaAccountDirectory.ts (cache), PaPeopleDirectory.ts
      outbound/fake/ FakeAccountDirectory, FakePeopleDirectory (tests and AUTH_MODE=dev-local)
    main.ts          wiring only
  drizzle/           migrations (generated by drizzle-kit)
  infra/             Pulumi: Cloud Run service, migration job, Cloud SQL, DB users, secrets, SA
```

### 7.2 Request pipeline

CORS → request id → auth → route → use case → error mapper → JSON log line.

- **CORS.** Only `WEB_ORIGIN` is allowed. Methods `GET, POST, PATCH, OPTIONS`; headers `Authorization, Content-Type, Idempotency-Key`; no credentials.
- **Open routes.** `/hello` and `/health` need no auth. Every `/api/*` route needs a Bearer token.

### 7.3 Authentication and authorisation

**Token verification** (`jose`):
- Keys come from `createRemoteJWKSet(OKTA_ISSUER + '/v1/keys')`, cached.
- The token must be RS256, with `iss = OKTA_ISSUER` and `aud = OKTA_AUDIENCE`, and not expired (clock tolerance 30 s).
- `emp` must be present, and `cid ∈ ALLOWED_CIDS`.
- Any failure returns 401 `UNAUTHENTICATED`.
- The request principal is `{employeeId: emp, email: sub, token}`. The token is kept only for the duration of the request, to forward to PA.

**Account access** (every `/api/accounts/{accountId}/…` route):
1. Normalise and validate `accountId`: 15 or 18 alphanumerics with the `001` prefix, else 400.
2. `AccountDirectory.check(principal, accountId)` calls PA `GET /api/v1/projects/by-account?accountId=` with the user's token. The result maps as follows:

| PA result | Tracker | Cached (key `emp:accountId`, TTL 5 min, LRU 5,000) |
| --- | --- | --- |
| 200 | Allowed; the project list is kept with the cache entry | Yes |
| 403 | 403 `NO_ACCOUNT_ACCESS` (logged with PA's message) | No |
| 401 | 401 `UNAUTHENTICATED` | No |
| 400 with a validation message | 400 `INVALID_ACCOUNT_ID` | No |
| 400 with any other message, 5xx, timeout (3 s), network error | Retry once after 200 ms; then 503 `PA_UNAVAILABLE` | No |

- **Outbound headers.** Requests to PA carry only `Authorization` and `Accept`; never `Origin`, cookies or `X-Impersonate-Employee`.
- **Account display name.** `account_name` from the URL is display-only and never stored as truth.

### 7.4 Endpoints

All bodies are JSON. Ids are UUID v4, timestamps are ISO-8601 UTC, and numbers are decimals given as JSON numbers with one decimal place.

**`GET /api/me`.** Returns `{employeeId, email, name}`. `name` comes from PA `user-info` `data.name`, cached per `emp` for 30 minutes; if PA fails, it falls back to `email`. The token has no `name` claim (spike).

**`GET /api/accounts/{accountId}/actions`.** Returns `{items: Action[]}`, ordered by status (`OPEN`, `IN_PROGRESS`, `IMPLEMENTED`), then `updated_at` descending. No pagination in Slice 1: at most 200 per account, enforced by a guard that returns the newest 200.

```ts
type Action = {
  id: string; accountId: string
  projectId: string | null; projectName: string | null
  title: string; plannedChange: string
  owner: { contactId: string; employeeId: string; name: string; email: string }
  expectedCgmImprovementPp: number          // e.g. 1.0
  status: 'OPEN' | 'IN_PROGRESS' | 'IMPLEMENTED'
  version: number
  createdBy: { employeeId: string; name: string }; createdAt: string
  updatedBy: { employeeId: string; name: string }; updatedAt: string
}
```

**`POST /api/accounts/{accountId}/actions`.** Header `Idempotency-Key: <uuid>` is required. The body:

```ts
{ title: string; plannedChange: string; projectId?: string | null;
  owner: { contactId: string; query: string }; expectedCgmImprovementPp: number }
```

The rules:
- If `projectId` is set, it must be in the cached project list for the account, else 422 `fields.projectId`. `projectName` is copied from PA.
- **The owner is re-checked on the server.** PA `search?type=contact&query=<owner.query>&limit=20` must contain `owner.contactId`, else 422 `fields.owner`. Name (`firstName lastName`), email and employeeId are copied from PA, never from the client. A record without an `employeeId` or `email` returns 422 `fields.owner` "This person has no employee record".
- `status = OPEN`, `version = 1`. A create row is inserted in `cgm_action_status_change` in the same transaction.
- A repeated `Idempotency-Key` returns the original 201 body.
- The response is `201 Action`.

**`PATCH /api/accounts/{accountId}/actions/{id}/status`.** Body `{status, version}`.
- 404 if the action doesn't exist or belongs to another account.
- 409 `VERSION_CONFLICT` with the current `Action` if `version` doesn't match.
- Same status as now: 200, no-op, no history row.
- Otherwise it updates status, `version+1`, `updated_*` and inserts a history row in one transaction. The response is `200 Action`.

**`GET /api/accounts/{accountId}/projects`.** Returns `{items: [{id, name, isActive}]}` from the cached PA list: active first, then by name.

**`GET /api/people?query=`.** `query` must be 2–80 characters, else 400. It proxies PA `search?type=contact&limit=20` and returns `{items: [{contactId, name, email, employeeId}]}`. There is no account check, the same as PA. It is not cached server-side.

**`GET /hello`** returns `{hello:'cgm-actions-api'}` (HADP gate). **`GET /health`** returns `{ok:true, db:'up'|'down'}`.

### 7.5 Validation and errors

Error body: `{ error: { code: string, message: string, fields?: Record<string,string>, requestId: string } }`

| HTTP | `code` | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST`, `INVALID_ACCOUNT_ID` | Bad query or path, or a missing `Idempotency-Key` |
| 401 | `UNAUTHENTICATED` | Token missing or invalid, or PA says 401 |
| 403 | `NO_ACCOUNT_ACCESS` | PA denies the account |
| 404 | `NOT_FOUND` | No action with that id in this account |
| 409 | `VERSION_CONFLICT` | Stale `version` |
| 422 | `VALIDATION_FAILED` | Field rules; `fields` set |
| 503 | `PA_UNAVAILABLE`, `DB_UNAVAILABLE` | Upstream down |
| 500 | `INTERNAL` | Anything else (logged with the request id) |

Field rules:
- `title` 1–120 and `plannedChange` 1–2,000, after trim.
- `expectedCgmImprovementPp` is finite, −100 ≤ x ≤ 100, and `x*10` is an integer.
- `status` is one of the 3 values.
- `projectId` and `owner.contactId` are 15/18-character Salesforce ids.

## 8. Data model (owned by `apps/api`)

```sql
create type action_status as enum ('OPEN','IN_PROGRESS','IMPLEMENTED');

create table cgm_action (
  id                          uuid primary key default gen_random_uuid(),
  account_id                  varchar(18)   not null,
  project_id                  varchar(18),
  project_name                text,
  title                       varchar(120)  not null,
  planned_change              varchar(2000) not null,
  owner_contact_id            varchar(18)   not null,
  owner_employee_id           varchar(20)   not null,
  owner_name                  text          not null,
  owner_email                 text          not null,
  expected_cgm_improvement_pp numeric(4,1)  not null check (expected_cgm_improvement_pp between -100 and 100),
  status                      action_status not null default 'OPEN',
  version                     integer       not null default 1,
  idempotency_key             uuid          unique,
  created_by_employee_id      varchar(20)   not null,
  created_by_name             text          not null,
  updated_by_employee_id      varchar(20)   not null,
  updated_by_name             text          not null,
  created_at                  timestamptz   not null default now(),
  updated_at                  timestamptz   not null default now()
);
create index cgm_action_account_idx on cgm_action (account_id, status, updated_at desc);

create table cgm_action_status_change (
  id                     uuid primary key default gen_random_uuid(),
  action_id              uuid not null references cgm_action(id),
  from_status            action_status,
  to_status              action_status not null,
  changed_by_employee_id varchar(20) not null,
  changed_by_name        text not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index cgm_action_status_change_action_idx on cgm_action_status_change (action_id, created_at);
```

**Database users.**
- `cgm_migrator` owns the schema.
- `cgm_app` has `SELECT, INSERT, UPDATE` on `cgm_action` and `SELECT, INSERT` on `cgm_action_status_change`. It has no `DELETE`, which keeps the audit trail append-only.

**Migrations.**
- `drizzle-kit generate` produces SQL that is checked into `apps/api/drizzle/`.
- `drizzle-kit migrate` runs as a Cloud Run **job** as `cgm_migrator`, before each deploy.
- The app never migrates at start-up.

**Backups.** Cloud SQL daily automated backups, 7-day retention, point-in-time recovery on (PRD §6: RPO 24 h, RTO 4 h).

## 9. Infrastructure (Pulumi, per environment)

| Resource | Name | Notes |
| --- | --- | --- |
| Artifact Registry repo | `cgm-actions` | Must not reuse PA's `project-accounting` repo |
| Cloud Run service | `cgm-actions-web-<env>` | nginx-unprivileged; min 0, max 3; `allUsers` invoker (browser) |
| Cloud Run service | `cgm-actions-api-<env>` | bun; min 1 in uat/prod (avoids cold start inside a review), 0 in dev/qa; max 5; `allUsers` invoker (the app authenticates every `/api/*` call); Cloud SQL socket `/cloudsql/<conn>` |
| Cloud Run job | `cgm-actions-migrate-<env>` | Same image, `bun run migrate` |
| Cloud SQL | `cgm-actions-<env>` | PostgreSQL 17, `db-f1-micro` (dev/qa), `db-g1-small` (uat/prod), ZONAL, backups + PITR, database `cgm_actions` |
| Service accounts | `cgm-actions-api`, `cgm-actions-web` | api: `roles/cloudsql.client`, `secretmanager.secretAccessor` on its 2 secrets only; web: no roles |
| Secrets | `CGM_ACTIONS_DB_APP_PASSWORD`, `CGM_ACTIONS_DB_MIGRATOR_PASSWORD` | Injected as Cloud Run secret env vars |

Only Cloud Run compute is used (HADP `no-other-compute`).

## 10. Integration contract with PA (PA-side work, not in this scope)

The tracker must work with the following PA-side change, delivered later by the PA team. Nothing in this list is built here.

| PA-side item | What PA does | Tracker obligation (in scope here) |
| --- | --- | --- |
| Env config | Add `CGM_ACTIONS_BASE_URL` per environment in `src/lib/env.ts` | Publish stable web URLs per environment |
| Tab | In `src/pages/account-level-view/page.tsx`, add an **Actions Tracker** tab when `singleSelectedAccount` is set and the toggle / rollout is on (FR-13) | none |
| Iframe | `<iframe title="CGM Actions Tracker" src="{CGM_ACTIONS_BASE_URL}/?account_id={id}&account_name={name}&_embed=1">`, full width, `key={accountId}` | Accept these query params (§6.2) |
| Token | `useCoachAuthBridge(iframeRef, CGM_ACTIONS_BASE_URL, true)`, the existing hook, **unchanged** | Speak the protocol exactly (§6.5) |
| Gating | Static toggle `FEATURE_CGM_ACTIONS_TRACKER_ENABLED`, then the `PA_Feature_Rollout_Config__c` record `CGM_ACTIONS_TRACKER` per pilot market | none |
| Framing | Nothing: PA's own `X-Frame-Options: DENY` doesn't stop PA framing others | Send `frame-ancestors` with PA's origin per environment (§6.6) |
| PA backend | No change. The tracker calls `projects/by-account`, `search` and `user-info` as an internal consumer | Contract tests on those three (§12); agree this with the PA team |

The reference implementation, proven locally in the spikes, is `spikes_learning/pa-frontend-spike-branch.patch`.

## 11. Local development

### 11.1 With real PA (integration)

This is the setup proven in the spikes:

1. Run PA frontend with the reference patch on `localhost:5173`. It uses the local Okta client and the dev PA backend.
2. Run `apps/web` on `:5175` and `apps/api` on `:8080` with `AUTH_MODE=okta`.
3. Postgres runs in Docker (`docker compose up db`).
4. Sign in with the shared test users. Setup and gotchas: `spikes_learning/03-local-setup-and-gotchas.md`.

### 11.2 Without PA (day-to-day)

The PA frontend change isn't part of this work, and the web app only works inside a parent. So the repo ships a **dev host page**:

- `apps/web/dev-host/index.html`, served by Vite on `localhost:5173` in dev mode. It uses the same port as local PA so `PA_ORIGINS` stays the same; run one or the other.
- It frames the web app and answers the `COACH_AUTH_REQUEST` with a token.

Token source and API mode:

- With `AUTH_MODE=dev-local`:
  - **Token.** The host page gets a token from `POST /dev/token {employeeId, name}` on the API. It is signed with a local key pair, and the API accepts only that key in this mode.
  - **PA data.** `FakeAccountDirectory` and `FakePeopleDirectory` serve seeded accounts, projects and people. These include a "no access" account, which covers the 403 path the shared test users can't.
- **Refused outside development.** `dev-local` and `/dev/token` are refused unless `NODE_ENV=development`, and they are never built into the production image's config.

## 12. Testing

| Level | What | Tool |
| --- | --- | --- |
| Domain unit | `ExpectedImprovement` (range, one decimal), `AccountId` normalisation, status rules | `bun test` |
| Use case | Create (project not in account, owner not found, owner without employee id, idempotency), ChangeStatus (409, 404 other account, no-op) | `bun test` with fakes |
| Auth | JWT: wrong `iss`, `aud`, `cid`, expired, missing `emp`, wrong alg; `dev-local` refused in production mode | `bun test` with local keys |
| PA adapter | Status mapping table §7.3, including the dev "400 Salesforce instance URL not available" case; retry once; cache hit/miss; no `Origin` header sent | `bun test` with a stub server |
| Repository | Migrations apply; ordering; append-only grants (`cgm_app` cannot delete) | Postgres container |
| **Contract** | Shapes of PA `projects/by-account`, `search?type=contact`, `user-info` (recorded in `spikes_learning/02`) checked nightly against dev PA with a test-user token | CI scheduled job |
| Web unit | Bridge: wrong origin, wrong source window, bad version ignored; CLEAR; 401 re-request once; pre-expiry refresh. Form validation (FR-5). States table §6.2 | vitest + Testing Library |
| E2E (dev host) | PDF walkthrough: create "Review staffing mix for Project A", owner, +1.0 pp → In Progress → reload → persisted; empty state; no-access state; 409 conflict | Playwright + axe |
| E2E (real PA) | Spike script promoted: local PA + patch, test user, handshake, list loads | Playwright (manual / pre-release) |

## 13. Non-functional

| Area | Target (PRD §6) | How |
| --- | --- | --- |
| Performance | List p95 < 1.5 s in the iframe; save p95 < 1 s | Access/project cache (5 min); list query on an index; `min-instances 1` in uat/prod. The spike measured PA calls at 0.6–2.2 s from a laptop; re-measure from Cloud Run before sign-off |
| Availability | 99.5% Mon–Fri UTC | Cloud Run + Cloud SQL backups; a PA outage shows "PA unavailable" without breaking PA |
| Security | Valid PA token only; framed by PA only; encryption in transit and at rest | §6.5, §6.6, §7.3; Cloud SQL default encryption; TLS on Cloud Run |
| Privacy | Owner and actor name, email, employee id only | Data model §8; no tokens or bodies in logs |
| Accessibility | WCAG 2.1 AA | Radix primitives, labelled fields, axe in E2E |
| Observability | One JSON log line per request (`requestId, route, status, ms, emp, accountId, paCalls[{path,status,ms}]`), never the token | Cloud Logging; alerts on 5xx rate > 2% for 10 min and on `PA_UNAVAILABLE` |

## 14. Delivery

| Step | Output |
| --- | --- |
| 1 | HADP bootstrap: repo, `apps/web` + `apps/api` hello-world on dev Cloud Run (`docs/plans/hadp-todo.md`) |
| 2 | Platform: Cloud SQL, DB users, secrets, migration job; JWT middleware; CORS; nginx headers + `/config.json`; bridge client; dev host page |
| 3 | Capability: actions list, create, status (§6–§8), test first |
| 4 | Contract tests and Playwright E2E in CI; coverage gates |
| 5 | Promote dev → qa → uat → prod (CircleCI approvals) |
| 6 | Hand the integration contract (§10) and reference patch to the PA team; PA-side change and rollout are theirs |

## 15. Open questions and risks

| # | Item | Impact on this spec |
| --- | --- | --- |
| PRD Q1 | Expected improvement: delta in pp vs target % | Field name and validation (§7.5) |
| PRD Q2 / Q8 | Who may create or change; PM-only owners | Today: anyone PA grants the account to |
| PRD Q4 | Status moves free or forward-only | `ChangeActionStatus` rule |
| S5 | No non-power test user on dev | Real 403 path only covered by `dev-local` fakes until one exists |
| Latency | PA calls 0.6–2.2 s from a laptop | May need a longer cache or prefetch on load |
| R1 | PA-internal endpoints change | Nightly contract tests; agreement with the PA team |
| R3 | Shared `aud=api://default` | `cid` allowlist (§7.3) |
