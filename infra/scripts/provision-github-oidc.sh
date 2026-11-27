#!/usr/bin/env bash
# Lets one GitHub repository's Actions sign in to a GCP project as a deployer service account
# through Workload Identity Federation (OIDC). No service account key is ever created.
# Idempotent: re-run it to add roles or to repair missing grants. Works with any app or repo.
#
#   provision-github-oidc.sh --project <id> --repo <owner/repo> --service-account <name> \
#     [--role <role>]... [--roles-file <file>] [--state-bucket <name> --region <region>] \
#     [--pool github] [--provider github] [--set-gh-vars [--gh-var-suffix <APP>]] [--dry-run]
#
# Run it first with --dry-run, show the plan to the person, and run it for real only after
# they approve. The account running it needs Owner, or Project IAM Admin, Service Account Admin,
# Service Usage Admin, Workload Identity Pool Admin and (with --state-bucket) Storage Admin.
#
# Exit codes: 0 done, 2 bad arguments, 3 not signed in or no access (ask the person to run
# `! gcloud auth login` in the session), 1 any other failure.
#
# The last lines it prints are machine readable:
#   WORKLOAD_IDENTITY_PROVIDER=projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>
#   SERVICE_ACCOUNT=<name>@<project>.iam.gserviceaccount.com
set -euo pipefail

GITHUB_ISSUER="https://token.actions.githubusercontent.com"
PROJECT="" REPO="" SA_NAME="" STATE_BUCKET="" REGION="" POOL="github" PROVIDER="github"
DRY_RUN=0 SET_GH_VARS=0 GH_VAR_SUFFIX=""
ROLES=()

usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
die() { echo "error: $1" >&2; exit "${2:-1}"; }
ok() { echo "  ok      $1"; }
change() { if [ "$DRY_RUN" = 1 ]; then echo "  would   $1"; else echo "  change  $1"; fi; }
step() { echo; echo "$1"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT="${2:-}"; shift 2 ;;
    --repo) REPO="${2:-}"; shift 2 ;;
    --service-account) SA_NAME="${2:-}"; shift 2 ;;
    --role) ROLES+=("${2:-}"); shift 2 ;;
    --roles-file)
      [ -f "${2:-}" ] || die "--roles-file ${2:-} does not exist" 2
      while IFS= read -r line; do
        line="${line%%#*}"; line="$(echo "$line" | tr -d '[:space:]')"
        [ -n "$line" ] && ROLES+=("$line")
      done < "$2"
      shift 2 ;;
    --state-bucket) STATE_BUCKET="${2:-}"; shift 2 ;;
    --region) REGION="${2:-}"; shift 2 ;;
    --pool) POOL="${2:-}"; shift 2 ;;
    --provider) PROVIDER="${2:-}"; shift 2 ;;
    --set-gh-vars) SET_GH_VARS=1; shift ;;
    --gh-var-suffix) GH_VAR_SUFFIX="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    *) die "unknown argument $1 (see --help)" 2 ;;
  esac
done

# --- arguments -------------------------------------------------------------------------------
[ -n "$PROJECT" ] || die "--project is required" 2
echo "$REPO" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || die "--repo takes <owner>/<repo>" 2
echo "$SA_NAME" | grep -Eq '^[a-z][a-z0-9-]{4,28}[a-z0-9]$' \
  || die "--service-account takes 6 to 30 lower case letters, digits or dashes, starting with a letter" 2
if [ -n "$STATE_BUCKET" ] && [ -z "$REGION" ]; then die "--state-bucket needs --region" 2; fi
if [ -n "$GH_VAR_SUFFIX" ]; then
  echo "$GH_VAR_SUFFIX" | grep -Eq '^[A-Z][A-Z0-9_]*$' || die "--gh-var-suffix takes UPPER_SNAKE_CASE, like ORDER_API" 2
