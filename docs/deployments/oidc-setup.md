# OIDC setup for GitHub Actions (run by a person)

GitHub Actions deploys every app to GCP by signing in through Workload Identity Federation
(OIDC). No service account key is created or stored anywhere. A person with admin access to
the GCP project runs the setup below **once, from their own machine**; the pipeline then runs
on every push.

| What | Value |
| --- | --- |
| GCP project (from `config.json`) | `alpha-dev-80ca` |
| Region (from `config.json`) | `us-central1` |
| GitHub repository | `tw-sample-accelerator-team/hadp-alpha-app` |
| Branch to check out | `hadp/apt-muhilvar-a125b6-deploy/work` |
| Pulumi state bucket | `alpha-dev-80ca-pulumi-state` |
| Workload Identity pool / provider | `github` / `github` (shared by every app) |
| Setup script | `infra/scripts/provision-github-oidc.sh` |
| Deploy workflow | `.github/workflows/deploy.yml` (already on the branch; started by the push in step 5) |

## 1. Before you start

You need, on your own machine:

- `gcloud`, signed in with an account that has, on `alpha-dev-80ca`, **Owner**, or all of:
  Project IAM Admin (`roles/resourcemanager.projectIamAdmin`), Service Account Admin
  (`roles/iam.serviceAccountAdmin`), Service Usage Admin (`roles/serviceusage.serviceUsageAdmin`),
  Workload Identity Pool Admin (`roles/iam.workloadIdentityPoolAdmin`) and Storage Admin
  (`roles/storage.admin`). Check with `gcloud auth list --filter=status:ACTIVE`; sign in with
  `gcloud auth login` if needed.
- `gh`, signed in to an account that is an admin of the repository, with the `repo` scope (or a
  fine-grained token with Variables: write). The script uses it to set the repository variables.
  Check with `gh auth status`; sign in with `gh auth login` if needed.
- `git` and `bash`.

Get the branch and stay at the repository root for every command below:

```bash
git clone https://github.com/tw-sample-accelerator-team/hadp-alpha-app.git
cd hadp-alpha-app
git fetch origin hadp/apt-muhilvar-a125b6-deploy/work
git checkout hadp/apt-muhilvar-a125b6-deploy/work
```

(If you already have a clone, `cd` into it and run only the last two commands.)

## 2. The deployer accounts and their roles

Each app gets its own deployer service account with only the roles its Pulumi program uses.
The roles come from the app template's `infra/scripts/lib/deployer-roles.mts`, listed with
`bun run provision-deployer --list`, and are written one per line in `infra/oidc/<app>.roles`.
Every deployer also gets `roles/storage.admin` on the state bucket
`alpha-dev-80ca-pulumi-state` only (not the project), and `roles/iam.workloadIdentityUser` for
`attribute.repository/tw-sample-accelerator-team/hadp-alpha-app` only. No basic role (Owner,
Editor, Viewer) is granted.

### api: `api-deployer@alpha-dev-80ca.iam.gserviceaccount.com`

Roles file: `infra/oidc/api.roles`. Deploys Cloud Run, a private Cloud SQL Postgres on its own VPC.

