import { z } from "zod";
export const id = () => crypto.randomUUID();
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const round = (n) => Math.round(n * 10) / 10;
export const mean = (values) =>
  values.length
    ? round(values.reduce((a, b) => a + b, 0) / values.length)
    : null;
export const formatPct = (n) => (n == null ? "—" : `${n}%`);
export const grade = (n) =>
  n == null
    ? "Not assessed"
    : n >= 80
      ? "A"
      : n >= 65
        ? "B"
        : n >= 50
          ? "C"
          : n >= 35
            ? "D"
            : "E";
export const defaultElements = () =>
  ["Reading", "Listening", "Writing", "Thinking", "Communication"].map(
    (label) => ({ key: label.toLowerCase(), label, weight: 20 }),
  );
const text = z.string().max(200);
const element = z.object({
  key: text.min(1),
  label: text.min(1),
  weight: z.number().min(0).max(100),
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid date",
  );
const student = z.object({
  id: text,
  name: text.min(1),
  parent: z.string().max(200),
  parentEmail: z.string().max(254),
  alias: text,
  shareConsent: z.boolean(),
});
const record = z.object({
  studentId: text,
  status: z.enum(["assessed", "absent", "unassessed"]),
  scores: z.record(z.string(), z.number().min(0).nullable()),
  comment: z.string().max(2000),
});
const sessionSchema = z
  .object({
    id: text,
    classId: text,
    subjectId: text,
    date,
    createdAt: z.iso.datetime().optional(),
    label: text,
    maxScore: z.number().positive().max(1000),
    elements: z.array(element).min(1).max(30),
    topicId: text,
    records: z.array(record).max(2000),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.records.map((r) => r.studentId)).size !== s.records.length)
      ctx.addIssue({
        code: "custom",
        message: "Duplicate student in assessment",
      });
    if (new Set(s.elements.map((e) => e.key)).size !== s.elements.length)
      ctx.addIssue({ code: "custom", message: "Duplicate rubric element" });
    for (const r of s.records)
      for (const [key, value] of Object.entries(r.scores))
        if (
          !s.elements.some((e) => e.key === key) ||
          (value != null && value > s.maxScore)
        )
          ctx.addIssue({
            code: "custom",
            message: "Mark outside saved rubric or marking scale",
          });
  });
export const workspaceSchema = z
  .object({
    version: z.literal(2),
    settings: z.object({
      school: text,
      teacher: text,
      maxScore: z.number().positive().max(1000),
    }),
    classes: z
      .array(
        z.object({
          id: text,
          name: text.min(1),
          students: z.array(student).max(2000),
          subjects: z
            .array(
              z.object({
                id: text,
                name: text.min(1),
                elements: z.array(element).min(1).max(30),
                syllabus: z.array(
                  z.object({
                    id: text,
                    topic: text.min(1),
                    status: z.enum(["upcoming", "covered", "missed"]),
                    date: z.string().max(10),
                  }),
                ),
              }),
            )
            .max(50),
        }),
      )
      .max(100),
    sessions: z.array(sessionSchema).max(50000),
    interventions: z
      .array(
        z.object({
          id: text,
          classId: text,
          studentId: text,
          goal: z.string().min(1).max(1000),
          due: date,
          status: z.enum(["open", "done"]),
        }),
      )
      .max(10000),
  })
  .superRefine((w, ctx) => {
    const classes = new Map(w.classes.map((c) => [c.id, c]));
    if (
      classes.size !== w.classes.length ||
      new Set(w.sessions.map((s) => s.id)).size !== w.sessions.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate identity" });
    for (const c of w.classes) {
      if (
        new Set(c.students.map((s) => s.id)).size !== c.students.length ||
        new Set(c.subjects.map((s) => s.id)).size !== c.subjects.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Duplicate student or subject identity",
        });
    }
    for (const s of w.sessions) {
      const c = classes.get(s.classId);
      if (
        !c ||
        !c.subjects.some((b) => b.id === s.subjectId) ||
        s.records.some((r) => !c.students.some((st) => st.id === r.studentId))
      )
        ctx.addIssue({
          code: "custom",
          message: "Assessment references a missing class, subject or student",
        });
    }
  });
