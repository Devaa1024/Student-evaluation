# Code review and validation

Baseline reviewed: `c1d953d7af13be68241d0427e430991d0ea8aa1d` (single-file v1).
The v2 branch replaces the local-device demo lock and subscription screen with Google/Supabase authentication and a versioned school workspace.

## Fixed failure modes

| Trigger | Old behavior | New behavior |
|---|---|---|
| Change global scale or skill weights | Historical grades silently changed, sometimes above 100% | Each assessment retains its scale and rubric |
| Enter a note or absence without marks | Zero-grade assessment could be created | No marks means unassessed; absence is separate |
| Leave some skills blank | Blank marks became zero | Null marks are excluded; explicit zero is retained |
| Storage quota/network failure | Failure warning could be followed by a success toast | Failure propagates; editor retains the draft and offers recovery export |
| Rename a session | Additional records were created | Stable assessment UUID updates the same record |
| Clear a topic selection | Old link remained | Explicit empty value unlinks the topic |
| Two tabs/staff save concurrently | Last write silently lost prior changes | Optimistic revision predicate and database trigger reject stale writes |
| Early-morning date entry | UTC date could be the previous local day | Calendar inputs use local date fields |
| New unassessed skill | Report could label it a weakness | No-data skills display as unassessed; no invented automatic narrative |
| Custom labels include markup | Chart legend used raw innerHTML | React renders text safely |
| Navigate away while entering marks | Silent loss of draft | Dirty-assessment confirmation and unload protection |
| Parent/public access | Browser-only lock offered no server authorization | RLS, Google account matching for parent reports, expiring UUID snapshots |
| Student/recipient/permission changes | Previously shared copies could persist | Database trigger revokes prior workspace snapshots |

## Verification

- 17 Node regression tests: scoring, bands, missing data, original scale/rubric, chronology, decline/improvement, local dates, persistence failure, stale-tab writes, schema rejection, legacy import, parent isolation and leaderboard minimization.
- 6 Playwright/Edge browser tests: login/sample overview, support filtering, report draft and follow-up goal, assessment create/edit/rename/reload, historical scale, achievement/growth boards, demo sharing boundary, consent defaults, HTML escaping, failed persistence and 390 px mobile layout.
- Built-in browser desktop inspection and interaction checks, followed by Playwright/Edge responsive checks because the built-in browser viewport override did not reliably apply to the app tab.
- Postgres authorization test transaction: anonymous table access denied; public board allowed only by valid token; designated/wrong parent; unrelated Google user; owner; invited staff; staff cannot invite others; stale update rejected; expired/revoked links; roster-change revocation. All fixtures roll back.
- Supabase security advisors: no findings after both migrations.
- Production dependency audit: zero reported vulnerabilities after updating Zod to 4.6.7.
- Production build passes. Both pages of the browser-generated parent PDF were rendered with Poppler and visually inspected. A chart/skill-row overlap was corrected, chart height was reduced for clean two-page pagination, and text extraction confirmed the parent note is included while the staff-only goal is excluded.

## Visual direction

Image-generated glass dashboard concept: frosted white sidebar, mint/lavender ambient background, teal action controls, a four-metric strip, chart plus teaching-focus panel, readable student table. Implementation was inspected for these five features plus typography, spacing, and responsive continuation. Actual sample metrics replace the concept's illustrative values. School overview copy and navigation follow the concept; the school-wide table, support filter, and explicit sample-state indicator are functional additions.

## Remaining deployment/account verification

Vercel production is live at https://classinsights-school.vercel.app. Google login, callback, persisted session, workspace creation and cloud updates were verified with the owner account. Owner SELECT policy was corrected for INSERT ... RETURNING. Separate real staff/parent account testing remains outstanding.

The November 4 update adds a private `/admin` route, server-owned admin membership, payment ledger, Pro activation requests, calendar-month expiry and paid-data enforcement. A free account cannot add student/mark data through direct API calls or import, create shares, invite staff, edit plan tables or call admin RPCs. An activation request alone grants nothing. Existing school records are preserved on expiry. Manual payment references are unique; no test receipt or paid plan is retained in production. Automated merchant checkout is not connected.

Validation added: free-teacher schedule creation/overlap rejection, paid UI gates and feature guide; non-admin URL denial; transactional free/paid/expired access, forged user metadata, admin-only receipt recording, duplicate reference rejection, and January/February/March/leap-year calendar anchors. Private billing/admin tables deliberately have RLS and no client policies/grants; security advisors report those as informational deny-by-default tables. The existing leaked-password protection warning also remains; the app uses Google sign-in.

## Boundaries to resolve before broad school rollout

- School staff currently share whole-workspace access; there are no per-class staff assignments.
- Gradebook writes use one JSON document capped at 10 MB. Normalize records and introduce granular updates for large-school/high-concurrency deployment.
- Report/leaderboard links are published snapshots. Assessment corrections require a new snapshot. Roster or recipient changes revoke all existing snapshots automatically.
- Legacy data cannot recover historical rubrics or distinguish old blank-as-zero values. Import warns before replacement and stops on invalid/orphaned records.
- Backups include private records. Define retention, consent and backup responsibility with the school.
- Follow-up goals have no scheduled reminders. Staff invitations and parent shares do not send email.
- Test with separate real staff and parent Google accounts and review Google audience/publishing configuration before launch.

