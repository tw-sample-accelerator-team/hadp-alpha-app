# Architecture characteristics: Delivery Commercial Governance (release 1)

Sources: `docs/product/prd.md` (signed off for release 1) and `docs/requirements/key-frs.md`, with `docs/product/vision.md` and `docs/product/intent.md` as context.

Naming: AC-n in this file is an **architecture characteristic**. The PRD's acceptance criteria use the form AC-n.m (for example AC-1.2) and are always written with the dot.

Scope: iteration 0 (release 1 as scoped in PRD 4). Every target below comes from a PRD statement or a key FR check. Nothing is added beyond them. The PRD sets no latency, load or availability figure, so none is set here (see "Left out on purpose").

## Summary

| Id   | Characteristic                         | Target (short)                                                                 | Driven by                                   |
| ---- | -------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| AC-1 | Security: account entitlement isolation | 100% of UI and API routes enforce entitlement; 0 account data in denied replies | FR-1 (AC-1.2), all FRs; PRD 2, 6 Access control |
| AC-2 | Safety: read-only toward source data    | 0 write operations toward project, staffing or financial sources               | FR-5 (AC-5.1); PRD 4 Out of scope, 6 Safety  |
| AC-3 | Traceability and auditability           | 100% of saved plans carry the full link chain; 0 decision records lost         | FR-4, FR-6, FR-8; PRD 3, 6 Traceability      |
| AC-4 | Explainability                          | 100% of gaps, drivers and suggestions link to resolvable project evidence      | FR-2, FR-3; PRD 6 Explainability             |
| AC-5 | Computational correctness               | Every CGM figure matches an independent reference calculation on seeded data   | FR-1, FR-6, FR-7, FR-8; PRD 3                |
| AC-6 | Modifiability of the CGM rules          | Open rules change in one module, with no change to any other component         | FR-1, FR-2, FR-3, FR-6, FR-8; PRD 8          |
| AC-7 | Deployability on the fixed platform     | 100% of components deploy from the repo to `alpha-dev-80ca` / `us-central1`    | PRD 7 Constraints; intent                    |

## AC-1 Security: account entitlement isolation

- **Why:** every user is signed in and sees only the accounts they are entitled to; every view and action is limited to those accounts.
- **Trace:** PRD 2 (last line); PRD 6 Access control; FR-1 AC-1.2; key FR-1 check 2; applies to every FR that reads or writes account data (FR-1 to FR-8).
- **Target:**
  - 100% of UI routes and API endpoints that return or change account data check the caller's sign-in and entitlement on the server side.
  - 0 bytes of account or project data in any denied response (UI and API).
  - 0 anonymous access to any account data route.
- **How to check:** an automated test per endpoint calls it as (a) no sign-in, (b) a signed-in user with no entitlement to the account, (c) an entitled user. (a) and (b) are denied and the body holds no account or project fields; (c) succeeds. A route inventory test fails when a new account data route has no entitlement test.

## AC-2 Safety: read-only toward source data

- **Why:** the system suggests, records and measures; people act. It never executes an intervention and never edits project financial data.
- **Trace:** FR-5 AC-5.1; PRD 4 Out of scope bullets 1 and 2; PRD 6 Safety; intent bullet 4; key FR-5 check.
- **Target:**
  - 0 write, update or delete operations toward project, staffing or financial source data, in code and at runtime.
  - The identity the system uses for source data holds read-only permissions only.
  - Plans, decisions and statuses are stored apart from source data.
- **How to check:** (1) the key FR-5 snapshot test: snapshot source data, create, update and complete a plan, diff shows 0 changes. (2) A static check over the source data adapter finds only read operations. (3) A permissions check on the source data identity shows no write grant.

## AC-3 Traceability and auditability

- **Why:** every plan links its recommendation, decision, owners, actions and measured outcome, and decision records are kept for the account's history so the account can learn what works.
- **Trace:** PRD 6 Traceability; PRD 3 Goals "Turn recommendations into owned decisions" and "Learn what works"; FR-4 AC-4.1 to AC-4.5; FR-6 AC-6.1; FR-8 AC-8.1, AC-8.2; key FR-4 checks 1 and 2, key FR-8 check.
- **Target:**
  - 100% of saved plans link to their adopted suggestions, decision record, actions, one owner per action, a CGM improvement target and the measured outcome once measured.
  - 0 saved plans with an action that has no owner, or with no target (save is rejected).
  - 0 decision records deleted or lost: a saved decision record reads back field for field, for the life of the account's history.
  - Every status change is recorded with who made it and when.