fi
for role in ${ROLES[@]+"${ROLES[@]}"}; do
  case "$role" in
    roles/owner|roles/editor|roles/viewer) die "$role is a basic role; grant only the roles the deploy uses" 2 ;;
    roles/*) ;;
    *) die "$role is not a role name like roles/run.admin" 2 ;;
  esac
done
OWNER="${REPO%%/*}"
SA_EMAIL="$SA_NAME@$PROJECT.iam.gserviceaccount.com"

# Retries while a just-created service account or pool is still propagating through IAM.
with_retry() {
  local attempt=1 err
  while :; do
    if err="$("$@" 2>&1 >/dev/null)"; then return 0; fi
    if [ "$attempt" -ge 8 ] || ! echo "$err" | grep -Eqi 'does not exist|not found|invalid.*member'; then
      echo "$err" >&2; return 1
    fi
    attempt=$((attempt + 1)); sleep 5
  done
}

echo "provision-github-oidc$([ "$DRY_RUN" = 1 ] && echo ' (dry run, no changes)'): $REPO -> $SA_EMAIL in $PROJECT"

# --- 1. who is signed in ---------------------------------------------------------------------
step "1. gcloud account"
command -v gcloud >/dev/null || die "gcloud is not installed" 3
ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -1)"
[ -n "$ACCOUNT" ] || die "no active gcloud account. Ask the person to run: ! gcloud auth login" 3
ok "signed in as $ACCOUNT"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)' 2>/dev/null)" \
  || die "$ACCOUNT cannot read project $PROJECT. Ask the person to run ! gcloud auth login with an account that administers it" 3
ok "project $PROJECT ($PROJECT_NUMBER)"

# --- 2. APIs ---------------------------------------------------------------------------------
step "2. APIs"
APIS="iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com serviceusage.googleapis.com"
[ -n "$STATE_BUCKET" ] && APIS="$APIS storage.googleapis.com"
ENABLED="$(gcloud services list --enabled --project "$PROJECT" --format='value(config.name)')"
MISSING=""
for api in $APIS; do
  if echo "$ENABLED" | grep -qx "$api"; then ok "$api"; else change "enable $api"; MISSING="$MISSING $api"; fi
done
if [ -n "$MISSING" ] && [ "$DRY_RUN" = 0 ]; then
  # shellcheck disable=SC2086
  gcloud services enable $MISSING --project "$PROJECT" --quiet
fi

# --- 3. workload identity pool and GitHub OIDC provider --------------------------------------
step "3. workload identity pool $POOL and provider $PROVIDER"
POOL_ARGS=(--project "$PROJECT" --location global)
if gcloud iam workload-identity-pools describe "$POOL" "${POOL_ARGS[@]}" >/dev/null 2>&1; then
  ok "pool $POOL"
else
  change "create pool $POOL"
  [ "$DRY_RUN" = 1 ] || gcloud iam workload-identity-pools create "$POOL" "${POOL_ARGS[@]}" \
    --display-name "GitHub Actions" --quiet
fi
if CONDITION="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --workload-identity-pool "$POOL" "${POOL_ARGS[@]}" --format='value(attributeCondition)' 2>/dev/null)"; then
  if echo "$CONDITION" | grep -q "'$OWNER'"; then
    ok "provider $PROVIDER admits tokens from $OWNER's repositories"
  else
    die "provider $PROVIDER exists with condition \"$CONDITION\", which does not admit $OWNER. Fix it, or pass another --provider"
  fi
else
  change "create OIDC provider $PROVIDER for $GITHUB_ISSUER, limited to $OWNER's repositories"
  [ "$DRY_RUN" = 1 ] || with_retry gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool "$POOL" "${POOL_ARGS[@]}" --display-name "GitHub Actions" \
    --issuer-uri "$GITHUB_ISSUER" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository_owner == '$OWNER'" --quiet
fi

# --- 4. deployer service account -------------------------------------------------------------
step "4. deployer service account"
SA_EXISTS=1
if gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT" >/dev/null 2>&1; then
  ok "$SA_EMAIL"
else
  change "create service account $SA_EMAIL"
  if [ "$DRY_RUN" = 1 ]; then SA_EXISTS=0; else
    gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT" \
      --display-name "$REPO deployer" --description "GitHub Actions in $REPO deploy as this account through OIDC; see provision-github-oidc.sh" --quiet
  fi
fi
MEMBER="serviceAccount:$SA_EMAIL"

# --- 5. project roles ------------------------------------------------------------------------
step "5. project roles"
[ ${#ROLES[@]} -gt 0 ] || echo "  (none given; pass --role or --roles-file for the roles the deploy uses)"
for role in ${ROLES[@]+"${ROLES[@]}"}; do
  if [ "$SA_EXISTS" = 1 ] && [ -n "$(gcloud projects get-iam-policy "$PROJECT" --flatten='bindings[].members' \
    --filter="bindings.role=$role AND bindings.members=$MEMBER" --format='value(bindings.role)')" ]; then
    ok "$role"
  else
    change "grant $role on $PROJECT"
    [ "$DRY_RUN" = 1 ] || with_retry gcloud projects add-iam-policy-binding "$PROJECT" \
      --member "$MEMBER" --role "$role" --condition=None --quiet --format=none
  fi
done

# --- 6. state bucket (optional) --------------------------------------------------------------
if [ -n "$STATE_BUCKET" ]; then
  step "6. state bucket gs://$STATE_BUCKET"
  BUCKET_EXISTS=1
  if gcloud storage buckets describe "gs://$STATE_BUCKET" --format='value(name)' >/dev/null 2>&1; then
    ok "gs://$STATE_BUCKET"
  else
    change "create gs://$STATE_BUCKET in $REGION (versioned, uniform access, public access prevented)"
    if [ "$DRY_RUN" = 1 ]; then BUCKET_EXISTS=0; else
      gcloud storage buckets create "gs://$STATE_BUCKET" --project "$PROJECT" --location "$REGION" \
        --uniform-bucket-level-access --public-access-prevention --quiet
      gcloud storage buckets update "gs://$STATE_BUCKET" --versioning --quiet
    fi
  fi
  if [ "$SA_EXISTS" = 1 ] && [ "$BUCKET_EXISTS" = 1 ] && [ -n "$(gcloud storage buckets get-iam-policy "gs://$STATE_BUCKET" \
    --flatten='bindings[].members' --filter="bindings.role=roles/storage.admin AND bindings.members=$MEMBER" \
    --format='value(bindings.role)')" ]; then
    ok "roles/storage.admin on gs://$STATE_BUCKET"
  else
    change "grant roles/storage.admin on gs://$STATE_BUCKET only"
    [ "$DRY_RUN" = 1 ] || with_retry gcloud storage buckets add-iam-policy-binding "gs://$STATE_BUCKET" \
      --member "$MEMBER" --role roles/storage.admin --format=none
  fi
fi

# --- 7. only this repository may impersonate the deployer ------------------------------------
step "7. $REPO may sign in as the deployer"
PRINCIPAL="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO"
if [ "$SA_EXISTS" = 1 ] && [ -n "$(gcloud iam service-accounts get-iam-policy "$SA_EMAIL" --project "$PROJECT" \
  --flatten='bindings[].members' --filter="bindings.role=roles/iam.workloadIdentityUser AND bindings.members=$PRINCIPAL" \
  --format='value(bindings.role)')" ]; then
  ok "roles/iam.workloadIdentityUser for $REPO"
else
  change "grant roles/iam.workloadIdentityUser on $SA_EMAIL to $PRINCIPAL"
  [ "$DRY_RUN" = 1 ] || with_retry gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
    --project "$PROJECT" --role roles/iam.workloadIdentityUser --member "$PRINCIPAL" --format=none
fi

WIP="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"

# --- 8. GitHub variables (optional) ----------------------------------------------------------
SA_VAR="GCP_DEPLOYER_SERVICE_ACCOUNT"
[ -n "$GH_VAR_SUFFIX" ] && SA_VAR="GCP_DEPLOYER_SA_$GH_VAR_SUFFIX"
if [ "$SET_GH_VARS" = 1 ]; then
  step "8. GitHub variables on $REPO (identifiers, not secrets)"
  command -v gh >/dev/null || die "gh is not installed" 3
  gh auth status >/dev/null 2>&1 || die "gh is not signed in. Ask the person to run: ! gh auth login" 3
  set_var() {
    change "gh variable $1=$2"
    [ "$DRY_RUN" = 1 ] || gh variable set "$1" --repo "$REPO" --body "$2"
  }
  set_var GCP_WORKLOAD_IDENTITY_PROVIDER "$WIP"
  set_var GCP_PROJECT_ID "$PROJECT"
  [ -n "$REGION" ] && set_var GCP_REGION "$REGION"
  set_var "$SA_VAR" "$SA_EMAIL"
else
  echo
  echo "Set these GitHub Actions variables on $REPO (or re-run with --set-gh-vars):"
  echo "  gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo $REPO --body $WIP"
  echo "  gh variable set $SA_VAR --repo $REPO --body $SA_EMAIL"
fi

echo
echo "$([ "$DRY_RUN" = 1 ] && echo 'dry run done' || echo 'done'). IAM can take up to about five minutes to take effect."
echo "WORKLOAD_IDENTITY_PROVIDER=$WIP"
echo "SERVICE_ACCOUNT=$SA_EMAIL"
