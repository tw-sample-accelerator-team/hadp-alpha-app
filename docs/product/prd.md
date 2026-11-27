# PRD: CGM Actions Tracker (Slice 1: Create and track CGM actions)

Status: draft (awaiting sign-off) · Owner: TBD (CGM governance product owner) · Version 0.1 · Source: `requirement.pdf` "Slice 1 | Create and track CGM actions"

## 1. Problem

The Client Leadership Team (CLT) reviews each account's Client Gross Margin (CGM) in Project Accounting (PA) → Account Level View. In those reviews they agree on actions to improve CGM, such as "review the staffing mix on Project A".

Today those decisions are not recorded where the review happens. As a result:

- Nothing in PA records who owns each agreed action.
- At the next review the team cannot see which actions were started or done.
- The expected CGM improvement of a decision is not written down, so it cannot later be compared with the result.

## 2. Users

| User | Goal |
| --- | --- |
| CLT member (account review lead) | Record agreed actions with an owner and an expected CGM improvement, and follow them up at the next review |
| Action owner (for example, Delivery Manager, PM) | Be named on an action. In Slice 1 the CLT updates the status during the review; owners who are not CLT members cannot reach the tracker (§8, Q8) |
| Market lead, PA admin, power user | See the actions of the accounts they already have access to in PA |

## 3. Goals and success measures

| Goal | Measure | Target after 3 months of pilot |
| --- | --- | --- |
| Agreed decisions are recorded | Pilot account reviews that end with at least one tracked action | 80% |
| Every action has an owner | Actions with an owner | 100% (enforced) |
| Progress is visible at the next review | Actions whose status was updated at least once before the next review | 60% |
| No extra sign-in friction | Embedded sessions that needed a separate sign-in | 0% |

## 4. Scope

### 4.1 In scope (Slice 1)

- An Actions Tracker for one account, opened from PA Account Level View when exactly one account is selected.
- Creating an action with the fields in §4.3.
- One list of the account's actions, both account-wide and project-linked.
- Updating an action's status.
- Seamless sign-in with the user's PA session, and access rules identical to PA's account access.

### 4.2 Out of scope (Slice 1)

- Measuring actual CGM impact against the expected improvement (the wider governance use case).
- Editing an action's title, planned change, project, owner or expected improvement after it is created, and deleting actions (see §8, Q3).
- Notifications, reminders and due dates.
- Views across several accounts or across markets.
- Using the tracker outside PA (standalone URL or Salesforce embedding).
- Writing anything back to Salesforce or PA.

### 4.3 Action fields

| Field | Rule |
| --- | --- |
| Action title | Required, 1–120 characters |
| Planned change | Required, 1–2,000 characters: what the owner is expected to do or follow up on |
| Account | The account selected in Account Level View; set automatically and not editable |
| Related project | Optional; must be a project (`pse__Proj__c`) of the selected account |
| Owner | Required; one active person (Salesforce resource Contact), chosen by searching by name or email |
| Expected CGM improvement | Required; percentage points, from −100.0 to +100.0 with one decimal place, shown signed (for example, "+1.0 pp") |
| Status | One of Open, In Progress, Implemented; a new action starts as Open. **Implemented** means the agreed change was carried out (measuring its CGM effect is out of scope) |

Field length limits, list ordering, the audit trail (FR-10), the session-end message (FR-12) and rollout gating (FR-13) are **assumptions added by this PRD**; the requirement does not state them. Confirm them at sign-off.

## 5. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-1 | When PA opens the tracker for an account, the tracker shows that account's name and its actions list, and the user sees no sign-in prompt. |
| FR-2 | A user can choose **Create Action** and fill a form with the fields in §4.3. The account is pre-filled from PA and cannot be changed. |
| FR-3 | The Related project picker lists only the selected account's projects, by project name, with a "No specific project (account-wide)" choice. |
| FR-4 | The Owner picker searches active people by name or email after at least 2 typed characters, and stores the chosen person's name, email and employee id. |
| FR-5 | Saving is refused, with a message next to each wrong field, when a required field is empty, a field exceeds its length, the expected improvement is outside −100.0 to +100.0 or has more than one decimal place, or the project is not one of the account's projects. |
| FR-6 | A saved action has status Open and appears in the account's list without a page reload. |
| FR-7 | The list shows every action of the account: account-wide and project-linked. Each row shows title, planned change, related project (or "Account-wide"), owner, expected improvement (for example, "+1.0 pp"), status and last-updated date. Rows are ordered Open, then In Progress, then Implemented, newest first within each group. |
| FR-8 | When the account has no actions, the tracker shows an empty-state message and a **Create Action** button. |
| FR-9 | A user can change an action's status to any of Open, In Progress or Implemented. The new status is saved and shown the next time anyone opens the tracker for that account. |
| FR-10 | Every create and every status change records who did it (employee id and name) and when. The action shows who created it and when it was last updated. |
| FR-11 | A user can see, create or update the actions of an account only if PA grants them access to that account. Anyone else gets a "You don't have access to this account" message, and the API returns 403. |
| FR-12 | When the user signs out of PA or their PA session ends, the tracker stops making API calls and shows a "Session ended, reload Project Accounting" message. |
| FR-13 | The Actions Tracker entry in Account Level View appears only when exactly one account is selected and the `CGM_ACTIONS_TRACKER` feature rollout is enabled for that account's market. |

