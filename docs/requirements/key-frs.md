# Key functional requirements: Delivery Commercial Governance

Source: `docs/product/prd.md` (signed off for release 1), with `docs/product/vision.md` and `docs/product/intent.md` as context.

Each requirement names who acts, the one result they can observe, and how a tester checks it. "Source" cites the PRD section and the FR/AC item it comes from. The PRD's own FR numbers are cited as "PRD FR-n"; the numbers below are this document's key FR numbers.

Terms used in checks:

- **Entitled user**: a signed-in user granted access to the account under test (PRD §2).
- **Seeded account**: a test account whose projects carry known financial figures, a known CGM target and known history, so that expected values can be worked out by hand.
- Where the PRD leaves a value open (CGM formula, target, "material" threshold, "falling" window, "after" point), the check uses the value configured for the test and the item is listed under Open points.

## 1. Signal and plan

### FR-1 Account CGM overview

- **Who / result:** A Delivery Manager or CLT member who opens an account they are entitled to sees the account's CGM aggregated across all of its projects.
- **Check:** Seed an account with three projects of known financials. Open the overview as an entitled user. The account CGM shown equals the CGM worked out by hand from all three projects, and each of the three projects is listed as contributing.
- **Source:** PRD §5.1 FR-1, AC-1.1; §4 In scope (account-level CGM overview); §3 Goal 1.

### FR-2 No access to non-entitled accounts

- **Who / result:** A signed-in user who is not entitled to an account gets no data for that account in any view or action.
- **Check:** As a user with no entitlement to account A, (a) the account list does not show A, (b) a direct request for A's overview, suggestions, plans or history is refused and returns none of A's data. Repeat as a user not signed in: every request is refused.
- **Source:** PRD §5.1 FR-1, AC-1.2; §2 ("sees only the accounts they are entitled to"); §6 Access control.

### FR-3 Below-target CGM gap highlighted

- **Who / result:** An entitled user reviewing an account whose CGM is below its target sees the material CGM gap highlighted, with its size.
- **Check:** Seed an account with CGM below its configured target by more than the configured materiality threshold, and a second account above target. The first overview highlights a gap whose size equals target minus actual; the second shows no gap.
- **Source:** PRD §5.1 PRD FR-2, AC-2.1; §3 Goal 1.

### FR-4 Falling CGM highlighted

- **Who / result:** An entitled user reviewing an account whose CGM has fallen over the configured window sees the fall highlighted.
- **Check:** Seed an account whose CGM decreases across the configured window, and one whose CGM is flat. The first overview highlights falling CGM; the second does not.
- **Source:** PRD §5.1 PRD FR-2, AC-2.1; §3 Goal 1.

### FR-5 Cost drivers with project evidence

- **Who / result:** For each highlighted gap or fall, the entitled user sees its key cost drivers, and each driver links to the project-level evidence behind it.
- **Check:** Seed a gap caused by a known cost line on a known project. The highlighted gap lists that cost driver; following its link opens the record of that project and cost line. No driver is shown without a working evidence link.
- **Source:** PRD §5.1 PRD FR-2, AC-2.1; §6 Explainability; §4 In scope.

### FR-6 Optimization suggestions with expected impact

- **Who / result:** For an account with a highlighted gap or fall, the entitled user sees optimization suggestions (for example a personnel grade adjustment or a leverage change); each names the change, its expected CGM impact and links to the project-level evidence behind it.
- **Check:** On a seeded account with a gap, every suggestion shown has a non-empty change description, a numeric expected CGM impact, and a working link to project evidence. A suggestion missing any of the three is a failure.
- **Source:** PRD §5.1 PRD FR-3, AC-3.1; §6 Explainability; §4 In scope.

### FR-7 Adopt recommendations into a plan

- **Who / result:** An entitled user can choose which suggestions to adopt into an optimization plan; the plan shows exactly the adopted ones.
- **Check:** With five suggestions shown, adopt two. The saved plan lists those two and not the other three.
- **Source:** PRD §5.1 PRD FR-4, AC-4.1; §4 In scope.

### FR-8 Action items and intended changes

- **Who / result:** An entitled user can record, in a plan, action items each with its intended change; the saved plan shows each action item and its intended change as entered.
- **Check:** Add three action items with distinct intended changes, save, reopen. All three appear with the text entered.
- **Source:** PRD §5.1 PRD FR-4, AC-4.2; §4 In scope.

