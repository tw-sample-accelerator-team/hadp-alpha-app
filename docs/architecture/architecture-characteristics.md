# Architecture characteristics: Delivery Commercial Governance (release 1)

Source: the signed-off PRD at `docs/product/prd.md` and the key FRs at `docs/requirements/key-frs.md`, read with `docs/product/vision.md` and `docs/product/intent.md`. Each characteristic below names the PRD goals, PRD sections and FR ids that drive it. It also gives a measurable target and how to check that target.

The list is capped at seven and ordered by priority. All targets apply from iteration 0. The hello world monorepo must have a check for each one in place, even where that check only covers a placeholder at first.

Where a PRD open question (PRD §8) affects a target, the characteristic says so. These characteristics do not answer the open questions.

## Summary

| AC   | Characteristic                         | Driven by (FR ids)                          | Target in one line                                                                 |
| ---- | -------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| AC-1 | Security: entitlement isolation        | FR-2, FR-3, FR-14                           | 100% of account-scoped calls refuse unsigned or non-entitled callers; 0 bytes leak |
| AC-2 | Safety: read-only toward source data   | FR-13                                       | 0 write paths and 0 write permissions to project, staffing or financial data       |
| AC-3 | Traceability and auditability          | FR-8, FR-9, FR-10, FR-11, FR-12, FR-17, FR-18 | 100% of saved plans carry the full decision-to-outcome chain; 0 records lost or overwritten |
| AC-4 | Explainability                         | FR-5, FR-6, FR-7                            | 100% of gaps, drivers and suggestions link to evidence that matches source figures |
| AC-5 | Computational correctness              | FR-1, FR-4, FR-15, FR-16, FR-18             | Every CGM figure, flag and status equals the fixture result, within 0.01 points    |
| AC-6 | Modifiability of business rules and sources | FR-1, FR-4, FR-7, FR-15, FR-2, FR-3 (via PRD §8 Q1-Q6) | Each open-question rule or source changes in one module plus its tests |
| AC-7 | Testability                            | FR-1 to FR-18                               | 100% of key FRs have an automated acceptance test on seeded fixtures, run on every push |

## AC-1 Security: entitlement isolation

