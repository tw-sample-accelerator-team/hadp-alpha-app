# Architecture characteristics: Delivery Commercial Governance (release 1)

Sources: `docs/product/prd.md` (signed off for release 1), `docs/requirements/key-frs.md`, with `docs/product/vision.md` and `docs/product/intent.md` as context.

This document lists the top architecture characteristics. There are at most seven. Each one gives:

- **Target:** a measurable value that passes or fails.
- **Check:** how to measure the target, and when.
- **Drivers:** the PRD sections and key FRs it comes from.

Naming:

- AC-1, AC-2, ... in this document are architecture characteristics.
- A PRD acceptance criterion is always cited as "PRD AC-n.m".
- "FR-n" means a key FR in `docs/requirements/key-frs.md`. A PRD requirement is cited as "PRD FR-n".

Where a target needs a value that PRD section 8 leaves open, the target says so. Examples are the CGM formula, the per-account target, the "material" and "falling" thresholds, and when "after" is measured. This document does not invent those values.

## Summary

| Id   | Characteristic                         | Target (short form)                                                                                         | Drivers                                       |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| AC-1 | Security: account entitlement          | 100% of account-scoped requests from non-entitled or anonymous callers refused, 0 bytes of account data returned | FR-2, FR-1, FR-7, FR-10; PRD 2, 6 Access control |
| AC-2 | Source-data safety (read-only)         | 0 write permissions to source data; 0 differences in the source-data snapshot after any plan or status operation | FR-9; PRD FR-5, 4 Out of scope, 6 Safety      |
| AC-3 | Traceability and auditability          | 100% of plan and status writes have who and when; 0 broken links from recommendation to outcome; 0 records deleted or overwritten | FR-6, FR-10, FR-13, FR-14; PRD 6 Traceability |
| AC-4 | Explainability                         | 100% of shown gaps, drivers and suggestions have at least one evidence link that opens a project in the same account | FR-3, FR-4, FR-5; PRD 6 Explainability        |
| AC-5 | Computational correctness              | 100% of reference fixture cases give the expected CGM, improvement, shortfall and outcome label           | FR-1, FR-3, FR-11, FR-12, FR-13; PRD 3        |
| AC-6 | Configurability of open business rules | Each open rule from PRD 8 changes in exactly 1 module or config value, with 0 changes to plan, history or UI code | FR-3, FR-5, FR-11, FR-12, FR-2; PRD 8         |
| AC-7 | Deployability on Google Cloud          | 1 pipeline run deploys from a clean commit; 100% of resources in `alpha-dev-80ca` / `us-central1`          | PRD 7 Constraints; intent                     |

## AC-1 Security: account entitlement

- **Why:** Every user is signed in and sees only the accounts they are entitled to. This applies to every view and every action, in the UI and in the API.
- **Target:**
  - 100% of account-scoped API routes refuse a caller who is not signed in.
  - 100% of account-scoped API routes refuse a signed-in caller who is not entitled to the account.
  - 0 bytes of the other account's data appear in a refused response.
  - 0 changes to the other account's data after a refused write.
  - An action owner's "my actions" list holds 0 actions from accounts they are not entitled to.