### FR-9 Owner per action

- **Who / result:** An entitled user assigns an owner to each action item; a plan with an action that has no owner cannot be saved.
- **Check:** (a) Assign a different owner to each of three actions, save, reopen: each action shows its owner. (b) Try to save a plan with one action without an owner: the save is refused and the user is told which action lacks an owner.
- **Source:** PRD §5.1 PRD FR-4, AC-4.3; §3 Goal 2 ("for each action, an owner").

### FR-10 Expected CGM improvement target

- **Who / result:** An entitled user defines an expected CGM improvement target; a plan without one cannot be saved.
- **Check:** (a) Enter a target, save, reopen: the target shows as entered. (b) Try to save without a target: the save is refused. (See Open points on whether the target is per plan or per action.)
- **Source:** PRD §5.1 PRD FR-4, AC-4.4; §3 Goal 2.

### FR-11 Saved plan and decision record

- **Who / result:** When an entitled user saves a plan, the system keeps the plan and its decision record, linking the adopted recommendations, decision, owners, actions and target, and any entitled user of that account can open it later.
- **Check:** Save a plan, sign out, sign in as a second entitled user of the same account. The plan opens and shows each link (recommendation, decision, owners, actions, target). A user not entitled to the account cannot open it (FR-2).
- **Source:** PRD §5.1 PRD FR-4, AC-4.5; §6 Traceability.

### FR-12 No automatic intervention

- **Who / result:** Saving or updating a plan, or updating an action's status, changes no project, staffing, grade, rate or financial data.
- **Check:** Snapshot the project, staffing and financial source data. Save a plan, update it, and mark every action implemented. The source data is identical to the snapshot, and no write call reaches any source system (verified by the test double or audit log of the source integration).
- **Source:** PRD §5.1 PRD FR-5, AC-5.1; §4 Out of scope (automatic intervention; editing project financial data); §6 Safety.

## 2. Execute

### FR-13 Action owner sees own actions

- **Who / result:** An action owner sees the list of actions assigned to them, across the plans of the accounts they are entitled to.
- **Check:** Assign user U as owner of two actions in plan P1 and one in plan P2. Signed in as U, the "my actions" list shows exactly those three actions and no others.
- **Source:** PRD §2 (Action owner: "know which actions they own"). See Open points: the PRD has no numbered FR for this.

### FR-14 Update action execution status

- **Who / result:** An action owner can update the execution status of an action they own (for example to implemented); the new status shows on the plan.
- **Check:** As the owner, mark an action implemented. Reopen the plan as another entitled user: the action shows implemented, with who changed it and when.
- **Source:** PRD §5.2 PRD FR-6, AC-6.1; §2 (Action owner: "update their execution status"); §4 In scope (execution status tracking).

### FR-15 Actual against planned target

- **Who / result:** When actions in a saved plan are marked implemented, the entitled user sees actual execution results compared with the planned targets.
- **Check:** On a seeded plan with a target of +2 CGM points, mark all actions implemented and seed an actual result of +1.5 points. The plan shows planned +2, actual +1.5 and the difference -0.5.
- **Source:** PRD §5.2 PRD FR-6, AC-6.1; §3 Goal 3.

### FR-16 Before-and-after CGM comparison

- **Who / result:** For a saved plan, the entitled user sees the account's CGM before the plan and after it, and the actual CGM improvement worked out from the two.
- **Check:** Seed CGM before = 18% and after = 20.5% at the configured "after" point. The plan shows before 18%, after 20.5% and actual improvement 2.5 points.
- **Source:** PRD §5.2 PRD FR-6, AC-6.2; §3 Goal 3; §4 In scope.

### FR-17 Unrealized improvement indicated

- **Who / result:** For a saved plan whose planned actions were not executed, or whose actual improvement is below target, the entitled user sees a clear indication that the expected CGM improvement was not achieved.
- **Check:** (a) Leave every action of a plan not executed past its "after" point: the plan shows "improvement not achieved". (b) A plan whose actions are all implemented and whose actual improvement meets the target shows no such indication.
- **Source:** PRD §5.2 PRD FR-7, AC-7.1; §3 Goal 3 ("including unrealized improvement").

