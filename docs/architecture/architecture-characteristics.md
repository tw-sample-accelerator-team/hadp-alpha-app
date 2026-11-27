# Architecture characteristics: CGM Actions Tracker (Slice 1)

Sources: `docs/product/prd.md` (PRD v0.1, mainly §3, §6 and §7), `docs/requirements/key-frs.md` (key FRs), with `docs/tech-spec.md` for context only.
Scope is Slice 1 (PRD §4.1). "FR-n" means the key FRs in `docs/requirements/key-frs.md`; PRD sections are cited as "PRD §n".

These are the top seven characteristics, in priority order. Each one has a measurable target, a way to check it, and the requirements it comes from. The scale in PRD §6 (500 accounts, 20 actions per account a year, 300 named users, 30 at the same time) is the load for every target below.

## Summary

| ID | Characteristic | Measurable target | Driven by |
| --- | --- | --- | --- |
| AC-1 | Security: authentication and token confidentiality | 100% of `/api/*` calls without a valid PA Okta token for the environment get 401; 0 tokens in browser storage, URLs or logs; framed only by PA origins | FR-1, FR-22, FR-23; PRD §6 Security, §7 |
| AC-2 | Authorisation fidelity: access follows PA exactly | 100% of list, create and update calls for an account PA denies get 403 with no data returned or changed; 0 actions of another account returned | FR-4, FR-11, FR-13, FR-20, FR-21; PRD §5 FR-11, §7 |
| AC-3 | Performance | Actions list p95 < 1.5 s inside the iframe, PA calls included; save (create or status change) p95 < 1 s; at 30 concurrent users | FR-1, FR-12, FR-13, FR-17; PRD §6 Performance, Scale |
| AC-4 | Availability and fault isolation | 99.5% availability Monday 00:00 to Friday 24:00 UTC; a tracker or PA-backend outage never breaks the rest of PA | FR-1, FR-20; PRD §6 Availability |
| AC-5 | Data integrity, auditability and recoverability | 100% of creates and status changes have one append-only history row; 0 lost updates; RPO 24 h, RTO 4 h, daily backups kept 7 days | FR-7, FR-12, FR-17, FR-18, FR-19; PRD §6 Auditability, Data protection, Privacy |
| AC-6 | Embeddability (interoperability with PA) | Works in PA's iframe through PA's existing token bridge with no bridge change; token handshake ≤ 3 s; no horizontal scroll at 900 px | FR-1, FR-2, FR-23; PRD §3 (0% separate sign-in), §6 Embedding, §7 |
| AC-7 | Accessibility | WCAG 2.1 AA for the list and the form: 0 serious or critical axe violations; every field and control usable by keyboard and labelled | FR-3, FR-5, FR-6, FR-8, FR-9, FR-10, FR-14, FR-16; PRD §6 Accessibility |

## AC-1 Security: authentication and token confidentiality

- **Why.** The tracker serves only PA users, reuses PA's Okta session, and must not leak the user's token (PRD §6 Security, §7). Each environment accepts tokens only from its own PA Okta issuer (PRD §7).
- **Target.**
  - 100% of `/api/*` requests with no token, an expired token, a wrong issuer, a wrong audience (not `api://default`) or no `emp` claim get 401 (FR-22).
  - 0 occurrences of an access token in `localStorage`, `sessionStorage`, cookies, URLs or log lines.
  - The web app can be framed only by PA's origins for that environment; framing from any other origin is refused.
  - After the PA session ends, 0 further API calls from the tracker (FR-23).
  - Data encrypted in transit (TLS only) and at rest.
  - Personal data stored is limited to name, email and employee id of owners and actors (PRD §6 Privacy).
- **How to check.** Automated auth test matrix for the five token cases on every `/api/*` route; a browser test that inspects storage and the URL after sign-in; a log scan for token patterns in CI and in deployed logs; a framing test from a non-PA origin (blocked by `frame-ancestors`); a network-log assertion after the session-end message; schema review against the privacy list.

## AC-2 Authorisation fidelity: access follows PA exactly

- **Why.** Access rules must be identical to PA's account access, decided by PA's backend with the user's own token, with no tracker-held Salesforce credentials (PRD §4.1, §7; FR-20, FR-21).
- **Target.**
  - 100% of list, create and status-update calls for an account PA denies return 403, and no data is returned or changed (FR-21).
  - 0 actions of another account appear in a list (FR-13), and 0 creates succeed that name another account or another account's project (FR-4, FR-11).
  - An access decision is never older than the cache lifetime set in design (at most 5 minutes) after PA changes it.
