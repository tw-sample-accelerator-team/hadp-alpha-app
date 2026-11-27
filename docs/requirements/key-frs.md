# Key functional requirements: Delivery Commercial Governance (release 1)

Source: `docs/product/prd.md` (signed off for release 1). Every FR below cites the PRD item it comes from. FR ids match the PRD's FR ids one to one, so each key FR traces straight back to its PRD item. Each FR names who acts, what result they can see, and how a tester checks it. Each check (`FR-n.m`) covers one result and maps to the PRD acceptance criterion (AC) in brackets.

Terms used in the checks:

- **Entitled account**: an account the signed-in user has been granted access to (PRD section 2).
- **Seeded test account**: a test account whose project financial data the tester loads with known values, so the expected aggregates, gaps and comparisons can be worked out by hand.
- Where a check depends on a value the PRD leaves open (CGM formula, target, "material", "falling" window, "after" timing; PRD section 8), the check uses the value set in test configuration and says so. These values must be settled before the checks can be run (see Open points).

## Signal and plan (PRD 5.1)

### FR-1 Account CGM overview

Source: PRD 5.1 FR-1, AC-1.1, AC-1.2; section 2 (entitlement); section 6 Access control.

A signed-in Delivery Manager or CLT member can open an entitled account and see its CGM aggregated across all of the account's projects.

- **FR-1.1** [AC-1.1] Given a seeded test account with three or more projects and known financials, when an entitled Delivery Manager opens the account overview, then the overview shows one account-level CGM value equal to the value computed by hand from all of those projects' financials, and it lists every project of the account. Check: compare the shown value and project list with the hand-computed value and the seeded project list.
- **FR-1.2** [AC-1.1] Given the same seeded account, when the user opens the overview, then the overview shows the financial performance figures and signals of each project that feed the aggregate. Check: every seeded project appears with its figures; no project of another account appears.
- **FR-1.3** [AC-1.2; section 6 Access control] Given a signed-in user who is not entitled to account B, when that user requests account B's overview (by navigation or by direct URL/API call), then the system refuses access and shows none of account B's data. Check: the response is an access-denied result and contains no account B values.
- **FR-1.4** [section 2; section 6 Access control] Given a signed-in user entitled to account A only, when the user opens the account list, then only account A is listed. Check: the list equals the user's seeded entitlements.
- **FR-1.5** [section 2] Given a user who is not signed in, when they request any account view, then the system asks them to sign in and shows no account data. Check: no account data is returned before sign-in.

### FR-2 Margin opportunities

Source: PRD 5.1 FR-2, AC-2.1; section 3 goal "Surface margin opportunities"; section 6 Explainability.

An entitled Delivery Manager or CLT member reviewing an account overview can see where the account's CGM is below target or falling, what drives it, and the project evidence behind it.

- **FR-2.1** [AC-2.1] Given a seeded account whose CGM is below its configured target by more than the configured materiality threshold, when the user reviews the overview, then the system highlights that CGM gap with its size against the target. Check: the gap is flagged and its size equals target minus actual.
- **FR-2.2** [AC-2.1] Given a seeded account whose CGM has dropped over the configured "falling" window, when the user reviews the overview, then the system highlights the falling CGM. Check: the falling flag is shown; for an account with flat or rising CGM in the same window it is not shown.
- **FR-2.3** [AC-2.1] Given a seeded account at or above target and not falling, when the user reviews the overview, then no CGM gap is highlighted. Check: no gap flag is shown.
- **FR-2.4** [AC-2.1] Given a highlighted gap, when the user reviews it, then the system names the key cost drivers of that gap. Check: the drivers shown match the cost lines seeded to cause the gap.
- **FR-2.5** [AC-2.1; section 6 Explainability] Given a highlighted gap or driver, when the user follows its evidence link, then the system shows the project-level records it was derived from. Check: each gap and driver links to at least one project record, and the linked records are the seeded ones that cause it.

### FR-3 Optimization suggestions

Source: PRD 5.1 FR-3, AC-3.1; intent bullet 2; section 6 Explainability.