## 6. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Scale | Up to 500 accounts, 20 actions per account a year, 300 named users, 30 at the same time |
| Performance | The actions list loads in under 1.5 s at p95 inside the iframe, PA data calls included; a save completes in under 1 s at p95 |
| Availability | 99.5% from Monday 00:00 to Friday 24:00 UTC; an outage must not break the rest of PA (the tab shows an error and the other tabs work) |
| Data protection | Daily backups kept for 7 days; RPO 24 h, RTO 4 h; actions are kept for the life of the account (no automatic deletion) |
| Security | Only callers with a valid PA Okta access token for the environment (right issuer, audience `api://default`, an `emp` claim) are served. The app can be framed only by PA's origins. Data is encrypted in transit and at rest. Tokens are never stored in browser storage or logs |
| Privacy | Stores only the owner's and actor's name, email and employee id; no other personal data |
| Accessibility | WCAG 2.1 AA for the list and the form |
| Embedding | Usable from 900 px wide (the PA content area), with no horizontal scroll at that width |
| Auditability | Status history is append-only |

## 7. Constraints

- Built and deployed with HADP: React (Vite) web UI and a TypeScript (bun) hexagonal backend that owns its PostgreSQL database, on GCP Cloud Run with Pulumi.
- Authentication reuses PA's Okta session through PA's existing iframe token bridge (as for CGM Coach). There is no separate sign-in for embedded use.
- Account access, projects and people come from PA's backend, calling it with the user's own token. The tracker does not use its own Salesforce credentials in Slice 1.
- Four environments matching PA: dev, qa, uat, prod. Each one accepts tokens only from the Okta issuer PA uses in that environment.
- PA changes, an Account Level View tab and a bridge origin, are a separate change in the PA frontend repo, owned by the PA team.

## 8. Open questions

| # | Question | Proposed default |
| --- | --- | --- |
| Q1 | The requirement shows an expected CGM improvement of both "31.0 pp" and "+1.0 pp". Is the value a delta in percentage points (for example, +1.0), or a target CGM % (for example, 31.0%)? | A signed delta in percentage points |
| Q2 | Who may create or change actions: anyone with PA access to the account, or CLT members only (not PM-only users)? | Anyone with PA access to the account |
| Q3 | Must Slice 1 let users fix a typo in an action, or delete an action created by mistake? | Not in Slice 1; add an "edit fields" FR if needed |
| Q4 | Are status moves free (any to any), or forward only (Open → In Progress → Implemented)? Is a "Dropped" status needed? | Free moves; no Dropped status |
| Q5 | Should the owner be limited to the account's people (CLT, PMs and DPMs), or can it be any active person? | Any active person; the account's people listed first in a later slice |
| Q6 | Which GCP project and GitHub org will host the tracker? | Same as CGM Coach: `project-accounting-<env>` GCP projects, `techops-e2ecs` org |
| Q7 | Which markets get the pilot? | Set in `PA_Feature_Rollout_Config__c` record `CGM_ACTIONS_TRACKER` |
| Q8 | Account Level View lists only accounts where the user is a CLT member or market lead, so PM-only owners never see the tab. Should owners update their own actions in Slice 1 (for example, a tracker entry on the PA project page)? | No: in Slice 1 the CLT updates status during the review; owner self-service comes in a later slice |
| Q9 | The walkthrough assigns the action to "the Delivery Manager", a role. Is a named person always required as owner? | Yes, a named person (FR-4); the role can go in the planned change text |