export const emptyWorkspace = () => ({
  version: 2,
  settings: { school: "My school", teacher: "", maxScore: 10 },
  classes: [],
  sessions: [],
  interventions: [],
});
export function percentage(session, record) {
  if (!record || record.status !== "assessed") return null;
  const elements = session.elements.filter((e) => record.scores[e.key] != null);
  if (!elements.length) return null;
  const weight = elements.reduce((n, e) => n + e.weight, 0);
  return round(
    (elements.reduce(
      (n, e) =>
        n + (record.scores[e.key] / session.maxScore) * (weight ? e.weight : 1),
      0,
    ) /
      (weight || elements.length)) *
      100,
  );
}
export function observations(
  w,
  classId,
  subjectId,
  studentId,
  from = "",
  to = "",
) {
  return w.sessions
    .filter(
      (s) =>
        s.classId === classId &&
        (!subjectId || s.subjectId === subjectId) &&
        (!from || s.date >= from) &&
        (!to || s.date <= to),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.createdAt || a.id).localeCompare(b.createdAt || b.id),
    )
    .flatMap((s) => {
      const r = s.records.find((r) => r.studentId === studentId);
      return r ? [{ session: s, record: r, pct: percentage(s, r) }] : [];
    });
}
export function summary(rows) {
  const assessed = rows.filter((r) => r.pct != null);
  const split = Math.max(1, Math.floor(assessed.length / 2));
  const change =
    assessed.length >= 2
      ? round(
          mean(assessed.slice(-split).map((r) => r.pct)) -
            mean(assessed.slice(0, split).map((r) => r.pct)),
        )
      : null;
  const avg = mean(assessed.map((r) => r.pct));
  return {
    avg,
    change,
    count: assessed.length,
    absent: rows.filter((r) => r.record.status === "absent").length,
    status:
      avg == null
        ? "Not assessed"
        : avg < 50 || (change != null && change <= -5)
          ? "Needs support"
          : change != null && change >= 3
            ? "Improving"
            : "On track",
  };
}
export function studentSummaries(w, c, subjectId, from = "", to = "") {
  return c.students.map((student) => ({
    student,
    ...summary(observations(w, c.id, subjectId, student.id, from, to)),
  }));
}
export function leaderboard(
  w,
  c,
  subjectId,
  { mode = "achievement", from = "", to = "", minimum = 3 } = {},
) {
  const rows = studentSummaries(w, c, subjectId, from, to)
    .filter(
      (r) =>
        r.student.shareConsent &&
        r.student.alias.trim() &&
        r.count >= minimum &&
        (mode !== "growth" || r.change != null),
    )
    .map((r) => ({
      alias: r.student.alias,
      score: mode === "growth" ? r.change : r.avg,
      count: r.count,
    }))
    .sort((a, b) => b.score - a.score || a.alias.localeCompare(b.alias));
  return rows
    .map((r) => ({
      ...r,
      rank: rows.findIndex((x) => x.score === r.score) + 1,
    }))
    .slice(0, 10);
}
export function boardSnapshot(w, c, subjectId, options) {
  return {
    kind: "leaderboard",
    school: w.settings.school,
    className: c.name,
    subjectName:
      c.subjects.find((s) => s.id === subjectId)?.name || "All subjects",
    mode: options.mode,
    from: options.from,
    to: options.to,
    minimum: options.minimum,
    generated: localDate(),
    rows: leaderboard(w, c, subjectId, options),
  };
}
export function parentSnapshot(
  w,
  c,
  studentId,
  from = "",
  to = "",
  comment = "",
) {
  const st = c.students.find((s) => s.id === studentId);
  if (!st) throw new Error("Student not found");
  return {
    kind: "parent",
    school: w.settings.school,
    className: c.name,
    studentName: st.name,
    generated: localDate(),
    from,
    to,
    comment,
    subjects: c.subjects.map((b) => {
      const rows = observations(w, c.id, b.id, st.id, from, to);
      return {
        name: b.name,
        ...summary(rows),
        points: rows
          .filter((r) => r.pct != null)
          .map((r) => ({
            date: r.session.date,
            label: r.session.label,
            pct: r.pct,
          })),
        skills: [
          ...new Set(
            rows.flatMap((r) => r.session.elements.map((e) => e.label)),
          ),
        ].map((label) => ({
          label,
          pct: mean(
            rows.flatMap((r) => {
              const e = r.session.elements.find((e) => e.label === label);
              return e &&
                r.record.status === "assessed" &&
                r.record.scores[e.key] != null
                ? [round((r.record.scores[e.key] / r.session.maxScore) * 100)]
                : [];
            }),
          ),
        })),
      };
    }),
  };
}
export function saveDemo(storage, next, expected) {
  workspaceSchema.parse(next);
  const raw = storage.getItem("classinsights_demo_v2");
  const current = raw ? JSON.parse(raw) : null;
  if ((current?.revision ?? 0) !== expected)
    throw new Error(
      "This workspace changed in another tab. Export your draft, then reload before editing.",
    );
  const result = { revision: expected + 1, payload: next };
  storage.setItem("classinsights_demo_v2", JSON.stringify(result));
  return result;
}
export function migrateLegacy(old) {
  if (old.version === 2) return workspaceSchema.parse(old);
  if (!Array.isArray(old.standards) || !Array.isArray(old.evals))
    throw new Error(
      "Choose a ClassInsights v2 backup or a legacy gradebook with standards and evals.",
    );
  const w = emptyWorkspace();
  w.settings = {
    school: old.settings?.schoolName || "Imported school",
    teacher: old.settings?.teacherName || "",
    maxScore: Number(old.settings?.maxScore) || 10,
  };
  w.classes = old.standards.map((c) => ({
    id: c.id,
    name: c.name,
    students: c.students.map((s) => ({
      id: s.id,
      name: s.name,
      parent: s.parent || "",
      parentEmail: "",
      alias: "",
      shareConsent: false,
    })),
    subjects: c.subjects.map((b) => ({
      id: b.id,
      name: b.name,
      elements: b.elements?.length ? b.elements : defaultElements(),
      syllabus: b.syllabus || [],
    })),
  }));
  for (const r of old.evals) {
    const c = w.classes.find((c) => c.id === r.standardId),
      b = c?.subjects.find((b) => b.id === r.subjectId);
    if (!c || !b || !c.students.some((s) => s.id === r.studentId))
      throw new Error(
        "Legacy file contains orphan marks. Repair it before importing.",
      );
    let s = w.sessions.find(
      (s) =>
        s.classId === c.id &&
        s.subjectId === b.id &&
        s.date === r.date &&
        s.label === (r.session || ""),
    );
    if (!s) {
      s = {
        id: id(),
        classId: c.id,
        subjectId: b.id,
        date: r.date,
        label: r.session || "",
        elements: structuredClone(b.elements),
        maxScore: w.settings.maxScore,
        topicId: r.topicId || "",
        records: [],
      };
      w.sessions.push(s);
    }
    if (s.records.some((x) => x.studentId === r.studentId))
      throw new Error("Duplicate legacy marks require review before import.");
    s.records.push({
      studentId: r.studentId,
      status: "assessed",
      scores: Object.fromEntries(
        b.elements.map((e) => [e.key, r.scores[e.key] ?? null]),
      ),
      comment: r.comment || "",
    });
  }
  return workspaceSchema.parse(w);
}