| Role (on the project) | Why |
| --- | --- |
| `roles/browser` | read the project (setup's project check, provider lookups) |
| `roles/serviceusage.serviceUsageAdmin` | list and enable the APIs the stack uses |
| `roles/compute.networkAdmin` | VPC, subnet and the range reserved for private services access |
| `roles/servicenetworking.networksAdmin` | peer the VPC with Google services (Cloud SQL private IP) |
| `roles/cloudsql.admin` | Cloud SQL instance, database and user |
| `roles/secretmanager.admin` | the DATABASE_URL secret, its versions and who can read it |
| `roles/artifactregistry.admin` | the image repository, and pushing images to it |
| `roles/run.admin` | Cloud Run service and migrate job, executions, public access |
| `roles/iam.serviceAccountAdmin` | create and delete the app's runtime service account |
| `roles/iam.serviceAccountUser` | deploy Cloud Run workloads that run as the runtime service account |
| `roles/logging.viewer` | read service and migrate job logs when a deploy fails |

Plus `roles/storage.admin` on the bucket `alpha-dev-80ca-pulumi-state` only.

### web: `web-deployer@alpha-dev-80ca.iam.gserviceaccount.com`

Roles file: `infra/oidc/web.roles`. Deploys the static site to Firebase Hosting.

| Role (on the project) | Why |
| --- | --- |
| `roles/browser` | read the project (setup's project check, provider lookups) |
| `roles/serviceusage.serviceUsageAdmin` | list and enable the APIs; bill API calls to the project |
| `roles/firebase.admin` | add Firebase to the project; Hosting sites, versions and releases |

Plus `roles/storage.admin` on the bucket `alpha-dev-80ca-pulumi-state` only.

## 3. Set up OIDC, per app

For each app, run the dry run first, read the plan (APIs, pool, provider, service account,
every role, bucket and GitHub variables), and only then run it for real. Then run the dry run
again: every line should say `ok`. The script is idempotent, so running it again is safe.

### api

Dry run (changes nothing):

```bash
bash infra/scripts/provision-github-oidc.sh \
  --project alpha-dev-80ca --repo tw-sample-accelerator-team/hadp-alpha-app \
  --service-account api-deployer --roles-file infra/oidc/api.roles \
  --state-bucket alpha-dev-80ca-pulumi-state --region us-central1 \
  --gh-var-suffix API --set-gh-vars --dry-run
```

Apply:

```bash
bash infra/scripts/provision-github-oidc.sh \
  --project alpha-dev-80ca --repo tw-sample-accelerator-team/hadp-alpha-app \
  --service-account api-deployer --roles-file infra/oidc/api.roles \
  --state-bucket alpha-dev-80ca-pulumi-state --region us-central1 \
  --gh-var-suffix API --set-gh-vars
```

### web

Dry run (changes nothing):

```bash
bash infra/scripts/provision-github-oidc.sh \
  --project alpha-dev-80ca --repo tw-sample-accelerator-team/hadp-alpha-app \
  --service-account web-deployer --roles-file infra/oidc/web.roles \
  --state-bucket alpha-dev-80ca-pulumi-state --region us-central1 \
  --gh-var-suffix WEB --set-gh-vars --dry-run
```

Apply:

```bash
bash infra/scripts/provision-github-oidc.sh \
  --project alpha-dev-80ca --repo tw-sample-accelerator-team/hadp-alpha-app \
  --service-account web-deployer --roles-file infra/oidc/web.roles \
  --state-bucket alpha-dev-80ca-pulumi-state --region us-central1 \
  --gh-var-suffix WEB --set-gh-vars
```

Exit codes: `0` done, `2` bad arguments, `3` not signed in or no access to the project (sign
in with an admin account as in step 1 and run it again), `1` anything else.

## 4. Check the repository variables

`--set-gh-vars` sets these. They are identifiers, not secrets, so they are **variables**. The
app needs no GitHub secret: Pulumi state uses the passphrase provider with an empty passphrase.

| Variable | Value |
| --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<project number>/locations/global/workloadIdentityPools/github/providers/github` (the script's `WORKLOAD_IDENTITY_PROVIDER=` line) |
| `GCP_PROJECT_ID` | `alpha-dev-80ca` |
| `GCP_REGION` | `us-central1` |
| `GCP_DEPLOYER_SA_API` | `api-deployer@alpha-dev-80ca.iam.gserviceaccount.com` |
| `GCP_DEPLOYER_SA_WEB` | `web-deployer@alpha-dev-80ca.iam.gserviceaccount.com` |

```bash
gh variable list --repo tw-sample-accelerator-team/hadp-alpha-app
```

If the script was run without `--set-gh-vars`, set them by hand with the values it printed:

```bash
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo tw-sample-accelerator-team/hadp-alpha-app --body "<WORKLOAD_IDENTITY_PROVIDER from the script>"
gh variable set GCP_PROJECT_ID --repo tw-sample-accelerator-team/hadp-alpha-app --body alpha-dev-80ca
gh variable set GCP_REGION --repo tw-sample-accelerator-team/hadp-alpha-app --body us-central1
gh variable set GCP_DEPLOYER_SA_API --repo tw-sample-accelerator-team/hadp-alpha-app --body api-deployer@alpha-dev-80ca.iam.gserviceaccount.com
gh variable set GCP_DEPLOYER_SA_WEB --repo tw-sample-accelerator-team/hadp-alpha-app --body web-deployer@alpha-dev-80ca.iam.gserviceaccount.com
```

## 5. Start the first deploy run

The workflows `.github/workflows/deploy.yml` and `.github/workflows/ci.yml` are already on the
branch. The worker's push ends in a `[skip ci]` commit, so no run has started yet. Start the
first run yourself, **after steps 3 and 4**: the run needs the OIDC setup and the variables in
place. An empty commit is enough. You need push access to the repository; `git` and `bash` are
enough for this step.

From the repository root, on the branch from step 1:

```bash
git pull --ff-only origin hadp/apt-muhilvar-a125b6-deploy/work
git commit --allow-empty -m "ci: start the first deploy run after the OIDC setup"
git push origin HEAD:refs/heads/hadp/apt-muhilvar-a125b6-deploy/work
```

The push runs `deploy` on the branch. Follow it with:

```bash
gh run list --repo tw-sample-accelerator-team/hadp-alpha-app --workflow deploy.yml --branch hadp/apt-muhilvar-a125b6-deploy/work --limit 1
gh run watch <run id> --repo tw-sample-accelerator-team/hadp-alpha-app --exit-status
```

IAM can take about five minutes to propagate after the apply; a `getAccessToken denied` error
in the first run right after it usually only needs
`gh run rerun <run id> --repo tw-sample-accelerator-team/hadp-alpha-app --failed`.