- **Check:** An automated authorization matrix test runs in CI on every commit. It covers every account-scoped route against three callers: entitled, signed in but not entitled, and anonymous. Pass if every cell matches the target. A new account-scoped route without a matrix entry fails the build.
- **Drivers:** FR-2 (non-entitled account is refused), FR-1 (entitled overview), FR-7 (owner's own list), FR-10 (status update refused for non-entitled users); PRD 2 "Every user is signed in and sees only the accounts they are entitled to"; PRD 5.1 AC-1.2; PRD 6 Access control.
- **Open:** How sign-in works and who grants entitlements (PRD 8). The target does not depend on the answer.

## AC-2 Source-data safety (read-only)

- **Why:** The system suggests, records and measures; people act. It must never change project, staffing or financial data.
- **Target:**
  - The runtime identity that reads source data holds 0 write, update or delete permissions on it.
  - A snapshot of the seeded source data shows 0 differences after creating a plan, updating it and marking actions implemented.
  - The codebase has 0 code paths that write to source data.
- **Check:**
  - In CI on every commit: an integration test takes the snapshot, runs the plan and status operations, and diffs the data. It also tries a write with the source-data credentials and passes only if the write is refused.
  - At deploy time: an IAM policy check on the source-data identity passes only if it grants read roles alone.
- **Drivers:** FR-9; PRD 5.1 FR-5, AC-5.1; PRD 4 Out of scope "Any automatic intervention" and "Editing project financial data"; PRD 6 Safety; intent "Never execute an intervention or operational change automatically".
- **Open:** Which source systems hold the data (PRD 8). The target applies to each one.

## AC-3 Traceability and auditability

- **Why:** Every plan links its recommendation, decision, owners, actions and measured outcome. Decision records are kept for the account's history, so the account can learn which measures work.
- **Target:**
  - 100% of plan saves, plan updates and action status changes store who made the change and when.
  - 0 broken links when following each adopted recommendation to its decision record, its actions, each action's owner and its outcome.
  - 0 decision records or status changes deleted or overwritten. A change adds a new record; the earlier one stays readable.
  - 100% of past plans stay retrievable after a newer plan is saved for the same account.
- **Check:** In CI on every commit: an integration test saves a plan, updates it, changes action statuses and saves a newer plan for the same account. It then walks every link from each recommendation and reads the full change history. Pass if every target holds. A schema or code review check confirms there is no delete or in-place update path for decision and status records.
- **Drivers:** FR-6 (decision record with who and when), FR-10 (status with who and when), FR-13 (history with status, owner and effect), FR-14 (links from recommendation to outcome; old plans retrievable); PRD 6 Traceability; PRD 5.3 AC-8.1; vision "every commercial decision on an account can be traced to its outcome".

## AC-4 Explainability

- **Why:** Users must be able to evidence the causes of a margin gap. Every gap, driver and suggestion links to the project-level evidence behind it.
- **Target:**
  - 100% of gaps, cost drivers and suggestions shown carry at least one evidence link.
  - 100% of evidence links open records of a project in the same account.
  - 0 evidence links that fail to open.
- **Check:** In CI on every commit: an API contract test for the gap, driver and suggestion responses fails if any item has no evidence reference. An integration test on the seeded gap account follows every link and passes only if each opens a project record in that account.
- **Drivers:** FR-4; FR-3 (gaps and drivers), FR-5 (suggestions); PRD 5.1 AC-2.1 "linked project-level evidence"; PRD 6 Explainability; PRD 1 "their causes are hard to evidence".

## AC-5 Computational correctness

- **Why:** Users decide and learn from the numbers the system shows: aggregate CGM, gaps, before-and-after effect, shortfall and the outcome of each measure. A wrong number leads to a wrong decision or a wrong lesson.
- **Target:**
  - 100% of reference fixture cases give the expected value for: aggregate CGM across all of an account's projects, gap detection (gap or no gap), before CGM, after CGM, actual improvement (after minus before), shortfall (target minus actual) and the not-achieved flag.
  - 100% of fixture measures get the expected outcome label: effective, not effective or not adopted.
  - Every computed value matches the fixture value at the precision the fixture states.
- **Check:** In CI on every commit: a table-driven unit test suite over a reference fixture set runs against the calculation module. It includes the cases in FR-1, FR-3, FR-11, FR-12 and FR-13. The fixture supplies the open values from PRD 8. Pass if every case matches.
- **Drivers:** FR-1 (aggregate CGM matches the computed value), FR-3 (gap detection), FR-11 (before, after, improvement, target), FR-12 (shortfall and flag), FR-13 (outcome labels); PRD 3 goals "Surface margin opportunities" and "Measure the real impact of commercial decisions".
- **Open:** The CGM formula and its precision, the per-account target, and the thresholds (PRD 8). The fixture supplies them; AC-6 keeps them changeable.

## AC-6 Configurability of open business rules

- **Why:** PRD section 8 leaves the core business rules open. The answers will arrive after the build starts. A change to one rule must not ripple through the plan, history and UI code.
- **Target:** Each of these rules lives behind exactly one module, port or config value:
  1. the CGM formula;
  2. the per-account CGM target;
  3. the "material" gap threshold;
  4. the "falling" window;
  5. when "after" is measured;
  6. how suggestions and their expected impact are produced;
  7. the source of project financial data and entitlements.

  Changing any one rule touches exactly 1 module or config value and 0 files in plan, execution, history or UI code. Tests can set each rule from a fixture.
- **Check:**
  - In CI on every commit: an architecture dependency test (for example an import rule check) fails if plan, execution, history or UI code depends on a rule's implementation instead of its port or config.
  - The test suite for AC-5 runs with at least two different fixture values for each of rules 1 to 5, and passes with both.
- **Drivers:** PRD 8 open questions; FR-3 (target, material, window), FR-5 (suggestion production), FR-11 and FR-12 ("after" point), FR-1 and FR-2 (data and entitlement source); key FRs note "The test fixture must supply that value".

## AC-7 Deployability on Google Cloud

- **Why:** The system must run on Google Cloud, in project `alpha-dev-80ca`, region `us-central1`. Iteration 0 is a hello world monorepo that must reach that environment, so later work lands on a working path.
- **Target:**
  - 1 pipeline run, with no manual step, builds, tests and deploys every app component from a clean commit on the main line.
  - 100% of deployed resources are in project `alpha-dev-80ca` and region `us-central1`.
  - 0 secret values in the repository or in build logs. Secrets are named by reference to a secret store.
- **Check:**
  - At iteration 0: the hello world components deploy through the pipeline, and each answers a health check in the target environment.
  - On every deploy: a check lists the deployed resources and fails if any is outside the target project or region.
  - In CI on every commit: a secret scan of the repository fails the build on a finding.
- **Drivers:** PRD 7 Constraints "Runs on Google Cloud, project `alpha-dev-80ca`, region `us-central1`"; intent "Run on Google Cloud".

## Considered and not selected

These were considered and left out, because the PRD gives no requirement or measure for them:

- **Performance and latency:** the PRD sets no response time. It is an internal tool for a small user group (PRD 7).
- **Scalability:** the PRD sets no user or data volume. Views stop at the account level (PRD 4 Out of scope).
- **Availability:** the PRD sets no uptime or recovery target.
- **Data freshness:** depends on the source refresh frequency, which is open (PRD 8). Revisit when it is answered.

If the product owner sets a target for any of these, it should be added here with its driver.
