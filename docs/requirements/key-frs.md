# Key functional requirements: Delivery Commercial Governance (release 1)

Source: the signed-off PRD at `docs/product/prd.md`, read with `docs/product/vision.md` and `docs/product/intent.md`. Each FR below names who acts, the result they can see, and how a tester checks it. Each FR cites the PRD item it comes from. Where a PRD open question (PRD §8) affects how a check is set up, the FR says so. These FRs do not answer the open questions. The tester supplies the missing values (CGM formula, target, materiality, window, "after" date) as test fixtures.

Users (PRD §2): Delivery Manager (DM), Client Leadership Team member (CLT), Action owner. In every FR, "user" means a signed-in DM or CLT member unless the FR names someone else.

## Signal and plan

### FR-1 Account CGM overview aggregates all projects
- Source: PRD §5.1 FR-1, AC-1.1; §4 In scope item 1; §3 Goal 1.
- Requirement: A user who views an account they are entitled to sees one CGM figure for that account. The figure is aggregated from all of the account's projects.
- Check: Seed an entitled account with three projects whose financials are known. Open the account overview. The account CGM shown equals the fixture aggregate of all three projects, and each of the three projects is listed as a contributor. Remove one project from the seed data. The figure changes to match the two remaining projects.
- Open question: PRD §8 Q1 (CGM formula) and Q2 (data source). The tester uses a fixture formula.

### FR-2 Access is limited to entitled accounts
- Source: PRD §5.1 AC-1.2; §2 ("sees only the accounts they are entitled to"); §6 Access control.
- Requirement: A signed-in user cannot see or change any data of an account they are not entitled to. This covers the overview, signals, suggestions, plans, actions and history.
- Check: Give user A an entitlement to account X but not to account Y. As A, (a) the account list shows X and not Y; (b) requesting each Y view and each Y action directly (overview, suggestions, plan save, action status update, history) is refused and returns no Y data.
- Open question: PRD §8 Q5 (who grants entitlements). The tester seeds entitlements directly.

### FR-3 Unsigned users are refused
- Source: PRD §2 ("Every user is signed in"); §6 Access control.
- Requirement: A request that has no signed-in user gets no account data.
- Check: Call each view and each action with no session. Every call is refused and returns no account data.
- Open question: PRD §8 Q5 (how sign-in works).

### FR-4 Below-target or falling CGM is highlighted
- Source: PRD §5.1 FR-2, AC-2.1; §4 In scope item 2; §3 Goal 1.
- Requirement: When an entitled account's CGM is below target or falling, the user sees each material CGM gap highlighted on the overview. When CGM is on target and not falling, no gap is highlighted.
- Check: Seed three accounts: one below target, one falling over the window, and one on target and steady. The overview shows a highlighted gap for the first two and none for the third.
- Open question: PRD §8 Q1 (target), Q3 (materiality and falling window). The tester uses fixture thresholds.

### FR-5 Each gap shows its key cost drivers
- Source: PRD §5.1 AC-2.1; §4 In scope item 2.
- Requirement: For each highlighted gap, the user sees the key cost drivers behind it.
- Check: Seed a below-target account whose gap is caused by a known cost line, for example a senior-grade cost overrun on one project. The highlighted gap lists that cost line as a driver.

### FR-6 Gaps, drivers and suggestions link to project evidence
- Source: PRD §5.1 AC-2.1; §6 Explainability.
- Requirement: From every gap, driver and suggestion, the user can open the project-level evidence behind it.
- Check: For each gap, driver and suggestion shown on a seeded account, follow its evidence link. The link opens the project or projects and the figures that produced it, and those figures match the seed data. None of them lacks a link.

### FR-7 Suggestions name a change and its expected CGM impact
- Source: PRD §5.1 FR-3, AC-3.1; §4 In scope item 3.
- Requirement: For an account with a highlighted gap, the user sees optimization suggestions. Examples are a personnel grade adjustment or a leverage change. Each suggestion names the specific change and states its expected CGM impact.
- Check: On a seeded below-target account, list the suggestions. Each one has a change field that is not empty (what changes, on which project) and an expected CGM impact value. A suggestion that lacks either field fails the check.
- Open question: PRD §8 Q4 (how suggestions and impact are produced). The tester checks that the fields are present and match the fixture, not the method.

### FR-8 User adopts chosen suggestions into a plan
- Source: PRD §5.1 FR-4, AC-4.1; §4 In scope item 4.
- Requirement: The user can pick which suggestions to adopt in an optimization plan. Suggestions they do not pick stay out of the plan.
- Check: From five suggestions, adopt two and save. The saved plan holds those two suggestions only.

### FR-9 User records action items with intended changes
- Source: PRD §5.1 AC-4.2; §4 In scope item 4.
- Requirement: The user can add action items to a plan, each with its intended change.
- Check: Add two action items with distinct intended changes and save. Reload the plan. Both items and their intended changes are shown unchanged.

### FR-10 Every action has an owner
- Source: PRD §5.1 AC-4.3; §3 Goal 2.
- Requirement: The user assigns one owner to each action, and a plan cannot be saved while any action has no owner.
- Check: (a) Assign an owner to each action and save. Each saved action shows its owner. (b) Leave one action without an owner and save. The save is refused and the missing owner is named.

