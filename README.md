# ClassInsights

A glass-themed school performance workspace for teachers, headmasters and families. React + Vite, Supabase Google OAuth and Postgres, deployed on Vercel.

## Run

Use Node 24 (minimum 22.12).

```sh
npm ci
# Copy .env.example to .env.local and set the project's public URL/publishable key.
npm run dev
npm test
npm run build
```

`npm run test:e2e` runs browser regressions using installed Edge on Windows. In CI it uses Playwright Chromium. Set `TEST_URL` to test an existing deployment, or `QA_OUTPUT` to save screenshots and a print PDF outside the repository.

## Workflows

- **Overview:** class/subject filters, equally weighted student averages, support flags, change in percentage points, skill focus, and school-wide class/subject overview.
- **Classes & students:** shared class rosters, subjects, guardian Google email, optional display aliases, explicit permission for leaderboard inclusion.
- **Assessments:** stable session UUIDs, editable names/dates/topic links, original scale and rubric saved with each assessment. Missing marks stay null; explicit zero counts. Absence and teacher-only comments do not create grades.
- **Syllabus:** ordered topics, covered/upcoming/missed status and covered date. Deleting a topic clears its assessment links.
- **Leaderboard:** achievement and most-improved modes, date range and minimum assessment count, shared ranks, top ten, opted-in display aliases only.
- **Reports:** one student's subject progress, assessed skills, parent-facing comment, staff-only follow-up goals, browser print/Save as PDF, and Google-account-restricted parent links.
- **School settings:** marking defaults, future assessment rubrics, JSON backup/import, staff invitations and share revocation.

Sample classroom data stays in browser storage and cannot be published. Cloud school records load only after Google sign-in; a failed cloud request never falls back to sample or empty data.

## Grading policy

Assessment percentage normalises weights over skills actually assessed. If all included weights are zero, it uses equal weights. Historical results use each session's saved maximum and element weights. Student summaries average assessed session percentages equally; the class overview averages student averages equally. Different subjects are not merged into a single academic rank.

Change compares the first and last halves of assessed observations in chronological order (the middle observation is omitted for odd counts). It is expressed in **percentage points**, not percent change. This is a descriptive signal, not a statistical prediction. Support is flagged at average below 50% or decline of at least 5 points. Improvement is at least 3 points. No marks means "Not assessed", never a failing grade.

## Database installation

The existing Student-evaluation project is `cdhiyvqszsqwhteapxpg`. The additive schema in `docs/schema.sql` and `docs/revoke-roster-shares.sql` has been applied to that project through Supabase migrations. For a separate project, apply those scripts in order through your migration workflow.

Tables:

- `ci_workspaces`: owner, versioned gradebook JSON, monotonic revision.
- `ci_staff`: Google-email invitations, managed only by the workspace owner.
- `ci_shares`: expiring, revocable report/leaderboard snapshots.

All tables use RLS. Google-authenticated owners and invited staff may read/edit their school workspace. Parents have no workspace access. Database grants disallow changing workspace ownership through the client. A revision predicate and trigger prevent stale whole-state saves. The app retains a recovery draft when persistence fails.

The `ci_private` schema holds narrow authorization functions. The only public RPC is an invoker wrapper, `ci_read_share`. Its private definer function intentionally permits anonymous reads of a specific non-expired leaderboard UUID. Parent snapshots require a Google JWT whose email matches the designated recipient. No anonymous table reads, share listings, or workspace reads are granted.

`tests/access-control.sql` exercises anonymous isolation, correct/wrong parent, unrelated user, owner/staff access, invitation restrictions, stale writes, expiry and revocation. It uses synthetic fixtures inside a transaction which rolls back. Run it only against the intended test/project database. Supabase security advisors returned no findings for the new schema during implementation.

Any change to a class roster (including sharing permission, display name, or guardian recipient) revokes **all existing snapshots** for that school workspace. This deliberately prevents old links from retaining a removed student's information. Assessment edits do not rewrite existing snapshots: publish a new report when marks change.

## Google sign-in configuration

Only the public Supabase URL and publishable key belong in Vite/Vercel environment variables. Never put a Google client secret or Supabase service-role key in this repository or client bundle.

1. Configure a Web application OAuth client in the dedicated **ClassInsights** Google Cloud project (`still-smithy-513015-d6`).
2. Set its authorized redirect URI to `https://cdhiyvqszsqwhteapxpg.supabase.co/auth/v1/callback`.
3. Configure that client ID and secret in Supabase Authentication → Sign-in providers → Google. Keep the secret in Supabase.
4. Set the Supabase Site URL to the actual Vercel production origin. Allow production `/` and `/share/**` callback URLs, plus `http://127.0.0.1:5173/**` for development. Do not allow arbitrary production redirect hosts.
5. Use only basic OpenID/email/profile sign-in scopes. School records are protected by database policies, not Google domain assumptions. If Google remains in Testing, only configured test users can sign in; change audience/publishing status after the required owner review.

See [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## Vercel

Project: `classinsights-school`. Framework: Vite. Install: `npm ci`. Build: `npm run build`. Output: `dist`. Node: 24.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the relevant deployment environments, then build again. `vercel.json` provides SPA deep links, CSP, clickjacking protection, restricted browser capabilities and no-referrer handling for capability links. Only the production app needs public access; keep preview deployment protection enabled.

After deploying, verify `/`, `/share/<token>`, Google callback, mobile layout, and account-specific parent access. A successful build is not proof of working OAuth configuration.

## Migrating v1 records

The old app stored all records on the original browser origin; changing hosting does not move them.

1. Keep the original app/browser profile intact.
2. Review and run `public/legacy-export.js` in the **original app's** browser console. It downloads a JSON backup without the old password hash or demo license. Do not run arbitrary scripts from other sources.
3. Sign in to the new app, export any current gradebook backup, then use School settings → Import backup.
4. Inspect the imported classes, assessment counts and representative grades before relying on the new copy.

Historical v1 scales/weights were never saved. Import necessarily uses the last stored settings and subject rubrics; it cannot reconstruct prior configurations. Legacy zeros also cannot be distinguished from blanks. The UI explicitly warns about this before import. New records use the corrected model. Orphans, duplicate legacy entries, invalid dates and out-of-scale scores stop import instead of being discarded silently.

## Pilot boundaries

This version uses one school JSON document with optimistic concurrency and a 10 MB database limit. For large schools or simultaneous high-volume entry, migrate to normalized assessment/student tables and granular updates before scaling. Staff permissions currently cover the entire school workspace, not individual class assignments. Follow-up goals have no automatic notification service. No email is sent when staff access or report links are created: share the generated link yourself.

Before a school-wide launch, finish live Google OAuth verification, test with separate teacher and parent accounts, review school consent/retention requirements, and define backup ownership. Student achievement is one signal: use growth, effort and supportive follow-up alongside any competition.