- **How to check:** the key FR-4 round-trip test reads back every field unchanged; the key FR-4 rejection test refuses incomplete plans; a data integrity query finds 0 plans with a broken link; the key FR-8 history test lists each entry with links back to its recommendation and decision; a status change test shows actor and timestamp.

## AC-4 Explainability

- **Why:** every gap, driver and suggestion must link to the project-level evidence behind it, so users can evidence the cause of a margin gap.
- **Trace:** PRD 6 Explainability; PRD 1 Problem ("causes are hard to evidence"); FR-2 AC-2.1; FR-3 AC-3.1; key FR-2 check 2, key FR-3 check.
- **Target:**
  - 100% of displayed gaps, cost drivers and suggestions carry at least one evidence link.
  - 100% of evidence links resolve to the specific project records behind the item (0 broken links).
  - 100% of suggestions have a named change and an expected CGM impact value.
- **How to check:** on seeded accounts, an automated test walks every gap, driver and suggestion, follows each evidence link and asserts it returns the seeded project records; it asserts every suggestion's three parts are non-empty.

## AC-5 Computational correctness

- **Why:** the product's value is measuring real impact; aggregated CGM, gaps, before-and-after values, shortfalls and effectiveness labels must be right or decisions are made on wrong numbers.
- **Trace:** PRD 3 Goals "Surface margin opportunities" and "Measure the real impact"; FR-1 AC-1.1; FR-2 AC-2.1; FR-6 AC-6.2; FR-7 AC-7.1, AC-7.2; FR-8 AC-8.2; key FR-1 check 1, FR-2 check 1, FR-6 check 2, FR-7 check, FR-8 check.
- **Target:**
  - 100% of the account's projects are included in its aggregate (N of N).
  - Every CGM, improvement and shortfall value equals an independent reference calculation on the same seeded data, to the display precision (exact match once rounded).
  - Shortfall = target minus actual improvement, exactly, on every plan.
  - 100% of seeded measures get the correct label (effective, not effective, not adopted) and the correct gap or no-gap result.
- **How to check:** the key FR checks named above run as automated tests against seeded data with known results. The calculation is a pure function with unit tests over a table of reference cases. Until PRD 8 defines CGM, materiality, "falling" and "after", the reference cases use placeholder rules held in one place (see AC-6).

## AC-6 Modifiability of the CGM rules

- **Why:** the PRD leaves open how CGM is calculated, the per-account target, what makes a gap material, the "falling" window, how suggestions and their impact are produced, and when "after" is measured. These rules will change after iteration 0 and must not ripple through the system.
- **Trace:** PRD 8 Open questions bullets 1, 3, 4 and 6; key FRs "Gaps and ambiguities" items 1 to 5; driven FRs FR-1, FR-2, FR-3, FR-6, FR-7, FR-8.
- **Target:**
  - The CGM formula, targets, materiality threshold, falling window, "after" point, effectiveness threshold and suggestion rules sit behind one domain module with a single interface.
  - Changing any one of these rules touches only that module (and its tests or configuration): 0 changes to UI, API, persistence or source data adapters.
  - Thresholds and windows are configuration values, not literals spread through the code.
- **How to check:** an architecture test (dependency rule) asserts no other module holds CGM rule logic; a review of a sample rule change (for example a new materiality threshold) shows a diff limited to the rule module and its configuration and tests.

## AC-7 Deployability on the fixed platform

- **Why:** the system must run on Google Cloud in a given project and region.
- **Trace:** PRD 7 Constraints; intent bullet 7.
- **Target:**
  - 100% of deployable components and data stores run in GCP project `alpha-dev-80ca`, region `us-central1`.
  - Each component builds and deploys from the repository by an automated pipeline, with no manual step.
  - 0 secrets stored in the repository; secrets are referenced by name from the platform's secret store.
- **How to check:** the pipeline deploys each component and a post-deploy smoke test reaches it; an inventory of deployed resources shows only `alpha-dev-80ca` / `us-central1`; a secret scan of the repository finds nothing.

## Left out on purpose

- **Performance, scalability, availability:** the PRD gives no latency, volume or uptime figure, and the tool is internal for DMs and CLT members (PRD 7). Setting numbers here would go beyond the PRD; they should be added once the source systems and user numbers are known (PRD 8 bullet 2).
- **Data freshness / interoperability with source systems:** source systems and refresh frequency are open (PRD 8 bullet 2). AC-2 covers the read-only rule; a freshness target waits on that answer.
- **Sign-in method:** open (PRD 8 bullet 5). AC-1 fixes the outcome (server-side entitlement on every route) without choosing a mechanism.