- **How to check.** API tests per endpoint with a user PA denies (seeded "no access" account in local mode); cross-account seed tests for list, create and project id; a test that a revoked access is refused once the cache lifetime has passed.

## AC-3 Performance

- **Why.** The list must load inside the iframe during a live account review, and PA data calls are part of the path (PRD §6 Performance).
- **Target.**
  - Actions list (first open of the tracker, FR-1, FR-13): p95 < 1.5 s end to end inside the iframe, PA calls included.
  - Save of a create (FR-12) or a status change (FR-17): p95 < 1 s.
  - Held at 30 concurrent users with 500 accounts of seeded data (PRD §6 Scale).
- **How to check.** A load test in a deployed environment (not a laptop) at 30 concurrent users; p95 from the per-request log line (`ms`, PA call timings) and from browser timing in the E2E run.

## AC-4 Availability and fault isolation

- **Why.** The tracker is used in scheduled reviews and is one tab of PA; it must not take PA down with it (PRD §6 Availability).
- **Target.**
  - 99.5% availability from Monday 00:00 to Friday 24:00 UTC, measured per calendar month.
  - When the tracker API, its database or PA's backend is down, the tracker tab shows an error state ("Project Accounting is unavailable, try again" or similar) within 5 s, and 100% of other PA tabs keep working.
- **How to check.** An uptime check on the web and API health endpoints during the stated window; a fault-injection test that stops the API and stubs PA as failing, then checks the tab's error state and that the host page stays usable.

## AC-5 Data integrity, auditability and recoverability

- **Why.** Every create and status change must record who and when, the history is append-only, and actions are kept for the life of the account (PRD §6 Auditability, Data protection; FR-18, FR-19). Several CLT members may update the same action in one review (FR-17).
- **Target.**
  - 100% of creates and status changes write exactly one history row with actor employee id, name and time, in the same transaction as the change (FR-18).
  - 0 history rows updated or deleted: the application's database role has no update or delete right on history and no delete right on actions.
  - 0 lost updates on concurrent status changes: a stale change is refused, not silently overwritten.
  - 0 duplicate actions from a repeated save of the same form.
  - Owner name, email and employee id stored exactly as PA returns them (FR-7).
  - Daily backups kept 7 days; RPO 24 h; RTO 4 h; no automatic deletion of actions.
- **How to check.** Repository tests against a real Postgres for history rows, grants (delete refused) and concurrent updates; an idempotency test for repeated saves; a restore drill in a non-prod environment, timed against the 4 h RTO.

## AC-6 Embeddability (interoperability with PA)

- **Why.** The tracker exists only inside PA Account Level View, with no separate sign-in, and the PA-side change is owned by another team (PRD §3, §4.2, §6 Embedding, §7).
- **Target.**
  - 0% of embedded sessions show a separate sign-in (PRD §3; FR-1).
  - The token handshake with PA's existing bridge completes in ≤ 3 s, or the tracker shows the session-ended state (FR-23).
  - 0 changes needed to PA's existing token bridge; the PA-side change is limited to the tab, the iframe and per-environment config (PRD §7).
  - No horizontal scroll at 900 px wide, for the list and the form (PRD §6 Embedding).
  - Opened outside PA, the tracker shows only the "open it from Project Accounting" message and makes 0 API calls (PRD §4.2).
- **How to check.** E2E tests through the dev host page that speaks PA's bridge protocol, and a pre-release E2E against real PA; a viewport test at 900 px that asserts `scrollWidth <= clientWidth`; a direct-URL test with a network-log assertion.

## AC-7 Accessibility

- **Why.** The list and the form must meet WCAG 2.1 AA (PRD §6 Accessibility).
- **Target.**
  - 0 serious or critical axe violations on the list, empty state, create form (with field errors shown) and status control (FR-3, FR-5, FR-6, FR-8 to FR-10, FR-14, FR-16).
  - 100% of form fields have a visible label, and each field error is announced and linked to its field (FR-8 to FR-10).
  - Every action (create, pick project, search owner, save, change status) can be done by keyboard alone.
- **How to check.** axe checks in the Playwright E2E run for each state; a scripted keyboard-only walkthrough of create and status change; a manual screen-reader check before release.

## Not chosen as top characteristics

- **Scalability.** The load is small and fixed (PRD §6 Scale); it is the test load for AC-3 and AC-4, not a separate target.
- **Privacy.** Folded into AC-1 (what personal data is stored) and AC-5 (owner data copied from PA).
- **Deployability across dev, qa, uat and prod.** A delivery constraint (PRD §7); the per-environment issuer rule is checked under AC-1.
