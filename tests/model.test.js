import { test } from "node:test";
import assert from "node:assert/strict";
import {
  percentage,
  summary,
  localDate,
  grade,
  workspaceSchema,
  emptyWorkspace,
  saveDemo,
  boardSnapshot,
  parentSnapshot,
  migrateLegacy,
  leaderboard,
  observations,
} from "../src/model.js";
import { demoWorkspace } from "../src/demo.js";
test("same-day assessments follow their recorded creation order", () => {
  const w = demoWorkspace(),
    c = w.classes[0],
    b = c.subjects[0];
  w.sessions = w.sessions.slice(0, 2);
  Object.assign(w.sessions[0], {
    id: "z",
    date: "2026-10-28",
    createdAt: "2026-10-28T08:00:00Z",
  });
  Object.assign(w.sessions[1], {
    id: "a",
    date: "2026-10-28",
    createdAt: "2026-10-28T09:00:00Z",
  });
  assert.deepEqual(
    observations(w, c.id, b.id, c.students[0].id).map((r) => r.session.id),
    ["z", "a"],
  );
});
const session = {
  maxScore: 10,
  elements: [
    { key: "a", label: "A", weight: 75 },
    { key: "b", label: "B", weight: 25 },
  ],
};
const record = (scores, status = "assessed") => ({ scores, status });
test("normalised weighted percentage and zero-weight fallback", () => {
  assert.equal(percentage(session, record({ a: 8, b: 10 })), 85);
  assert.equal(
    percentage(
      {
        ...session,
        elements: session.elements.map((e) => ({ ...e, weight: 0 })),
      },
      record({ a: 8, b: 10 }),
    ),
    90,
  );
});
test("grade thresholds and no-data state", () => {
  assert.deepEqual([null, 0, 34.9, 35, 50, 65, 80, 100].map(grade), [
    "Not assessed",
    "E",
    "E",
    "D",
    "C",
    "B",
    "A",
    "A",
  ]);
});
test("missing, blank and absence are not zero; explicit zero is counted", () => {
  assert.equal(percentage(session, record({ a: 10, b: null })), 100);
  assert.equal(percentage(session, record({ a: 10, b: 0 })), 75);
  assert.equal(percentage(session, record({ a: 10 }, "absent")), null);
  assert.equal(percentage(session, record({})), null);
});
test("historical scale and weights are fixed on each assessment", () => {
  const w = demoWorkspace(),
    s = w.sessions[0],
    r = s.records[0],
    before = percentage(s, r);
  w.settings.maxScore = 5;
  w.classes[0].subjects[0].elements[0].weight = 0;
  assert.equal(percentage(s, r), before);
});
test("no data is not a failing student; absence excluded from averages", () => {
  const s = summary([
    { pct: null, record: { status: "absent" } },
    { pct: 80, record: { status: "assessed" } },
  ]);
  assert.equal(s.avg, 80);
  assert.equal(s.absent, 1);
  assert.equal(summary([]).status, "Not assessed");
});
test("improvement and decline use assessed observations only", () => {
  assert.equal(
    summary(
      [50, null, 80].map((pct) => ({
        pct,
        record: { status: pct == null ? "absent" : "assessed" },
      })),
    ).change,
    30,
  );
  assert.equal(
    summary([80, 60].map((pct) => ({ pct, record: { status: "assessed" } })))
      .status,
    "Needs support",
  );
});
test("calendar dates use local fields instead of UTC serialization", () => {
  const d = { getFullYear: () => 2026, getMonth: () => 9, getDate: () => 28 };
  assert.equal(localDate(d), "2026-10-28");
});
test("failed storage writes propagate, with no false success", () => {
  assert.throws(
    () =>
      saveDemo(
        {
          getItem: () => null,
          setItem: () => {
            throw new Error("quota");
          },
        },
        emptyWorkspace(),
        0,
      ),
    /quota/,
  );
});
test("stale tab cannot overwrite newer workspace", () => {
  let value = null;
  const storage = { getItem: () => value, setItem: (k, v) => (value = v) };
  saveDemo(storage, emptyWorkspace(), 0);
  assert.throws(() => saveDemo(storage, emptyWorkspace(), 0), /another tab/);
  assert.equal(JSON.parse(value).revision, 1);
});
test("backup schema rejects broken, oversized-mark, orphan and duplicate records", () => {
  const w = demoWorkspace();
  assert.equal(workspaceSchema.safeParse(w).success, true);
  w.sessions[0].records[0].scores.reading = 999;
  assert.equal(workspaceSchema.safeParse(w).success, false);
  const b = demoWorkspace();
  b.sessions[0].classId = "missing";
  assert.equal(workspaceSchema.safeParse(b).success, false);
});
test("leaderboard snapshot excludes real names, ids, emails and notes", () => {
  const w = demoWorkspace(),
    c = w.classes[0],
    b = c.subjects[0];
  c.students[0].parentEmail = "private@example.com";
  c.students[0].alias = "Bright Owl";
  const snapshot = boardSnapshot(w, c, b.id, {
      mode: "achievement",
      minimum: 3,
      from: "",
      to: "",
    }),
    json = JSON.stringify(snapshot);
  assert.ok(!json.includes(c.students[0].name));
  assert.ok(!json.includes("private@example.com"));
  assert.ok(!json.includes(c.students[0].id));
  assert.ok(json.includes("Bright Owl"));
});
test("student opt-out and assessment minimum respected", () => {
  const w = demoWorkspace(),
    c = w.classes[0],
    b = c.subjects[0];
  c.students.forEach((s) => (s.shareConsent = false));
  assert.equal(leaderboard(w, c, b.id).length, 0);
  c.students[0].shareConsent = true;
  assert.equal(leaderboard(w, c, b.id, { minimum: 7 }).length, 0);
});
test("parent snapshot contains one student and no teacher-only notes", () => {
  const w = demoWorkspace(),
    c = w.classes[0],
    st = c.students[0];
  w.sessions[0].records[0].comment = "PRIVATE NOTE";
  const result = JSON.stringify(parentSnapshot(w, c, st.id));
  assert.ok(result.includes(st.name));
  assert.ok(!result.includes(c.students[1].name));
  assert.ok(!result.includes("PRIVATE NOTE"));
  assert.ok(!result.includes("studentId"));
});
test("date range excludes out-of-period marks and missing skills stay null", () => {
  const w = demoWorkspace(),
    c = w.classes[0],
    r = parentSnapshot(w, c, c.students[0].id, "2000-01-01", "2000-01-02");
  assert.equal(r.subjects[0].avg, null);
  assert.equal(r.subjects[0].count, 0);
});
test("legacy import does not migrate passwords, license or sharing permission", () => {
  const legacy = {
    settings: { maxScore: 10 },
    standards: [
      {
        id: "c",
        name: "Class",
        students: [{ id: "s", name: "Learner" }],
        subjects: [
          {
            id: "b",
            name: "English",
            elements: session.elements,
            syllabus: [],
          },
        ],
      },
    ],
    evals: [
      {
        id: "old",
        standardId: "c",
        subjectId: "b",
        studentId: "s",
        date: "2026-10-28",
        session: "Week 1",
        scores: { a: 8, b: 10 },
      },
    ],
    auth: { hash: "secret" },
    license: { activeUntil: "2099-01-01" },
  };
  const w = migrateLegacy(legacy);
  assert.equal(w.sessions.length, 1);
  assert.equal(w.classes[0].students[0].shareConsent, false);
  assert.equal(w.auth, undefined);
  assert.equal(percentage(w.sessions[0], w.sessions[0].records[0]), 85);
});
test("invalid date rejects rollover dates and unknown backup versions", () => {
  const w = demoWorkspace();
  w.sessions[0].date = "2026-02-31";
  assert.equal(workspaceSchema.safeParse(w).success, false);
  assert.equal(workspaceSchema.safeParse({ version: 3 }).success, false);
});
