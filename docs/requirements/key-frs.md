# Key functional requirements: Delivery Commercial Governance (release 1)

Source: `docs/product/prd.md` (signed off for release 1), with `docs/product/vision.md` and `docs/product/intent.md` as context.

This list holds only the functional requirements that shape the architecture. It is not a full list. The ids below (FR-1, FR-2, ...) are this document's own. A PRD requirement is always cited as "PRD FR-n" or "PRD AC-n.m".

Each FR gives:

- **Who:** the user who acts or sees the result.
- **Result:** one result the user can see.
- **Check:** a test a tester can run, with a pass condition.
- **Trace:** the PRD section and item it comes from.

Where a check needs a value that PRD section 8 leaves open, it says so. Examples are the CGM formula, the per-account target, the "material" and "falling" thresholds, and when "after" is measured. The test fixture must supply that value. This document does not invent one.

## Access

### FR-1 Entitled account overview shows aggregated CGM

- **Who:** A signed-in Delivery Manager or CLT member who is entitled to the account.
- **Result:** The user sees the account's CGM and financial signals, aggregated across all of the account's projects.
- **Check:** Seed an account with three projects that have known financials. Open the account overview as an entitled user. Pass if the overview shows an aggregate CGM that matches the value computed from all three projects' financials, and if each of the three projects is counted in it.
- **Trace:** PRD 5.1 FR-1, AC-1.1; PRD 4 In scope "Account-level CGM overview".

### FR-2 Non-entitled account is refused

- **Who:** A signed-in user who is not entitled to a given account.
- **Result:** The user is refused every view and every action on that account.
- **Check:** Seed accounts A and B. Entitle the user to A only. As that user, request B's overview, plans, history and action-status update, through both the UI and the API. Pass if every request is refused, no data about B is returned, and B's data is unchanged. A request with no sign-in must also be refused.
- **Trace:** PRD 5.1 AC-1.2; PRD 2 "Every user is signed in and sees only the accounts they are entitled to"; PRD 6 Access control.

## Signal

### FR-3 Below-target or falling CGM is highlighted with its cost drivers

- **Who:** A Delivery Manager or CLT member viewing an entitled account.
- **Result:** The overview highlights each material CGM gap and names its key cost drivers.
- **Check:** Seed one account whose CGM is below its target and one whose CGM falls over the window, using the target, "material" threshold and window set in the fixture (PRD 8). Seed one more account that is healthy. Pass if the first two accounts show a highlighted gap with at least one named cost driver, and if the healthy account shows no gap.
- **Trace:** PRD 5.1 FR-2, AC-2.1; PRD 3 goal "Surface margin opportunities at the account level".

### FR-4 Every gap, driver and suggestion links to project-level evidence

- **Who:** A Delivery Manager or CLT member viewing a gap, driver or suggestion.
- **Result:** The user can open the project-level evidence behind each gap, driver and suggestion.
- **Check:** For the seeded gap account in FR-3, follow the evidence link on each gap, driver and suggestion shown. Pass if every item has a link, and if each link opens the records of a project in that account that back the item.
- **Trace:** PRD 5.1 AC-2.1 "linked project-level evidence"; PRD 6 Explainability.

### FR-5 Optimization suggestions show their expected CGM impact

- **Who:** A Delivery Manager or CLT member viewing an account with a CGM gap.
- **Result:** The system shows specific optimization suggestions, such as a personnel grade adjustment or a leverage change. Each suggestion names the change and its expected CGM impact.
- **Check:** For the seeded gap account in FR-3, list the suggestions shown. Pass if there is at least one suggestion, and if every suggestion names a concrete change (what changes, and on which project or role) and an expected CGM impact value. How suggestions are produced is still open (PRD 8), so the test checks that these fields are present and match the fixture's expected output.
- **Trace:** PRD 5.1 FR-3, AC-3.1; PRD 4 In scope "Optimization suggestions with expected CGM impact".

## Plan

### FR-6 The user saves a decision as an optimization plan

- **Who:** A Delivery Manager viewing an entitled account.
- **Result:** The user picks which suggestions to adopt, adds action items with their intended changes, and saves them as a plan with a decision record that can be retrieved later.
- **Check:** Adopt two of three suggestions, add two action items with their intended changes, and save. Reload the account in a new session. Pass if the plan is returned with exactly the two adopted suggestions, both action items and their intended changes, and a decision record that shows who decided and when.
- **Trace:** PRD 5.1 FR-4, AC-4.1, AC-4.2, AC-4.5; PRD 6 Traceability "decision records are kept".

### FR-7 Every plan action has an owner

- **Who:** A Delivery Manager saving a plan.
- **Result:** Each action in a saved plan has exactly one named owner.
- **Check:** Try to save a plan with one action that has no owner. Pass if the save is refused and the missing owner is shown. Then assign an owner and save. Pass if the owner is stored with the action. Sign in as that owner. Pass if the action appears in the owner's own list of actions.
- **Trace:** PRD 5.1 AC-4.3; PRD 2 Action owner "know which actions they own"; PRD 3 goal "Turn recommendations into owned decisions".

### FR-8 Every plan has an expected CGM improvement target

- **Who:** A Delivery Manager saving a plan.
- **Result:** The saved plan records an expected CGM improvement target.
- **Check:** Try to save a plan with no target. Pass if the save is refused. Save the plan with a target of a given value. Pass if the plan is reloaded with that same target value.
- **Trace:** PRD 5.1 AC-4.4; PRD 3 measure "Every saved plan has, for each action, an owner and an expected CGM improvement target".

### FR-9 The CGM Coach never changes project, staffing or financial data

