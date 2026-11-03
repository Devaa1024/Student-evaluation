import { emptyWorkspace, defaultElements, id, localDate } from "./model.js";
export function demoWorkspace() {
  const w = emptyWorkspace();
  w.settings = {
    school: "Hibiscus Learning School",
    teacher: "Ms. Taylor",
    maxScore: 10,
  };
  const names = [
    "Aisha Rahman",
    "Daniel Lee",
    "Priya Suresh",
    "Arjun Nair",
    "Sofia Tan",
    "Ethan Lim",
    "Amir Hassan",
    "Chloe Wong",
    "Zara Ali",
    "Lucas Chen",
    "Mei Lin",
    "Adam Yusuf",
  ];
  w.classes = ["Year 4 — Hibiscus", "Year 5 — Orchid"].map((name, ci) => ({
    id: id(),
    name,
    students: names.map((name, i) => ({
      id: id(),
      name: ci ? name.split(" ").reverse().join(" ") : name,
      parent: "",
      parentEmail: "",
      alias: ci
        ? `Learner ${i + 1}`
        : name.split(" ")[0] + " " + name.split(" ")[1][0] + ".",
      shareConsent: true,
    })),
    subjects: ["English", "Mathematics", "Science"].map((name) => ({
      id: id(),
      name,
      elements:
        name === "English"
          ? defaultElements()
          : ["Knowledge", "Application", "Reasoning"].map((label, i) => ({
              key: label.toLowerCase(),
              label,
              weight: i === 0 ? 40 : 30,
            })),
      syllabus: [
        "Foundations",
        "Exploring ideas",
        "Practice & application",
        "Making connections",
        "Independent work",
        "Review & reflection",
      ].map((topic, i) => ({
        id: id(),
        topic,
        status: i < 3 ? "covered" : i === 3 ? "missed" : "upcoming",
        date: i < 3 ? localDate() : "",
      })),
    })),
  }));
  for (const c of w.classes)
    for (const b of c.subjects)
      for (let week = 0; week < 6; week++) {
        const d = new Date();
        d.setDate(d.getDate() - (5 - week) * 7);
        w.sessions.push({
          id: id(),
          classId: c.id,
          subjectId: b.id,
          date: localDate(d),
          label: `Week ${week + 1}`,
          maxScore: 10,
          elements: structuredClone(b.elements),
          topicId: "",
          records: c.students.map((s, i) => ({
            studentId: s.id,
            status: i === 11 && week === 5 ? "absent" : "assessed",
            scores: Object.fromEntries(
              b.elements.map((e, k) => [
                e.key,
                Math.max(
                  0,
                  Math.min(
                    10,
                    (Math.round(
                      (i < 2
                        ? 7.5 + week * 0.35
                        : i === 2
                          ? 5.7 - week * 0.24
                          : 4.2 + (i % 7) * 0.55 + week * 0.23) +
                        (k % 3) * 0.3,
                    ) *
                      2) /
                      2,
                  ),
                ),
              ]),
            ),
            comment: "",
          })),
        });
      }
  return w;
}
