# Architecture characteristics: Delivery Commercial Governance (release 1)

Sources: `docs/product/prd.md` (signed off for release 1), `docs/requirements/key-frs.md`, with `docs/product/intent.md` and `docs/product/vision.md` for context.

Naming: in this file `AC-n` means an **architecture characteristic**. The PRD uses `AC-n.m` for acceptance criteria; those are cited here as "PRD AC-n.m" to keep the two apart. FR ids (`FR-n`, `FR-n.m`) are the ids in `key-frs.md`.

Each characteristic has a measurable target, a way to check it, and the PRD sections and FRs it comes from. All targets apply to iteration 0 onwards; a check that depends on an open PRD value (PRD section 8) runs against the value set in test configuration.

## Summary

| Id   | Characteristic                         | Target (short)                                                                     | Driven by                                                        |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AC-1 | Security: entitlement isolation        | 0 account data returned to a non-entitled or signed-out caller, on 100% of endpoints | PRD 2, PRD 6 Access control, PRD AC-1.2; FR-1.3, FR-1.4, FR-1.5, FR-6.1, FR-8.5 |
| AC-2 | Safety: read-only toward source data   | 0 write paths to project, staffing or financial data                               | PRD 4 Out of scope, PRD 5.1 FR-5, PRD 6 Safety; FR-5.1 to FR-5.3 |
| AC-3 | Traceability and auditability          | 100% of plans fully linked; 0 decision records lost or overwritten                 | PRD 3, PRD 6 Traceability; FR-4.5, FR-4.6, FR-6.2, FR-8.1 to FR-8.4 |
| AC-4 | Explainability                         | 100% of gaps, drivers and suggestions link to at least one project record          | PRD 6 Explainability, PRD AC-2.1; FR-2.4, FR-2.5, FR-3.1, FR-3.3 |
| AC-5 | Computational correctness              | 100% of seeded fixtures match hand-computed values exactly (to stated precision)   | PRD 3, PRD AC-1.1, AC-6.2, AC-7.2; FR-1.1, FR-2.1, FR-6.4, FR-6.5, FR-7.3, FR-8.3 |
| AC-6 | Configurability of business rules      | 0 code changes to change any open business rule value                              | PRD 8; key-frs Open points 1 to 4, 7, 8, 11                      |
| AC-7 | Deployability on the mandated platform | 100% of runtime resources in `alpha-dev-80ca` / `us-central1`, deployed by pipeline | PRD 7 Constraints; intent bullet 7                              |

## AC-1 Security: entitlement isolation

Every view and action is limited to accounts the signed-in user is entitled to, and no account data is served before sign-in.

- **Target:** 0 account-scoped values returned to a caller that is signed out or not entitled to that account, across 100% of account-scoped UI routes and API endpoints. Account lists and "my actions" lists equal the caller's entitlements exactly.
- **Check:** an automated entitlement test matrix (signed out, entitled to A only, entitled to B only) runs against every account-scoped endpoint, including direct URL/API calls, on every build. Pass means every non-entitled call gets an access-denied result with no account values in the body. A route inventory test fails the build if an account-scoped endpoint is not in the matrix.
- **Driven by:** PRD 2 ("sees only the accounts they are entitled to"), PRD 6 Access control, PRD AC-1.2; FR-1.3, FR-1.4, FR-1.5, FR-6.1, FR-8.5.

## AC-2 Safety: read-only toward source data

The CGM Coach suggests, records and measures; it never changes project, staffing or financial data.

- **Target:** 0 API endpoints or screens that accept a change to project financials, staffing, grades or rates; 0 write permissions on source data held by the CGM Coach's runtime identity; source-data snapshots identical before and after every plan save and action update.
- **Check:** (1) an IAM/permission review of the runtime identity lists no write grant on any source data store; (2) an endpoint inventory test asserts no mutating endpoint targets source data; (3) the FR-5.1 and FR-5.2 snapshot comparisons pass on every build.
- **Driven by:** PRD 4 Out of scope (no automatic intervention, no editing of project financial data), PRD 5.1 FR-5 / AC-5.1, PRD 6 Safety, intent bullet 4; FR-5.1, FR-5.2, FR-5.3.

## AC-3 Traceability and auditability

Every plan links its recommendation, decision, owners, actions and measured outcome, and decision records are kept for the account's history.

