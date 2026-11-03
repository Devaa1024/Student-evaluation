const topics = [
  [
    "Account & school setup",
    "Sign in with Google. Create one workspace for your school or tuition centre, then set its name and your display name. Class, subject and schedule creation are free. Google confirms your email; it does not certify teaching credentials.",
  ],
  [
    "Classes & subjects · Free",
    "Open Classes & students. Add a class (for example Year 4 A), then add subjects inside it. Select a class and subject in the controls above each page. Rename using the pencil. Deleting a class or subject also removes associated records; export first.",
  ],
  [
    "Weekly schedule · Free",
    "Open Schedule, choose a class and subject, and add the weekday, start, end and optional room. Times are Malaysia time. Lessons repeat weekly. Overlapping lessons for the same class are rejected. Remove a lesson and add it again to change its time.",
  ],
  [
    "Students · Pro",
    "Add each student to the correct class. Guardian name and Google email are optional until you want to share a report. Leaderboard sharing starts off. Record permission and a display alias before including a student on a board.",
  ],
  [
    "Assessments · Pro",
    "Choose class and subject, create an assessment, enter date and name, then enter marks and save. Leave unassessed skills blank; use zero only for an actual zero. Absence does not create a grade. Private teacher comments are not included in parent reports. Existing assessments keep their original marking scale and rubric.",
  ],
  [
    "Performance overview · Pro",
    "Filter by class and subject to see averages, assessed student counts, skill gaps and support flags. Averages exclude missing marks and absence. Change is measured in percentage points. A support flag is a prompt for teacher review, not an automatic decision about a child.",
  ],
  [
    "Lesson topics · Pro",
    "Under Schedule, expand Lesson topics. Add learning milestones, reorder them, and mark them upcoming, covered or missed. You can link assessments to topics. Deleting a topic unlinks it from assessments.",
  ],
  [
    "Leaderboards · Pro",
    "Choose achievement or growth, a date range and minimum observation count. Only opted-in students with display aliases appear. Growth rewards improvement rather than just high marks. New shared boards are expiring snapshots, not live feeds.",
  ],
  [
    "Reports & follow-up · Pro",
    "Select a student to see subject progress. Add a parent-facing update; staff goals remain private. Print or save as PDF. A private parent link requires the exact guardian Google email. Updating marks requires publishing a fresh snapshot.",
  ],
  [
    "Staff access · Pro",
    "The owner grants access to a teacher Google email. Staff currently see and edit the entire workspace; class-only assignments are not available. No invitation email is sent automatically. Share the app address with the teacher. Remove staff access in Settings.",
  ],
  [
    "Backups & existing data · Always available",
    "Export a JSON backup before bulk changes. It contains private student information and teacher notes, so keep it securely. Imports replace the workspace after validation and confirmation; imports that change student or assessment records require Pro. Existing records stay readable/exportable after expiry.",
  ],
  [
    "Shared links & consent · Always available",
    "Links expire after seven days and can be revoked in Settings. Changing student rosters, aliases, guardian recipients or permission revokes existing school snapshots. Anyone holding a board link can view its opted-in aliases, so share it carefully. Parent reports additionally require the designated Google account.",
  ],
  [
    "Plan & payments",
    "Pro costs RM19.90 for one calendar month, not 30 days. The paying owner’s membership covers their workspaces and invited staff. Payment is currently arranged and verified manually; an activation request is not proof of payment. No automatic renewal is enabled. Only a verified payment recorded by the platform administrator grants access.",
  ],
  [
    "Saving & recovery",
    "Wait for Changes saved before leaving. If saving fails, export the recovery copy. If another teacher saved first, reload before retrying; this prevents overwriting their work. Do not import an older backup over newer work without checking with your colleagues.",
  ],
];
export default function Guide() {
  return (
    <section className="glass">
      <h2>Your ClassInsights guide.</h2>
      <p>Start with free setup. Open a topic below when you need it.</p>
      {topics.map(([title, body]) => (
        <details className="guide-item" key={title}>
          <summary>{title}</summary>
          <p>{body}</p>
        </details>
      ))}
    </section>
  );
}