### FR-11 Plan has an expected CGM improvement target
- Source: PRD §5.1 AC-4.4; §3 Goal 2.
- Requirement: The user sets the expected CGM improvement target, and a plan cannot be saved without one.
- Check: (a) Set a target of +2.0 points and save. The saved plan shows +2.0. (b) Save with no target. The save is refused.
- Note: PRD §3 Goal 2 reads "for each action ... an expected CGM improvement target", while AC-4.4 reads as one target per plan. The check covers a per-plan target. Whether each action also needs its own target is for the product owner to confirm.

### FR-12 Plan and decision record are saved for tracking
- Source: PRD §5.1 AC-4.5; §6 Traceability.
- Requirement: When the user saves a plan, the system keeps the plan with its decision record. The record holds the adopted suggestions, who decided, when, the actions, owners and target. The user can open the saved plan later.
- Check: Save a plan, then sign out and sign back in. The plan opens with every field from FR-8 to FR-11 plus the decider and decision time. Each action links to the suggestion it came from.

### FR-13 Saving or updating a plan changes no project data
- Source: PRD §5.1 FR-5, AC-5.1; §4 Out of scope items 1 and 2; §6 Safety; intent ("people act").
- Requirement: Saving a plan, updating a plan and updating an action's status change no project, staffing, grade, rate or financial data.
- Check: Take a snapshot of the project, staffing and financial source data. Save a plan, edit it, and mark its actions implemented. The source data is byte-for-byte the same as the snapshot. The system offers no control that would apply a change to those data.

## Execute

### FR-14 Action owner sees and updates the actions they own
- Source: PRD §2 (Action owner: "Know which actions they own and update their execution status"); §5.2 FR-6; §4 In scope item 5.
- Requirement: An action owner sees a list of the actions they own and can update the execution status of each one.
- Check: Assign owner O to two actions across two plans and owner P to a third. Signed in as O, the list shows exactly the two actions. O sets one to "implemented", and the plan shows the new status. O cannot change P's action.

### FR-15 Before-and-after CGM comparison against plan
- Source: PRD §5.2 AC-6.1, AC-6.2; §3 Goal 3; §4 In scope item 5.
- Requirement: For a saved plan whose actions are marked implemented, the user sees CGM before the plan, CGM after it, the actual improvement and the planned target side by side.
- Check: Seed before-CGM at 30%, a target of +2 points, and after-CGM at 31.5%. The plan shows before 30%, after 31.5%, actual +1.5 and planned +2.0.
- Open question: PRD §8 Q6 (when "after" is measured). The tester fixes the "after" date.

### FR-16 Unrealized improvement is flagged
- Source: PRD §5.2 FR-7, AC-7.1, AC-7.2; §3 Goal 3.
- Requirement: When a plan's actions were not carried out, or its actual improvement is below its target, the user sees a clear "improvement not achieved" flag on the plan. The shortfall appears in the before-and-after comparison.
- Check: (a) Leave every action of a plan unexecuted past the "after" date. The plan shows the flag, and the comparison shows the shortfall against target. (b) Use the FR-15 data (actual +1.5 against +2.0). The plan shows the flag with a 0.5-point shortfall. (c) Use a plan that met its target. It shows no flag.

## Review and feedback

### FR-17 Account governance history
- Source: PRD §5.3 FR-8, AC-8.1; §4 In scope item 6; §6 Traceability.
- Requirement: For an entitled account, the user sees its governance history. Each past decision appears with its actions, owners, execution status and before-and-after effect.
- Check: Seed an account with three past plans. The history lists all three. For each plan, it shows every action's owner and status and the before-and-after values that FR-15 shows for that plan.

### FR-18 History shows which measures worked and which were not adopted
- Source: PRD §5.3 AC-8.2; §3 Goal 4.
- Requirement: In the history, the user can see for each measure whether it was effective, not effective, or not adopted.
- Check: Seed one measure that met its target, one that did not, and one suggestion that was never adopted. The history marks them "effective", "not effective" and "not adopted" in that order.
- Open question: The PRD does not define "effective". The tester takes it as "actual improvement met the target" (FR-16). The product owner should confirm this.

## Trace summary

| FR    | PRD source                              |
| ----- | --------------------------------------- |
| FR-1  | §5.1 FR-1, AC-1.1                       |
| FR-2  | §5.1 AC-1.2; §2; §6 Access control      |
| FR-3  | §2; §6 Access control                   |
| FR-4  | §5.1 FR-2, AC-2.1                       |
| FR-5  | §5.1 AC-2.1                             |
| FR-6  | §5.1 AC-2.1; §6 Explainability          |
| FR-7  | §5.1 FR-3, AC-3.1                       |
| FR-8  | §5.1 AC-4.1                             |
| FR-9  | §5.1 AC-4.2                             |
| FR-10 | §5.1 AC-4.3                             |
| FR-11 | §5.1 AC-4.4; §3 Goal 2                  |
| FR-12 | §5.1 AC-4.5; §6 Traceability            |
| FR-13 | §5.1 FR-5, AC-5.1; §4 Out of scope; §6 Safety |
| FR-14 | §2 Action owner; §5.2 FR-6              |
| FR-15 | §5.2 AC-6.1, AC-6.2                     |
| FR-16 | §5.2 FR-7, AC-7.1, AC-7.2               |
| FR-17 | §5.3 FR-8, AC-8.1                       |
| FR-18 | §5.3 AC-8.2; §3 Goal 4                  |

Not FRs here: the Google Cloud project and region (PRD §7) are a constraint, and views above the account level are out of scope (PRD §4).
