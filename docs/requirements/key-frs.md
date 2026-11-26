# Key functional requirements: Delivery Commercial Governance (release 1)

Source: `docs/product/prd.md` (signed off for release 1), read with `docs/product/vision.md` and `docs/product/intent.md`.

Each key FR names who acts, one result they can observe, and how a tester checks it. "PRD" citations point to the PRD's section and item, for example "PRD §5.1 FR-4 / AC-4.3". The key FR numbers here are this document's own; they do not match the PRD's FR numbers one to one, because PRD items that hold more than one result are split.

Terms used in the checks:

- **Entitled account**: an account the signed-in user is entitled to (PRD §2).
- **Test account**: a seeded account with known project financial data. CGM values, targets, the "material" gap threshold and the "falling" window are set as test fixtures until PRD §8 open questions are answered.

## Signal

### FR-1 Account CGM overview

- **Who:** a signed-in Delivery Manager or CLT member.
- **Result:** for an entitled account, the user sees the account's CGM and signals aggregated across all of the account's projects.
- **How to check:** seed a test account with three projects and known financials; open its overview; the shown aggregate CGM equals the value computed from the seeded data, and every one of the three projects is included.
- **Traces to:** PRD §5.1 FR-1, AC-1.1; §4 in scope item 1.

### FR-2 No access to non-entitled accounts

- **Who:** a signed-in user who is not entitled to a given account.
- **Result:** the user cannot view that account's overview, plans, actions or history.
- **How to check:** sign in as a user not entitled to the test account; request each of its views and actions directly; each request is refused and no account data is returned. The account also does not appear in the user's account list.
- **Traces to:** PRD §5.1 FR-1, AC-1.2; §2 ("sees only the accounts they are entitled to"); §6 Access control.

### FR-3 CGM gaps highlighted

- **Who:** a Delivery Manager or CLT member viewing an entitled account's overview.
- **Result:** where the account's CGM is below target or falling, the overview highlights each material CGM gap.
- **How to check:** seed one account with CGM below its target by more than the material threshold, one with CGM falling over the configured window, and one on target and stable; the first two show a highlighted gap; the third shows none.
- **Traces to:** PRD §5.1 FR-2, AC-2.1; §3 goal 1.

### FR-4 Key cost drivers shown

- **Who:** a Delivery Manager or CLT member viewing a highlighted gap.
- **Result:** the user sees the key cost drivers behind that gap.
- **How to check:** seed a gap caused by a known cost driver (for example a senior-grade-heavy project); the gap lists that driver.
- **Traces to:** PRD §5.1 FR-2, AC-2.1.

### FR-5 Project-level evidence linked

- **Who:** a Delivery Manager or CLT member viewing a gap, driver or suggestion.
- **Result:** every gap, driver and suggestion links to the project-level evidence behind it.
- **How to check:** for each gap, driver and suggestion on the seeded test account, follow its evidence link; it opens the data of the specific project(s) that produce it; no gap, driver or suggestion lacks a link.
- **Traces to:** PRD §5.1 FR-2, AC-2.1; §6 Explainability.

### FR-6 Optimization suggestions with expected impact

- **Who:** a Delivery Manager or CLT member viewing an account with a highlighted gap.
- **Result:** the user sees specific optimization suggestions (such as a personnel grade adjustment or a leverage change), each naming the change and its expected CGM impact.
- **How to check:** on the seeded gap account, every suggestion shown has a named change and a numeric expected CGM impact; none is missing either field.
- **Traces to:** PRD §5.1 FR-3, AC-3.1; §4 in scope item 3.

## Plan

### FR-7 Choose recommendations to adopt

- **Who:** a Delivery Manager.
- **Result:** the user can select which suggestions to adopt into an optimization plan.
- **How to check:** from three suggestions, adopt two; the plan lists exactly those two as adopted and the third as not adopted.
- **Traces to:** PRD §5.1 FR-4, AC-4.1.

### FR-8 Record action items and intended changes

- **Who:** a Delivery Manager building a plan.
- **Result:** the user can record planned action items, each with its intended change.
- **How to check:** add two action items with intended changes to a plan and save; reopening the plan shows both items with the entered changes.
- **Traces to:** PRD §5.1 FR-4, AC-4.2; §4 in scope item 4.

### FR-9 Owner per action

- **Who:** a Delivery Manager building a plan.
- **Result:** every action in a saved plan has one named owner.
- **How to check:** assign an owner to each action and save; each action shows its owner. Try to save a plan with an action that has no owner; the save is refused and names the action without an owner.
- **Traces to:** PRD §5.1 FR-4, AC-4.3; §3 goal 2 ("for each action, an owner").

### FR-10 Expected CGM improvement target

- **Who:** a Delivery Manager building a plan.
- **Result:** every action in a saved plan has an expected CGM improvement target.
- **How to check:** enter a target for each action and save; each action shows its target. Try to save with an action that has no target; the save is refused and names the action.
- **Traces to:** PRD §5.1 FR-4, AC-4.4; §3 goal 2.

### FR-11 Plan and decision record saved

