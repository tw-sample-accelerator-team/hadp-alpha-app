# Architecture characteristics: Delivery Commercial Governance

Source: `docs/product/prd.md` (signed off for release 1) and `docs/requirements/key-frs.md`, with `docs/product/vision.md` and `docs/product/intent.md` as context.

Scope: iteration 0. Each characteristic below comes from the PRD or a key FR. None is added on general grounds.

Naming: here, **AC-n** means *architecture characteristic n*. The PRD's acceptance criteria keep their own form, **AC-x.y** (for example PRD AC-1.2). **FR-n** means a key FR from `key-frs.md`. **PRD FR-n** means the PRD's own numbering.

## Summary

| Id   | Characteristic                         | Measurable target (short)                                                         | Driven by                                   |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| AC-1 | Security: entitlement isolation        | 100% of data endpoints refuse requests with no sign-in or no entitlement; 0 leaks | §2, §6 Access control; FR-2, FR-11, FR-13   |
| AC-2 | Safety: read-only toward source data   | 0 write calls to any source system; source credentials are read-only              | §4 Out of scope, §6 Safety; FR-12           |
| AC-3 | Traceability and auditability          | 100% of plans hold the full link chain; 100% of changes record who and when       | §3 Goals 2-4, §6 Traceability; FR-11, FR-14, FR-19, FR-20 |
| AC-4 | Explainability: evidence linkage       | 100% of gaps, drivers and suggestions have a working evidence link                | §6 Explainability; FR-5, FR-6               |
| AC-5 | Calculation correctness                | 100% of seeded cases match hand-worked values to 0.01 percentage points           | §3 Goals 1 and 3; FR-1, FR-3, FR-4, FR-15 to FR-18 |
| AC-6 | Configurability of business rules      | Each open rule parameter changes by configuration alone, with no code change      | §8 Open questions; FR-3, FR-4, FR-6, FR-10, FR-16, FR-17 |

Six characteristics. Performance, scalability and availability are left out: the PRD sets no target for them, and the product is an internal tool (§7).

## AC-1 Security: entitlement isolation

- **What it means:** Every view and every action returns data only for accounts the signed-in user is entitled to. A user who is not signed in gets nothing.
- **Measurable target:**
  - 100% of API endpoints that return or change account data refuse a request with no sign-in (HTTP 401) and a request for a non-entitled account (HTTP 403 or 404), and return none of that account's data.
  - 0 cross-account records in list responses (account list, "my actions", history) for a user with partial entitlements.
  - The entitlement check is enforced on the server for every request. It is never enforced only in the UI.
- **How to check:** An automated authorization test suite lists every data endpoint (taken from the API route table, so a new endpoint without a test fails the build). It calls each one as (a) a user who is not signed in, (b) a user not entitled to the seeded account, (c) an entitled user. Only (c) gets data. The suite runs in CI on every change.
- **Driven by:** PRD §2 ("sees only the accounts they are entitled to"), §6 Access control, PRD AC-1.2; key FR-2, FR-11 (second user can open, non-entitled cannot), FR-13 ("my actions" only across entitled accounts).
- **Open:** PRD §8 Q5 (how sign-in works, who grants entitlements) and Q2 (where entitlements come from). The check above holds whatever the answer.

## AC-2 Safety: read-only toward source data

- **What it means:** The system suggests, records and measures. It never changes project, staffing, grade, rate or financial data in any source system.
- **Measurable target:**
  - 0 write, update or delete calls from the system to any source system, across all plan and action flows.
  - The source-data integration exposes read operations only. The credentials it uses grant read-only access.
  - The system writes only to its own store (plans, decision records, action status).
- **How to check:** (a) A contract test runs the FR-12 flow (save a plan, update it, mark every action implemented) against a test double of each source system. The double records 0 write calls, and a snapshot of source data before and after is identical. (b) A static check confirms the source-integration port defines no write methods. (c) A review of the deployed service account confirms read-only roles on source data.
- **Driven by:** PRD §4 Out of scope (automatic intervention; editing project financial data), §6 Safety, PRD FR-5 / AC-5.1; key FR-12; intent ("the system suggests, records and measures; people act").

## AC-3 Traceability and auditability