For a highlighted gap, the Delivery Manager or CLT member can see specific optimization suggestions, each with its expected CGM impact.

- **FR-3.1** [AC-3.1] Given a highlighted gap on a seeded account, when the user views its suggestions, then each suggestion names one specific change (for example a personnel grade adjustment or a leverage change on a named project). Check: every suggestion shown has a non-empty change description naming its project.
- **FR-3.2** [AC-3.1] Given the same suggestions, then each one shows its expected CGM impact as a value. Check: every suggestion has an expected-impact value; none is blank.
- **FR-3.3** [section 6 Explainability] Given a suggestion, when the user follows its evidence link, then the system shows the project-level evidence the suggestion is based on. Check: each suggestion links to at least one project record.

### FR-4 Decision record and optimization plan

Source: PRD 5.1 FR-4, AC-4.1 to AC-4.5; section 3 goal "Turn recommendations into owned decisions"; section 6 Traceability.

A Delivery Manager can record a governance decision on an entitled account as a saved optimization plan.

- **FR-4.1** [AC-4.1] Given an account with suggestions, when the Delivery Manager creates a plan, then they can mark which suggestions to adopt and which not to adopt. Check: after saving, the plan lists exactly the suggestions marked as adopted.
- **FR-4.2** [AC-4.2] Given a new plan, the Delivery Manager can add one or more action items, each with its intended change. Check: after saving and reopening, each action shows the text entered.
- **FR-4.3** [AC-4.3; section 3] Given a plan with actions, the Delivery Manager assigns one owner to each action. Check: a plan with an action that has no owner cannot be saved, and the system says which action lacks an owner.
- **FR-4.4** [AC-4.4; section 3] Given a plan, the Delivery Manager sets an expected CGM improvement target. Check: a plan without a target cannot be saved; a saved plan shows the target entered. (See Open points: the PRD states the target per plan in AC-4.4 and per action in section 3.)
- **FR-4.5** [AC-4.5; section 6 Traceability] When the Delivery Manager saves the plan, the system stores the plan and its decision record (adopted suggestions, actions, owners, target, who decided and when). Check: after sign-out and sign-in, the plan and decision record are shown unchanged, and each action links back to the suggestion it came from.
- **FR-4.6** [section 6 Traceability] Given a plan is saved, the system keeps its baseline ("before") CGM for the account at the time of saving. Check: the saved plan shows the baseline CGM equal to the account CGM shown when it was saved.

### FR-5 No automatic intervention

Source: PRD 5.1 FR-5, AC-5.1; section 4 Out of scope; section 6 Safety; intent bullet 4.

No user action in the CGM Coach changes project, staffing or financial data; the system only suggests, records and measures.

- **FR-5.1** [AC-5.1] Given a seeded account, when a Delivery Manager saves a plan that adopts a grade-adjustment suggestion, then the project, staffing and financial data are unchanged. Check: a snapshot of the source data taken before and after the save is identical.
- **FR-5.2** [AC-5.1] Given a saved plan, when an action is updated or marked implemented, then the project, staffing and financial data are unchanged. Check: same before/after snapshot comparison.
- **FR-5.3** [section 4 Out of scope] The CGM Coach offers no control to edit project financial data. Check: no screen or API endpoint of the CGM Coach accepts a change to project financials, staffing, grades or rates.

## Execute (PRD 5.2)

### FR-6 Execution tracking

Source: PRD 5.2 FR-6, AC-6.1, AC-6.2; section 2 (Action owner); section 3 goal "Measure the real impact".

The owner of an action, or the Delivery Manager of the plan, can update the action's execution status, and the system compares actual results against the plan.

- **FR-6.1** [section 2 Action owner] Given a signed-in action owner, when they open their action list, then it shows every action they own on their entitled accounts and no others. Check: the list equals the seeded actions assigned to that owner.
- **FR-6.2** [AC-6.1; section 2] Given a saved plan, when the action owner marks an action as implemented, then the action shows status "implemented" with who changed it and when. Check: reopening the plan shows the new status, user and time.
- **FR-6.3** [AC-6.1] Given a plan with implemented actions, when the user views the plan, then the system shows the actual results against the planned target. Check: the plan shows the target and the actual CGM improvement side by side.
- **FR-6.4** [AC-6.2] Given a plan whose baseline CGM and post-implementation ("after") CGM are known from seeded data, then the system shows the actual CGM improvement equal to after minus baseline. Check: the shown improvement equals the hand-computed value.
- **FR-6.5** [AC-6.2] Given the same plan, then the system shows before-and-after comparison data: baseline CGM, after CGM, planned target and actual improvement. Check: all four values are shown and match the seeded and computed values.