- **Who:** a Delivery Manager saving a plan.
- **Result:** the system keeps the plan and its decision record, linking the adopted recommendations, decision, owners, actions and targets, for later tracking.
- **How to check:** save a plan, sign out and back in, reopen the account; the plan and its decision record show every adopted recommendation, action, owner and target as saved.
- **Traces to:** PRD §5.1 FR-4, AC-4.5; §6 Traceability.

### FR-12 No automatic intervention

- **Who:** any user saving or updating a plan or an action's status.
- **Result:** no project, staffing, grade, rate or financial data changes as a result.
- **How to check:** snapshot the seeded project, staffing and financial data; save a plan, update it, and mark actions implemented; the data compared with the snapshot is unchanged, and the system makes no write call to any source system.
- **Traces to:** PRD §5.1 FR-5, AC-5.1; §4 out of scope items 1 and 2; §6 Safety.

## Execute

### FR-13 Action owner sees owned actions

- **Who:** an action owner.
- **Result:** the user sees the list of actions they own, across their entitled accounts.
- **How to check:** assign user A two actions and user B one; signed in as A, the list shows exactly A's two actions.
- **Traces to:** PRD §2 (Action owner: "know which actions they own").

### FR-14 Update action execution status

- **Who:** a Delivery Manager or the action's owner.
- **Result:** the user can update the execution status of each planned action, for example to implemented.
- **How to check:** mark one action implemented; reopening the plan shows that action as implemented and the others unchanged.
- **Traces to:** PRD §5.2 FR-6, AC-6.1; §2 (Delivery Manager and Action owner needs); §4 in scope item 5.

### FR-15 Actual against planned, before and after

- **Who:** a Delivery Manager or CLT member viewing a saved plan.
- **Result:** the plan shows, for each action and for the plan as a whole, CGM before, CGM after, the actual improvement and the planned target.
- **How to check:** seed before and after CGM for a plan with implemented actions; the shown actual improvement equals after minus before, computed from the seeded data, and sits beside the planned target.
- **Traces to:** PRD §5.2 FR-6, AC-6.1, AC-6.2; §3 goal 3.

### FR-16 Unrealized improvement shown

- **Who:** a Delivery Manager or CLT member viewing a saved plan.
- **Result:** where an action was not executed or its actual improvement is below its target, the plan clearly marks that the expected improvement was not achieved and shows the gap in the before-and-after comparison.
- **How to check:** seed a plan with one action not executed and one executed but short of target; both are marked "not achieved" and the comparison shows target minus actual for each.
- **Traces to:** PRD §5.2 FR-7, AC-7.1, AC-7.2; §3 goal 3.

## Review

### FR-17 Governance history

- **Who:** a Delivery Manager or CLT member viewing an entitled account.
- **Result:** the user sees the account's governance and optimization history: each decision with its actions' execution status, owners and before-and-after effect.
- **How to check:** seed an account with two saved plans; the history lists both, and for each action shows its status, owner and before-and-after comparison matching the plan.
- **Traces to:** PRD §5.3 FR-8, AC-8.1; §4 in scope item 6; §6 Traceability.

### FR-18 Effective and not-adopted measures identified

- **Who:** a Delivery Manager or CLT member viewing the governance history.
- **Result:** each measure in the history is marked as effective, not effective or not adopted.
- **How to check:** seed one suggestion adopted and met its target, one adopted and missed it, and one not adopted; the history marks them effective, not effective and not adopted.
- **Traces to:** PRD §5.3 FR-8, AC-8.2; §3 goal 4.

## Gaps and ambiguities in the PRD

These affect how the checks above are set; they are not resolved here.

1. **CGM definition, calculation and per-account target** are open (PRD §8). FR-1, FR-3 and FR-15 checks use seeded values until defined.
2. **"Material" gap and "falling" window** are undefined (PRD §8). FR-3 uses fixture thresholds.
3. **When "after" is measured** is open (PRD §8). FR-15 and FR-16 depend on it.
4. **How suggestions and expected impact are produced** is open (PRD §8). FR-6 checks only that each suggestion has a change and an impact, not that the impact is correct.
5. **Data and entitlement sources** and **sign-in** are open (PRD §8). FR-2 and FR-13 assume an entitlement list exists.
6. **Action owner has no PRD §5 requirement.** PRD §2 gives action owners a need (see owned actions, update status) that no §5 FR or AC covers; FR-13 and the owner part of FR-14 come from §2 only. Whether an owner must also be entitled to the account is unstated.
7. **Target granularity.** AC-4.4 says "the expected CGM improvement target" (one per plan?) while §3 goal 2 says one per action. FR-10 follows §3 (per action); this needs confirmation.
8. **Who may update action status.** AC-6.1 says "the user"; §2 suggests both Delivery Manager and owner. CLT member edit rights on plans are also unstated.
9. **"Effective" is undefined** (AC-8.2). FR-18 assumes effective means actual improvement met the target.
10. **Plan edits after saving.** AC-5.1 mentions "updating a plan" but no FR says what can be edited or whether earlier versions of a decision record are kept.
