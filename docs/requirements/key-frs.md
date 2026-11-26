# Key functional requirements: Delivery Commercial Governance (release 1)

Source: `docs/product/prd.md` (signed off for release 1), with `docs/product/vision.md` and `docs/product/intent.md` as context.
FR-n here matches PRD FR-n one to one, so each trace stays direct. Each FR states who acts, the result they can observe, and how a tester checks it. Nothing here goes beyond PRD section 4 "In scope (release 1)".

Users (PRD section 2): Delivery Manager (DM), CLT member, action owner. All users are signed in and entitled to specific accounts.

## Signal and plan

### FR-1 Account CGM overview

- **Trace:** PRD 5.1 FR-1 (AC-1.1, AC-1.2); 4 In scope bullet 1; 6 Access control.
- **Who:** a signed-in DM or CLT member.
- **Result:** for an account they are entitled to, the user sees CGM aggregated across all of that account's projects. For an account they are not entitled to, the user sees no data.
- **Check:**
  1. Seed an account with N projects that have known financials. Open the overview as an entitled user. The overview includes all N projects, and the aggregated CGM matches the value computed from the seeded data.
  2. Ask for the same account as a signed-in user with no entitlement, through both the UI and the API. Access is denied, and the response holds no account or project data.

### FR-2 Margin opportunities

- **Trace:** PRD 5.1 FR-2 (AC-2.1); 4 In scope bullet 2; 6 Explainability; 3 Goal "Surface margin opportunities".
- **Who:** an entitled DM or CLT member reviewing the account overview.
- **Result:** when the account's CGM is below target or falling, the overview highlights each material CGM gap and its key cost drivers. Each gap and driver links to the project-level evidence behind it.
- **Check:**
  1. Seed one account with below-target CGM, one with falling CGM and one that is on target and stable. The first two show highlighted gaps with drivers. The third shows no gap.
  2. Follow the evidence link on each gap and each driver. Each link opens the specific project records behind it.

### FR-3 Optimization suggestions

- **Trace:** PRD 5.1 FR-3 (AC-3.1); 4 In scope bullet 3; 6 Explainability.
- **Who:** an entitled DM or CLT member.
- **Result:** for an identified gap, the user sees specific optimization suggestions, for example a personnel grade adjustment or a leverage change. Each suggestion names the change, its expected CGM impact and the project evidence behind it.
- **Check:** for a seeded account with a gap, every suggestion shown has three non-empty parts: a named change, an expected CGM impact value, and a link to project evidence.

### FR-4 Decision record and optimization plan

- **Trace:** PRD 5.1 FR-4 (AC-4.1 to AC-4.5); 4 In scope bullet 4; 6 Traceability; 3 Goal "Turn recommendations into owned decisions".
- **Who:** an entitled DM (the PRD 2 user who plans actions and assigns owners).
- **Result:** the DM saves an optimization plan that records which suggestions were adopted, the action items, the intended changes, one owner per action and an expected CGM improvement target. The saved plan and its decision record can be retrieved later for tracking.
- **Check:**
  1. Adopt a subset of the suggestions, add actions and changes, assign an owner to each action, set a target and save. Reload the plan. Every field reads back unchanged, and it links to the adopted suggestions.
  2. Try to save with an action that has no owner, or with no improvement target. The save is rejected (PRD 3: every saved plan has an owner per action and a target).

### FR-5 No automatic intervention

- **Trace:** PRD 5.1 FR-5 (AC-5.1); 4 Out of scope bullets 1 and 2; 6 Safety.
- **Who:** the system, for any user saving or updating a plan or a status.
- **Result:** saving or updating a plan or an action status changes no project, staffing or financial data.
- **Check:** take a snapshot of the project, staffing and financial source data. Create, update and complete a plan. Compare the source data with the snapshot: there are no differences. The data access in the code shows only read operations toward those sources.

## Execute

### FR-6 Execution tracking and before-and-after comparison

- **Trace:** PRD 5.2 FR-6 (AC-6.1, AC-6.2); 2 Action owner; 4 In scope bullet 5; 3 Goal "Measure the real impact".
- **Who:** an entitled DM, or the action's owner.
- **Result:** the user updates each planned action's execution status, for example to implemented. The system shows the actual CGM improvement against the planned target, with CGM before and after.
- **Check:**
  1. As the action owner, mark an action implemented. The new status persists and shows on the plan.
  2. Seed before and after financials with a known difference. The plan shows the before CGM, the after CGM, the actual improvement and the planned target, and each value matches the seeded data.

### FR-7 Unrealized improvement

- **Trace:** PRD 5.2 FR-7 (AC-7.1, AC-7.2); 3 Goal "Measure the real impact" (including unrealized improvement).
- **Who:** an entitled DM or CLT member viewing a saved plan.
- **Result:** when planned actions were not executed, or when actual CGM falls short of the target, the plan clearly marks the expected improvement as not achieved. The before-and-after comparison shows the size of the shortfall.
- **Check:** seed a plan whose actions are left not executed, and a second plan whose after CGM is below target. Both show a "not achieved" marker, and the shortfall shown equals the target minus the actual improvement.

## Review and feedback

### FR-8 Governance history

- **Trace:** PRD 5.3 FR-8 (AC-8.1, AC-8.2); 4 In scope bullet 6; 6 Traceability; 3 Goal "Learn what works".
- **Who:** an entitled DM or CLT member.
- **Result:** the user sees the account's governance and optimization history. Each decision is listed with its actions, owners, execution status and before-and-after effect. Each measure is labelled effective, not effective or not adopted.
- **Check:** seed an account with one effective measure, one ineffective measure and one suggestion that was not adopted. The history lists all three, each with its correct label, owner, status and before and after values. Each entry links back to its recommendation and decision.

## Gaps and ambiguities in the inputs

These are not resolved here. Each one blocks an exact test oracle for the FR shown in brackets.

1. The definition and calculation of CGM, and the target for each account, are open (PRD 8). [FR-1, FR-2, FR-6]
2. What counts as a "material" gap, and the time window for "falling" CGM, are undefined (PRD 8). [FR-2]
3. How suggestions and their expected impact are produced is open (PRD 8). [FR-3]
4. When "after" is measured for the before-and-after comparison is open (PRD 8). [FR-6, FR-7]
5. "Effective" has no threshold. Is a measure effective when it meets its target, or when CGM improves at all? [FR-8]
6. Who may update an action's status is unclear. PRD 2 says the action owner updates it, but FR-6 says "the user". The draft above allows the DM and the owner. Whether a CLT member may also update it is unstated. [FR-6]
7. The PRD 2 action owner need "know which actions they own" has no FR or AC. No "my actions" view is specified, so none is included here. [FR-6]
8. Plan editing after save is not specified. AC-5.1 mentions "updating a plan", but no FR defines which plan fields can be edited, or whether edits are versioned for the history. [FR-4, FR-8]
9. Owner validity is undefined: must an owner be a system user entitled to the account? [FR-4]
10. The source systems for financial data and entitlements, the refresh frequency, and the sign-in method are open (PRD 8). These affect the test data setup for FR-1 and the access checks.
11. The FR-4 check 2 rule (reject a save without owners or a target) comes from the PRD 3 success measure, not from an explicit AC. It needs confirmation.