### FR-7 Unrealized improvement

Source: PRD 5.2 FR-7, AC-7.1, AC-7.2; section 3 goal "Measure the real impact".

The Delivery Manager or CLT member can see clearly when a plan's expected CGM improvement was not achieved.

- **FR-7.1** [AC-7.1] Given a saved plan with one or more actions not executed by the time "after" is measured, when the user views the plan, then the system marks the plan as "improvement not achieved". Check: the marker is shown; for a seeded plan where all actions are implemented and the target is met it is not shown.
- **FR-7.2** [AC-7.1] Given a plan whose actions were all implemented but whose actual improvement is below the target, then the system also marks it "improvement not achieved". Check: the marker is shown. (See Open points: the PRD names only non-execution as the trigger.)
- **FR-7.3** [AC-7.2] Given a plan marked "improvement not achieved", then the before-and-after comparison shows the shortfall (target minus actual improvement). Check: the shortfall shown equals the hand-computed value.

## Review and feedback (PRD 5.3)

### FR-8 Governance history

Source: PRD 5.3 FR-8, AC-8.1, AC-8.2; section 3 goal "Learn what works"; section 6 Traceability.

A Delivery Manager or CLT member can review an entitled account's governance and optimization history.

- **FR-8.1** [AC-8.1; section 6 Traceability] Given an account with several saved plans, when the user opens its history, then every plan is listed with its decision, actions, owners and execution status. Check: the history lists every seeded plan with these fields matching the stored records.
- **FR-8.2** [AC-8.1] Given the history, then each plan shows its before-and-after effect comparison. Check: the values match those shown on the plan itself (FR-6.5).
- **FR-8.3** [AC-8.2] Given the history, then each adopted measure is labelled "effective" or "not effective" from its measured outcome. Check: a seeded measure that met its target is labelled effective; one that missed it is labelled not effective.
- **FR-8.4** [AC-8.2] Given the history, then each suggestion that was not adopted is labelled "not adopted". Check: the suggestions left unadopted in FR-4.1 appear with that label.
- **FR-8.5** [section 6 Access control] Given a user not entitled to the account, when they request its history, then access is refused. Check: as in FR-1.3.

## Open points from the PRD

These PRD gaps block exact test values. The checks above use configured values until they are settled.

1. CGM formula and per-account target are not defined (PRD 8). Affects FR-1.1, FR-2.1, FR-6.4.
2. "Material" gap and the "falling" window are not defined (PRD 8, AC-2.1). Affects FR-2.1, FR-2.2.
3. When "after" is measured is not defined (PRD 8). Affects FR-6.4, FR-7.1.
4. How suggestions and their expected impact are produced is not defined (PRD 8). Affects FR-3.2.
5. Source of financial data and entitlements, and refresh frequency, are not defined (PRD 8). Affects FR-1, FR-6.4.
6. Sign-in and who grants entitlements are not defined (PRD 8). Affects FR-1.3 to FR-1.5.
7. Target scope: AC-4.4 has one expected improvement target per plan; section 3 has one target per action. FR-4.4 needs a decision.
8. Unrealized improvement trigger: AC-7.1 triggers only on non-execution; section 3 and intent bullet 5 also cover planned improvement that was not realized. FR-7.2 assumes both count.
9. Who may update action status: section 2 says the action owner; FR-6 says "the user". FR-6.2 assumes the action owner and the plan's Delivery Manager.
10. Roles: the PRD does not say whether CLT members may create plans or only review them. FR-4 assumes the Delivery Manager creates them.
11. "Effective" (AC-8.2) is not defined; FR-8.3 assumes "met its target".
