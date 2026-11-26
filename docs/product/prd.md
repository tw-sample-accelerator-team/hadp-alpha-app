# PRD: Delivery Commercial Governance

Status: signed off for release 1.

## 1. Problem

Delivery Managers and CLT members are accountable for profitability at the account level, but CGM is seen project by project. Margin gaps across an account are hard to spot, their causes are hard to evidence, and optimization decisions are made without a record of who owns them or what they were expected to achieve. Once a decision is taken, nobody measures whether the planned actions were carried out or whether CGM actually improved, so the account cannot learn which measures work.

## 2. Users

| User                                 | Needs                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Delivery Manager                     | See the account's CGM gaps and drivers, plan optimization actions, assign owners and track execution.  |
| Client Leadership Team (CLT) member  | Govern account-level profitability, review decisions and their measured effect across projects.         |
| Action owner                         | Know which actions they own and update their execution status.                                         |

Every user is signed in and sees only the accounts they are entitled to.

## 3. Goals and success measures

| Goal                                                    | Measure                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Surface margin opportunities at the account level       | Every account with below-target or falling CGM shows its gaps, drivers and project evidence.    |
| Turn recommendations into owned decisions               | Every saved plan has, for each action, an owner and an expected CGM improvement target.         |
| Measure the real impact of commercial decisions         | Every plan shows actual against planned CGM, before and after, including unrealized improvement. |
| Learn what works                                        | The governance history shows, per measure, whether it was effective or not adopted.             |

## 4. Scope

### In scope (release 1)

- Account-level CGM overview aggregating the account's projects.
- Detection of below-target or falling CGM, key cost drivers and linked project evidence.
- Optimization suggestions with expected CGM impact.
- Optimization plans: adopted recommendations, action items, intended changes, owners and targets.
- Execution status tracking per action, with before-and-after CGM comparison.
- Governance and optimization history view.

### Out of scope (release 1)

- Any automatic intervention or operational change (for example changing staffing, grades or rates).
- Editing project financial data in the CGM Coach; it reads them.
- Views above the account level (portfolio or company-wide).

## 5. Functional requirements

### 5.1 Signal and plan

- **FR-1 Account CGM overview.** For an entitled account, the system shows CGM aggregated across the account's projects.
  - AC-1.1: Given the user views an entitled account, then the overview aggregates financial performance and signals across all of its projects.
  - AC-1.2: A user cannot view an account they are not entitled to.
- **FR-2 Margin opportunities.** The system identifies below-target or falling CGM across the account.
  - AC-2.1: Given below-target or falling CGM, when the user reviews the overview, then the system highlights material CGM gaps, key cost drivers and the linked project-level evidence.
- **FR-3 Optimization suggestions.** The system displays specific optimization suggestions, such as personnel grade adjustments or leverage changes, each with its expected CGM impact.
  - AC-3.1: Each suggestion names the change and its expected CGM impact.
- **FR-4 Decision record and plan.** The user records a governance decision as an optimization plan.
  - AC-4.1: The user can choose which recommendations to adopt.
  - AC-4.2: The user records the planned action items and intended changes.
  - AC-4.3: The user assigns an owner responsible for following up on each action.
  - AC-4.4: The user defines the expected CGM improvement target.
  - AC-4.5: The system saves the plan and the decision record for future tracking.
- **FR-5 No automatic intervention.** The system never executes an intervention or operational change on its own.
  - AC-5.1: Saving or updating a plan changes no project, staffing or financial data.

### 5.2 Execute

- **FR-6 Execution tracking.** The user updates the status of each planned action.
  - AC-6.1: Given a saved plan with owners, when the user marks actions as implemented, then the system compares actual execution results against the planned targets.
  - AC-6.2: The system calculates the actual CGM improvement effect and provides before-and-after comparison data.
- **FR-7 Unrealized improvement.** The system shows when planned improvement was not achieved.
  - AC-7.1: Given a saved plan, when planned actions are not executed, then the system clearly indicates that the expected CGM improvement was not achieved.
  - AC-7.2: The gap is reflected in the before-and-after comparison.

### 5.3 Review and feedback

- **FR-8 Governance history.** The user reviews the account's governance and optimization history.
  - AC-8.1: Given links between decisions, owners and outcomes, the system visualizes execution status, ownership and before-and-after effect comparisons.
  - AC-8.2: The user can identify which optimization measures were effective and which were not adopted.

## 6. Non-functional requirements

- **Access control:** every view and action is limited to accounts the signed-in user is entitled to.
- **Traceability:** every plan links its recommendation, decision, owners, actions and measured outcome; decision records are kept for the account's history.
- **Safety:** the system is read-only toward project and operational data (FR-5).
- **Explainability:** every gap, driver and suggestion links to the project-level evidence behind it.

## 7. Constraints

- Runs on Google Cloud, project `alpha-dev-80ca`, region `us-central1`.
- Internal tool for Delivery Managers and CLT members.

## 8. Open questions

- What CGM stands for and how it is calculated, and what the target per account is.
- Where project financial data and entitlements come from (source systems, refresh frequency).
- What makes a CGM gap "material", and the window used to call CGM "falling".
- How suggestions and their expected impact are produced (rules, models, or both).
- How sign-in works and who grants account entitlements.
- When "after" is measured for the before-and-after comparison.
