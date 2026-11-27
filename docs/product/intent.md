# Intent: CGM Actions Tracker (Slice 1)

The product owner's intent for release 1 (Slice 1, "Create and track CGM actions"):

- Let a CLT member record the CGM improvement actions agreed in an account review, give each one an owner and an expected CGM improvement, and track its status.
- Show the account-wide and project-specific actions of one account in one list that answers: what did we agree, who owns it, where does it stand.
- Build it as a separate application with HADP: a React web UI and a TypeScript backend on Cloud Run, with its own PostgreSQL database, on Thoughtworks GCP.
- Show it inside Project Accounting (PA) as an iframe under Account Level View → Actions Tracker for the selected account.
- Sign-in must be seamless. A user signed in to PA is never asked to sign in again. The tracker uses PA's Okta session (the same pattern PA already uses for the embedded CGM Coach).
- Account, project and people data stay where they are (Salesforce, through PA). The tracker stores only actions. It never writes to Salesforce or PA.
- Who may see an account's actions follows PA's existing account access rules exactly.
- Do not build in release 1: measuring actual CGM impact against the target, notifications or reminders, reporting across accounts, a standalone (non-embedded) entry point, or editing an action's fields other than status.
