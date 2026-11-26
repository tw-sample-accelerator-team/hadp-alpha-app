# Architecture characteristics: Delivery Commercial Governance (release 1)

Sources: `docs/product/prd.md` (signed off for release 1), `docs/requirements/key-frs.md`, read with `docs/product/vision.md` and `docs/product/intent.md`.

These are the top seven characteristics, in priority order. Each has a measurable target and a way to check it, and lists the PRD sections and key FRs that call for it. "FR-n" means the key FR ids in `docs/requirements/key-frs.md`. "PRD AC-n.m" means the PRD's acceptance criteria. The AC-n ids below are this document's own.

Where the PRD leaves a value open (PRD §8), the target is written against test fixtures, as the key FRs do, and the open question is named.

## AC-1 Access isolation (security)

- **What:** every view, action and API call returns data only for accounts the signed-in user is entitled to. No unauthenticated access.
- **Target:** 0 requests return data from a non-entitled account, and 0 unauthenticated requests return any account data, across 100% of read and write endpoints.
- **How to check:** an automated test signs in as a user not entitled to the test account and calls every endpoint for that account directly (overview, gaps, suggestions, plans, actions, history, owned-actions list); every call is refused with no account data in the body, and the account is absent from the user's account list. The same suite runs with no credentials. An endpoint inventory check fails the build if any endpoint is not covered.
- **Traces to:** PRD §2 ("sees only the accounts they are entitled to"), §6 Access control, PRD AC-1.2; FR-1, FR-2, FR-13, FR-14.
- **Open:** sign-in method and entitlement source (PRD §8).

## AC-2 Read-only safety toward source data

- **What:** the system never changes project, staffing, grade, rate or financial data, and never calls a source system to write.
- **Target:** 0 write operations to any source system or to source-owned data, in 100% of plan save, plan update and action status flows. The runtime identity that reads source data holds read-only permissions only.
- **How to check:** the FR-12 snapshot test (snapshot seeded source data, save and update a plan, mark actions implemented, compare: no diff). A permission review of the service identity on Google Cloud shows no write role on source data. A static check fails the build if a source adapter exposes a write method.
- **Traces to:** PRD §4 out of scope items 1 and 2, §5.1 FR-5 / PRD AC-5.1, §6 Safety; FR-12.

## AC-3 Traceability and auditability of decisions

- **What:** every plan links its adopted recommendations, decision, owners, actions, targets and measured outcome, and decision records are kept for the account's history.
- **Target:** 100% of saved plans have an unbroken link chain recommendation -> decision -> action -> owner -> target -> outcome; 0 saved decision records are lost or silently overwritten (each change keeps who, when and what changed).
- **How to check:** an automated integrity check walks every saved plan on the seeded account and fails on any missing link. A test updates a saved plan and confirms the earlier decision record is still retrievable with author and timestamp. FR-17 and FR-18 history tests pass.
- **Traces to:** PRD §3 goals 2 and 4, §4 in scope items 4 and 6, §6 Traceability, PRD AC-4.5, AC-8.1, AC-8.2; FR-7, FR-11, FR-17, FR-18.
- **Open:** what may be edited after saving, and whether versions are kept (key FRs gap 10). The target assumes no record is lost.

## AC-4 Explainability

- **What:** every gap, cost driver and suggestion links to the project-level evidence behind it.
- **Target:** 100% of gaps, drivers and suggestions shown carry at least one evidence link, and 100% of those links resolve to the data of the specific project(s) that produce them.
- **How to check:** the FR-5 test follows every evidence link on the seeded test account; it fails on any item without a link or any link that does not open the matching project data. The API contract makes the evidence reference a required field, so a response without it fails schema validation.
- **Traces to:** PRD §5.1 FR-2 / PRD AC-2.1, §6 Explainability; FR-4, FR-5, FR-6.

## AC-5 Calculation correctness

- **What:** aggregate CGM, gap detection, actual improvement and unrealized improvement are computed exactly and the same way every time.
- **Target:** 100% of computed values on the seeded fixtures match the expected values (aggregate CGM, after minus before, target minus actual) within a rounding tolerance of 0.01 percentage points; gap and "not achieved" flags match the fixtures in 100% of cases.
- **How to check:** unit tests on the calculation module with fixture accounts for FR-1, FR-3, FR-15 and FR-16 (three-project aggregate; below-target, falling and stable accounts; executed, short-of-target and not-executed actions). The calculation code has no I/O, so it is tested in isolation.
- **Traces to:** PRD §3 goals 1 and 3, PRD AC-1.1, AC-2.1, AC-6.2, AC-7.1, AC-7.2; FR-1, FR-3, FR-15, FR-16, FR-18.
- **Open:** CGM formula, per-account target, "material" threshold, "falling" window, when "after" is measured (PRD §8).

## AC-6 Plan data integrity

- **What:** a plan is saved only when complete, and once saved it is kept exactly as entered.
- **Target:** 0 plans saved with an action lacking an owner or an expected CGM improvement target; 100% of saved plan fields read back unchanged after sign-out and sign-in; status updates change only the action updated.
- **How to check:** the FR-9 and FR-10 refusal tests (save refused, offending action named); the FR-8 and FR-11 round-trip tests; the FR-14 test that marking one action implemented leaves the others unchanged. Validation runs on the server, so a direct API call with a missing owner or target is also refused.
- **Traces to:** PRD §3 goal 2, PRD AC-4.2, AC-4.3, AC-4.4, AC-4.5, AC-6.1; FR-8, FR-9, FR-10, FR-11, FR-14.

## AC-7 Configurability of business rules

- **What:** the values the PRD leaves open can be set or changed without changing code.
- **Target:** the CGM per-account target, the "material" gap threshold, the "falling" window and the "after" measurement point are configuration values; changing any of them needs 0 code changes and 0 rebuilds. The suggestion source sits behind one interface, so replacing it (rules, model or both) touches only its adapter.
- **How to check:** a test changes each threshold in configuration and confirms that FR-3 and FR-16 results change accordingly with no rebuild. A dependency check confirms that only the suggestion adapter depends on the suggestion source.
- **Traces to:** PRD §8 open questions (CGM target, "material", "falling", how suggestions are produced, when "after" is measured), PRD AC-2.1, AC-3.1; FR-3, FR-6, FR-15, FR-16; key FRs gaps 1 to 4.

## Constraints (not characteristics)

- Runs on Google Cloud, project `alpha-dev-80ca`, region `us-central1` (PRD §7). Data and services stay in that region.
- Internal tool for Delivery Managers and CLT members (PRD §7). The PRD sets no load, latency or availability target, so none is set here; add one if the product owner names it.