- **Target:** 100% of saved actions link to the suggestion they came from, to one owner and to their plan; 100% of saved plans hold their decision record (adopted and not-adopted suggestions, decider, time) and baseline CGM; 100% of status changes record who and when; 0 decision records or status-change entries deleted or overwritten (history is append-only).
- **Check:** a referential-integrity check over the store reports 0 orphaned or unlinked actions, plans or outcomes; an automated test that updates a plan and an action asserts prior versions and status entries are still readable; FR-4.5, FR-4.6, FR-6.2 and FR-8.1 pass.
- **Driven by:** PRD 3 ("Turn recommendations into owned decisions", "Learn what works"), PRD 6 Traceability, vision ("every commercial decision on an account can be traced to its outcome"); FR-4.3, FR-4.5, FR-4.6, FR-6.2, FR-8.1, FR-8.2, FR-8.3, FR-8.4.

## AC-4 Explainability

Every gap, driver and suggestion links to the project-level evidence behind it.

- **Target:** 100% of highlighted gaps, named cost drivers and suggestions carry at least one evidence link, and 100% of those links resolve to an existing project-level record of the same account.
- **Check:** an automated test over the seeded accounts walks every gap, driver and suggestion, follows each evidence link, and asserts it resolves to the seeded project records that cause it (FR-2.5, FR-3.3). Any item with no link, or a link that does not resolve, fails the build.
- **Driven by:** PRD 6 Explainability, PRD AC-2.1 ("linked project-level evidence"), PRD 3 ("gaps, drivers and project evidence"); FR-2.4, FR-2.5, FR-3.1, FR-3.3.

## AC-5 Computational correctness

The aggregated CGM, gaps, before-and-after comparisons, shortfalls and effectiveness labels are the core output; they must be exactly right.

- **Target:** 100% of seeded test fixtures produce values equal to the hand-computed values: account CGM (FR-1.1), gap size (FR-2.1), actual improvement (FR-6.4), the four comparison values (FR-6.5), shortfall (FR-7.3) and effective / not effective labels (FR-8.3). Tolerance: exact at the displayed precision (0 rounding mismatches; no binary floating-point drift in money or percentage values).
- **Check:** a fixture-based calculation test suite runs on every build against the seeded test accounts and the configured rule values; any mismatch fails the build. The history view values are asserted equal to the plan view values (FR-8.2).
- **Driven by:** PRD 3 (all four measures), PRD AC-1.1, AC-6.2, AC-7.2, AC-8.2; FR-1.1, FR-2.1, FR-2.2, FR-6.4, FR-6.5, FR-7.3, FR-8.2, FR-8.3.

## AC-6 Configurability of business rules

The PRD leaves the business rules open (PRD 8). They must be settable without changing code, so the open points can be settled without rework and the checks can run against configured values.

- **Target:** 0 code changes and 0 rebuilds needed to change any of: CGM formula parameters, per-account CGM target, materiality threshold, "falling" window, "after" measurement point, plan-level vs action-level target, unrealized-improvement trigger, and the "effective" rule. Each value is held in one place and read from configuration.
- **Check:** for each listed rule, a test changes the configured value and asserts the affected FR result changes accordingly (for example raising the materiality threshold removes a gap flag in FR-2.1), with no code edit. A code scan finds no hard-coded literal for these values outside the configuration defaults.
- **Driven by:** PRD 8 Open questions; key-frs "Terms used in the checks" and Open points 1, 2, 3, 4, 7, 8, 11; FR-2.1, FR-2.2, FR-4.4, FR-6.4, FR-7.1, FR-7.2, FR-8.3.

## AC-7 Deployability on the mandated platform

The system runs on Google Cloud in a fixed project and region.

- **Target:** 100% of runtime resources (compute, data stores, secrets references, networking) are in GCP project `alpha-dev-80ca`, region `us-central1` (or global resources owned by that project); 100% of deployments go through the automated pipeline from the repository, with 0 manual console changes.
- **Check:** a resource inventory of the project, run after each deployment, lists no resource outside `us-central1` (other than global resources) and no resource outside `alpha-dev-80ca`; infrastructure-as-code drift detection reports 0 drift.
- **Driven by:** PRD 7 Constraints ("Runs on Google Cloud, project `alpha-dev-80ca`, region `us-central1`"), intent bullet 7.

## Considered and not selected

These were considered and left out because the PRD gives no driver or number for them in release 1. They should be revisited when the PRD sets one.

- **Performance / latency:** no response-time target in the PRD. Users are a small internal group (PRD 7).
- **Scalability / elasticity:** internal tool for Delivery Managers and CLT members (PRD 7); no load figures; no views above account level (PRD 4).
- **Availability:** no uptime target in the PRD.
- **Data freshness / integration:** source systems and refresh frequency are open (PRD 8, key-frs Open point 5); a target cannot be set until they are known.
