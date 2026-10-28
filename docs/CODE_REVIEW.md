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

The dedicated Supabase schema is installed. Vercel project `classinsights-school` exists, but the initial deployment request returned 403 pending a grant to the `devaa` team. Google Cloud project `still-smithy-513015-d6` and the ClassInsights Web OAuth client are created. Supabase Google-provider configuration and live end-to-end OAuth still need completion and verification. Do not describe the app as deployed or Google sign-in as working until those checks actually pass.

## Boundaries to resolve before broad school rollout

- School staff currently share whole-workspace access; there are no per-class staff assignments.
- Gradebook writes use one JSON document capped at 10 MB. Normalize records and introduce granular updates for large-school/high-concurrency deployment.
- Report/leaderboard links are published snapshots. Assessment corrections require a new snapshot. Roster or recipient changes revoke all existing snapshots automatically.
- Legacy data cannot recover historical rubrics or distinguish old blank-as-zero values. Import warns before replacement and stops on invalid/orphaned records.
- Backups include private records. Define retention, consent and backup responsibility with the school.
- Follow-up goals have no scheduled reminders. Staff invitations and parent shares do not send email.
- Test with separate real staff and parent Google accounts and review Google audience/publishing configuration before launch.