- **What it means:** Every plan links its adopted recommendations, decision, owners, actions, target and measured outcome. Every change to a plan or an action status is recorded with who made it and when. Decision records stay in the account's history.
- **Measurable target:**
  - 100% of saved plans can be traversed from recommendation to decision, owners, actions, target and outcome, with no missing link.
  - 100% of plan saves, plan updates and status changes record the user id and a UTC timestamp.
  - 0 decision records or status-change records deleted or overwritten. A change adds a new record; it does not replace the old one.
- **How to check:** (a) A data integrity test saves seeded plans and checks each link is present and resolves (database foreign keys plus a test that walks the chain). (b) The FR-14 test checks that the status shows who changed it and when. (c) A test updates a plan and a status twice and checks that all earlier records remain readable in the history (FR-19).
- **Driven by:** PRD §6 Traceability, §3 Goals 2, 3 and 4, PRD AC-4.5, AC-8.1; key FR-11, FR-14, FR-19, FR-20; vision ("every commercial decision on an account can be traced to its outcome").
- **Open:** key-FRs open point 15 (what may change after save, and whether changes are versioned). The append-only target above keeps both answers possible.

## AC-4 Explainability: evidence linkage

- **What it means:** Every highlighted gap, every cost driver and every suggestion links to the project-level evidence behind it.
- **Measurable target:**
  - 100% of gaps, drivers and suggestions returned by the API carry at least one evidence reference (project id and cost line or record id).
  - 0 evidence links that fail to resolve to a project record the user is entitled to see.
  - A driver or suggestion without evidence is not shown.
- **How to check:** An automated test on seeded accounts with known causes (FR-5, FR-6) checks that every driver and suggestion in the response has an evidence reference, and that following each reference returns the expected project and cost line. The API schema marks the evidence field as required, so a response without it fails schema validation.
- **Driven by:** PRD §6 Explainability, PRD AC-2.1, AC-3.1; key FR-5, FR-6.

## AC-5 Calculation correctness

- **What it means:** The figures users govern by (account CGM, gap size, falling trend, actual against planned, before and after, unrealized gap) are right and repeatable.
- **Measurable target:**
  - 100% of seeded test cases match the hand-worked value to within 0.01 percentage points, for: account CGM aggregation (FR-1), gap size (FR-3), falling detection (FR-4), actual against target (FR-15), before, after and actual improvement (FR-16), not-achieved flag (FR-17), unrealized gap (FR-18).
  - The same inputs and configuration give the same outputs on every run.
  - All CGM calculation lives in one module with unit tests. No other component computes CGM.
- **How to check:** A table-driven test suite of seeded accounts (the "seeded account" of the key FRs) runs in CI and compares each computed figure with its expected value. Line coverage of the calculation module is at least 90%.
- **Driven by:** PRD §3 Goals 1 and 3 (gaps shown; actual against planned CGM, before and after, including unrealized improvement); key FR-1, FR-3, FR-4, FR-15, FR-16, FR-17, FR-18.
- **Open:** PRD §8 Q1 (CGM formula and target). The tolerance and test design hold whatever formula is chosen; the expected values are filled in once it is.

## AC-6 Configurability of business rules

- **What it means:** The PRD leaves several business rules open. They must be settings, not hard-coded values, so the answers can be applied without rework.
- **Measurable target:**
  - Each of these is set by configuration, with no code change: CGM target per account, materiality threshold for a gap, window for "falling", the "after" measurement point, and the rules that produce suggestions and their expected impact.
  - A change to any of them takes effect after a configuration update and a restart at most, with no new build.
  - Each parameter has one place where it is defined, with its current value visible to an administrator.
- **How to check:** A test runs the FR-3, FR-4 and FR-17 checks twice with two different configured values (for example threshold 1 point and 3 points) and gets the expected different results, with the same build. A code search finds no literal value for these parameters outside the configuration module.
- **Driven by:** PRD §8 Open questions 1, 3, 4 and 6; key FRs "Terms used in checks" (checks use the configured value); key FR-3, FR-4, FR-6, FR-10, FR-16, FR-17; key-FRs open points 1, 3, 4, 6 and 7.

## Constraints that bound these characteristics

These are fixed by the PRD and are not characteristics to trade off:

- Runs on Google Cloud, project `alpha-dev-80ca`, region `us-central1` (PRD §7).
- Internal tool for Delivery Managers and CLT members (PRD §7).
- Account level only; no portfolio or company-wide views (PRD §4 Out of scope).