- **Who:** Any user who saves or updates a plan or an action status.
- **Result:** Project, staffing and financial source data are unchanged after any plan or status operation.
- **Check:** Take a snapshot of the seeded project, staffing and financial data. Create a plan, update it, mark actions implemented and save each change. Compare the data with the snapshot. Pass if it is identical. Also pass only if the system's credentials to the source data are read-only, so any write attempt fails.
- **Trace:** PRD 5.1 FR-5, AC-5.1; PRD 4 Out of scope "Any automatic intervention" and "Editing project financial data"; PRD 6 Safety; intent "Never execute an intervention ... automatically".

## Execute

### FR-10 The action owner updates the status of their actions

- **Who:** The owner of a plan action, or a Delivery Manager on that account.
- **Result:** The user sets an action's execution status, for example to implemented. The new status and the time it changed are stored.
- **Check:** As the owner, mark an action implemented. Reload the plan. Pass if the action shows implemented, with who changed it and when. As a user who is not entitled to the account, try the same update. Pass if it is refused.
- **Trace:** PRD 5.2 FR-6; PRD 2 Action owner "update their execution status"; PRD 4 In scope "Execution status tracking per action".

### FR-11 A plan shows before-and-after CGM against its target

- **Who:** A Delivery Manager or CLT member viewing a saved plan.
- **Result:** The plan shows the account's CGM before the plan, its actual CGM after the plan, the actual improvement, and the planned target, side by side.
- **Check:** Seed a plan with a target of a given value. Seed project financials for the "before" period and the "after" period, as set in the fixture (PRD 8). Mark the actions implemented. Pass if the plan shows the before CGM, the after CGM, an actual improvement equal to after minus before, and the target, each matching the fixture.
- **Trace:** PRD 5.2 AC-6.1, AC-6.2; PRD 3 goal "Measure the real impact of commercial decisions".

### FR-12 Unrealized improvement is flagged

- **Who:** A Delivery Manager or CLT member viewing a saved plan.
- **Result:** When planned actions are not executed, or when the actual improvement is below the target, the plan is flagged as not having achieved its expected CGM improvement. The size of the shortfall is shown in the before-and-after comparison.
- **Check:** Case A: leave one action not executed after the "after" point. Case B: mark all actions implemented but seed an actual improvement below the target. Pass if both plans are flagged as not achieved and show the shortfall (target minus actual). Also pass only if a plan that meets its target is not flagged.
- **Trace:** PRD 5.2 FR-7, AC-7.1, AC-7.2; PRD 3 measure "including unrealized improvement".

## Review

### FR-13 Governance history shows each measure's status, owner and effect

- **Who:** A Delivery Manager or CLT member viewing an entitled account.
- **Result:** The account's history lists every past plan and its measures. For each measure it shows the execution status, the owner, the before-and-after effect and an outcome label: effective, not effective or not adopted.
- **Check:** Seed an account with three past measures: one implemented that met its target, one implemented that missed it, and one suggestion that was not adopted. Open the history. Pass if all three appear with their status, owner (where one exists) and before-and-after effect, labelled effective, not effective and not adopted.
- **Trace:** PRD 5.3 FR-8, AC-8.1, AC-8.2; PRD 3 goal "Learn what works"; PRD 4 In scope "Governance and optimization history view".

### FR-14 Each plan links its recommendation, decision, owners, actions and outcome

- **Who:** A CLT member reviewing a past plan.
- **Result:** From one plan, the user can follow the links from each adopted recommendation to its decision record, its actions, each action's owner and the measured outcome.
- **Check:** Open a completed plan from the history. For each adopted recommendation, follow the links. Pass if each recommendation reaches its decision record, every one of its actions with an owner, and its before-and-after outcome, with no broken link. Also pass only if a plan stays retrievable after a newer plan is saved for the same account.
- **Trace:** PRD 6 Traceability; PRD 5.3 AC-8.1 "links between decisions, owners and outcomes"; vision "every commercial decision on an account can be traced to its outcome".

## Trace summary

| FR    | Title                                         | PRD trace                                         |
| ----- | --------------------------------------------- | ------------------------------------------------- |
| FR-1  | Entitled account overview shows aggregated CGM | 5.1 FR-1 / AC-1.1; 4                              |
| FR-2  | Non-entitled account is refused                | 5.1 AC-1.2; 2; 6 Access control                   |
| FR-3  | Below-target or falling CGM is highlighted     | 5.1 FR-2 / AC-2.1; 3                              |
| FR-4  | Gaps, drivers and suggestions link to evidence | 5.1 AC-2.1; 6 Explainability                      |
| FR-5  | Suggestions show expected CGM impact           | 5.1 FR-3 / AC-3.1; 4                              |
| FR-6  | User saves a decision as a plan                | 5.1 FR-4 / AC-4.1, AC-4.2, AC-4.5; 6 Traceability |
| FR-7  | Every plan action has an owner                 | 5.1 AC-4.3; 2; 3                                  |
| FR-8  | Every plan has a CGM improvement target        | 5.1 AC-4.4; 3                                     |
| FR-9  | Never changes project, staffing or financial data | 5.1 FR-5 / AC-5.1; 4 Out of scope; 6 Safety    |
| FR-10 | Action owner updates action status             | 5.2 FR-6; 2; 4                                    |
| FR-11 | Plan shows before-and-after CGM against target | 5.2 AC-6.1, AC-6.2; 3                             |
| FR-12 | Unrealized improvement is flagged              | 5.2 FR-7 / AC-7.1, AC-7.2; 3                      |
| FR-13 | Governance history shows status, owner, effect | 5.3 FR-8 / AC-8.1, AC-8.2; 3; 4                   |
| FR-14 | Plan links recommendation to outcome           | 6 Traceability; 5.3 AC-8.1                        |