### FR-18 Unrealized gap in the comparison

- **Who / result:** In the before-and-after comparison of a plan, the entitled user sees the gap between the expected and the actual improvement.
- **Check:** Seed target +2 points and actual +0.5 points. The before-and-after comparison shows an unrealized gap of 1.5 points.
- **Source:** PRD §5.2 PRD FR-7, AC-7.2; §3 Goal 3.

## 3. Review and feedback

### FR-19 Governance history

- **Who / result:** An entitled user opening an account's governance history sees every plan of the account with, for each action, its execution status, its owner and the plan's before-and-after effect.
- **Check:** Seed an account with three plans, of which one is fully implemented, one partly and one not at all. The history lists all three; each action shows its status and owner; each plan shows its before, after and actual-versus-target figures matching FR-16 and FR-18.
- **Source:** PRD §5.3 PRD FR-8, AC-8.1; §6 Traceability; §4 In scope (governance and optimization history).

### FR-20 Effective and not-adopted measures identified

- **Who / result:** In the governance history, the entitled user can see, per optimization measure, whether it was effective or was not adopted.
- **Check:** Seed one measure adopted and implemented with improvement meeting its target, and one suggestion that was never adopted into a plan. The history marks the first "effective" and the second "not adopted".
- **Source:** PRD §5.3 PRD FR-8, AC-8.2; §3 Goal 4.

## Traceability summary

| Key FR | PRD item                   |
| ------ | -------------------------- |
| FR-1   | FR-1 / AC-1.1              |
| FR-2   | FR-1 / AC-1.2, §6          |
| FR-3   | FR-2 / AC-2.1              |
| FR-4   | FR-2 / AC-2.1              |
| FR-5   | FR-2 / AC-2.1, §6          |
| FR-6   | FR-3 / AC-3.1, §6          |
| FR-7   | FR-4 / AC-4.1              |
| FR-8   | FR-4 / AC-4.2              |
| FR-9   | FR-4 / AC-4.3, §3          |
| FR-10  | FR-4 / AC-4.4, §3          |
| FR-11  | FR-4 / AC-4.5, §6          |
| FR-12  | FR-5 / AC-5.1, §4, §6      |
| FR-13  | §2 (Action owner)          |
| FR-14  | FR-6 / AC-6.1, §2          |
| FR-15  | FR-6 / AC-6.1              |
| FR-16  | FR-6 / AC-6.2              |
| FR-17  | FR-7 / AC-7.1              |
| FR-18  | FR-7 / AC-7.2              |
| FR-19  | FR-8 / AC-8.1, §6          |
| FR-20  | FR-8 / AC-8.2, §3          |

## Open points

From PRD §8, still open and affecting the checks above:

1. CGM definition, formula and per-account target (FR-1, FR-3, FR-16).
2. Source of project financial data and entitlements, and refresh frequency (FR-1, FR-2).
3. Materiality threshold for a gap and the window for "falling" (FR-3, FR-4).
4. How suggestions and expected impact are produced (FR-6).
5. How sign-in works and who grants entitlements (FR-2).
6. When "after" is measured (FR-16, FR-17, FR-18).

Gaps and ambiguities found while writing:

7. Target granularity: AC-4.4 reads as one target per plan; §3 Goal 2 says each action has an expected CGM improvement target. FR-10 needs a decision.
8. Action owner need (§2, "know which actions they own") has no numbered FR or AC; FR-13 is derived from §2 only.
9. Who may update status: PRD FR-6 says "the user"; §2 says the action owner. Whether a Delivery Manager or CLT member can update an action they do not own is not stated.
10. Roles: §2 says CLT members "review" decisions; the PRD does not say whether CLT members may also create or change plans, or whether action owners need account entitlement.
11. Action status values are not defined beyond "implemented" (for example not started, in progress, dropped).
12. "Effective" (AC-8.2) is not defined; FR-20 assumes actual improvement meets its target.
13. "Not adopted" (AC-8.2) may mean a suggestion not adopted into a plan, or an adopted action never executed; FR-20 assumes the former, with the latter covered by FR-17.
14. "Signals" in AC-1.1 is not defined.
15. Plan editing after save: AC-5.1 mentions "updating a plan" but no FR states what may be changed after save or whether changes are versioned in the decision record.