- Driven by: PRD §2 ("Every user is signed in and sees only the accounts they are entitled to"); PRD §6 Access control; FR-2, FR-3, FR-14 (an owner cannot change another owner's action).
- Why it matters: every view and action is account-scoped. A leak would expose one account's commercial data to people who are not entitled to see it.
- Target:
  - 100% of account-scoped endpoints (overview, signals, suggestions, plan save and edit, action status update, history) refuse a call that has no signed-in user.
  - 100% of the same endpoints refuse a signed-in user who has no entitlement to the requested account.
  - Refused responses contain 0 bytes of the requested account's data.
  - 100% of action status updates by a user who does not own the action are refused (FR-14).
  - The check is enforced on the server for every request. A hidden UI control does not count.
- How to check: an automated authorization matrix test, run in CI on every push. It enumerates every account-scoped route and calls each one three ways: (a) with no session, (b) as a user entitled to a different account, (c) as a non-owner for action updates. Every call must be refused with no account payload. A route that is not in the matrix fails the build, so new routes cannot skip the check.
- Open question: PRD §8 Q5 (how sign-in works, who grants entitlements). The target holds whatever identity provider is chosen. Tests seed entitlements directly.

## AC-2 Safety: read-only toward source data

- Driven by: PRD §5.1 FR-5, AC-5.1; PRD §4 Out of scope items 1 and 2; PRD §6 Safety; intent ("the system suggests, records and measures; people act"); FR-13.
- Why it matters: the CGM Coach must never change staffing, grades, rates or financial data, neither by itself nor because a user saved or updated a plan.
- Target:
  - 0 code paths that write to project, staffing or financial source data.
  - 0 write permissions to those sources for the service's runtime identity. It holds read-only access only.
  - The CGM Coach's own store (plans, actions, decision records) is separate from the source data. It is the only place the system writes.
  - After saving a plan, editing it and marking every action implemented, the source data is byte-for-byte the same as before (FR-13 check).
- How to check: (a) the FR-13 snapshot test in CI; (b) an architecture test that fails the build if a source-data adapter exposes any write operation; (c) an IAM policy review of the runtime service account in `alpha-dev-80ca` that shows read-only roles on source data.
- Open question: PRD §8 Q2 (where project financial data come from). The target holds for whatever source is chosen.

## AC-3 Traceability and auditability

- Driven by: PRD §3 Goal 2 (owned decisions), Goal 4 (learn what works); PRD §6 Traceability; vision ("every commercial decision on an account can be traced to its outcome"); FR-8, FR-9, FR-10, FR-11, FR-12, FR-17, FR-18.
- Why it matters: the value of the product is the link from suggestion to decision to action, owner and measured outcome. A broken or lost link breaks the learning loop.
- Target:
  - 100% of saved plans hold every link in the chain: adopted suggestions, decider, decision time, actions with intended changes, one owner per action, CGM improvement target, and, once measured, the before-and-after outcome.
  - 100% of actions link to the suggestion they came from (FR-12).
  - A save that would break the chain (an action with no owner, a plan with no target) is refused every time (FR-10, FR-11).
  - 0 decision records are deleted or silently overwritten. An edit to a plan keeps the earlier version with who changed it and when.
  - Decision records are kept for the life of the account's history. No automatic expiry in release 1.
- How to check: (a) the FR-10, FR-11, FR-12, FR-17 and FR-18 acceptance tests; (b) a data integrity test that loads every seeded plan and asserts every link resolves; (c) a test that edits a plan and asserts the earlier version and its change record are still readable.

## AC-4 Explainability

- Driven by: PRD §6 Explainability; PRD §3 Goal 1 ("gaps, drivers and project evidence"); PRD §5.1 AC-2.1, AC-3.1; FR-5, FR-6, FR-7.
- Why it matters: DMs and CLT members must be able to defend a decision with evidence. A gap or suggestion that cannot be traced to project figures cannot be trusted.
- Target:
  - 100% of highlighted gaps, cost drivers and suggestions carry an evidence link (0 without one).
  - 100% of evidence links open the project or projects and the figures that produced the item, and those figures equal the source data.
  - 100% of suggestions carry a non-empty change and an expected CGM impact value (FR-7).
- How to check: the FR-6 and FR-7 acceptance tests on seeded accounts. They follow every evidence link and compare the figures with the seed data. An API contract test asserts the evidence and impact fields are required in every gap, driver and suggestion response.
- Open question: PRD §8 Q4 (how suggestions and impact are produced). The target covers the evidence and fields, not the method.

## AC-5 Computational correctness

- Driven by: PRD §3 Goals 1 and 3 (surface opportunities; measure real impact); FR-1 (account aggregate), FR-4 (below-target or falling), FR-15 (before-and-after), FR-16 (unrealized improvement), FR-18 (effective, not effective, not adopted).
- Why it matters: decisions and the governance history rest on these figures. A wrong aggregate, a missed gap or a wrong "improvement not achieved" flag misleads the account.
- Target:
  - Every CGM figure the system shows (account aggregate, before, after, actual improvement, shortfall) equals the result of the reference calculation on the same fixture, within 0.01 percentage points.
  - 100% agreement with the fixture on every classification: gap highlighted or not (FR-4), improvement achieved or not (FR-16), and measure effective, not effective or not adopted (FR-18).
  - Calculations are deterministic: the same inputs give the same outputs on every run.
- How to check: unit tests of the calculation module against a table of fixture cases, including the FR-1, FR-4, FR-15 and FR-16 examples (for example, before 30%, after 31.5%, target +2.0 gives actual +1.5, a 0.5-point shortfall and the flag). These run in CI on every push.
- Open question: PRD §8 Q1 (CGM formula and target), Q3 (materiality and falling window), Q6 (when "after" is measured). Tests use fixture values until the product owner answers.

## AC-6 Modifiability of business rules and sources

- Driven by: PRD §8 open questions Q1 to Q6, which sit under FR-1, FR-4, FR-7, FR-15 (CGM formula, target, materiality, falling window, suggestion method, "after" date) and FR-2, FR-3 (data source, sign-in, entitlements).
- Why it matters: the PRD is signed off with six open questions. Their answers will arrive after build starts. The design must take them without rework across the codebase.
- Target:
  - Each of these can be changed by editing one module or one configuration entry, plus its tests, with no change to any other module: the CGM formula; the per-account target; the materiality threshold; the falling window; the "after" measurement point; the suggestion and impact method.
  - The source of project financial data and the source of entitlements each sit behind one port. Swapping a source changes one adapter only.
  - The identity provider for sign-in sits behind one adapter. Swapping it changes that adapter and its configuration only.
- How to check: (a) an architecture test in CI that asserts the domain and use-case code does not import any source, identity or framework adapter; (b) a review that each rule above has exactly one definition site in the code; (c) a change to one fixture threshold in a test touches only that rule's module and its tests.

## AC-7 Testability

- Driven by: every key FR (FR-1 to FR-18), each of which states a tester's check on seeded data; the key FRs note that the tester supplies the missing values as fixtures.
- Why it matters: the key FRs are written as checks. The architecture must let those checks run automatically, without a live source system, so each release can be accepted against them.
- Target:
  - 100% of key FRs (FR-1 to FR-18) have at least one automated acceptance test that runs against seeded fixtures.
  - Every acceptance test runs without network access to real source systems or a real identity provider. Fixtures and fakes stand in for them.
  - The full test suite runs in CI on every push to the work branch, and a failing test blocks the merge.
- How to check: a trace table in the test suite maps each FR id to its tests. A CI step fails if an FR id from `docs/requirements/key-frs.md` has no mapped test. In iteration 0, the hello world monorepo runs at least one test per app component in CI.

## Considered and not selected

These were considered and left out of the top seven. The PRD gives no goal, number or FR that calls for them in release 1.

- Performance and scalability: the product is an internal tool for DMs and CLT members (PRD §7), at account level only (PRD §4). The PRD sets no latency, volume or concurrency figure. Add a target once data volumes are known (PRD §8 Q2).
- Availability: the PRD states no uptime need. Use the managed defaults of the chosen Google Cloud services.
- Data freshness: it depends on the refresh frequency of the source systems, which is open (PRD §8 Q2).

The Google Cloud project `alpha-dev-80ca` and the region `us-central1` (PRD §7) are a constraint on every component, not a characteristic.
