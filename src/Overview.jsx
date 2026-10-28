import { useState } from "react";
import {
  Users,
  ChartColumn,
  CircleAlert,
  TrendingUp,
  ArrowRight,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import {
  studentSummaries,
  mean,
  observations,
  summary,
  formatPct,
} from "./model.js";
import { ProgressChart, StudentTable, Empty } from "./components.jsx";
export default function Overview({ w, c, b, go, openStudent }) {
  const [query, setQuery] = useState(""),
    [supportOnly, setSupportOnly] = useState(false);
  if (!c)
    return (
      <section className="glass">
        <Empty />
        <button onClick={() => go("classes")}>
          Set up a class <ArrowRight size={16} />
        </button>
      </section>
    );
  const rows = studentSummaries(w, c, b?.id),
    support = rows.filter((r) => r.status === "Needs support"),
    improving = rows.filter((r) => r.change >= 3),
    avg = mean(rows.filter((r) => r.avg != null).map((r) => r.avg));
  const dates = [
    ...new Set(
      w.sessions
        .filter((s) => s.classId === c.id && (!b || s.subjectId === b.id))
        .map((s) => s.date),
    ),
  ].sort();
  const points = dates.map((date) => ({
    date,
    pct: mean(
      rows.flatMap((r) =>
        observations(w, c.id, b?.id, r.student.id, date, date)
          .filter((r) => r.pct != null)
          .map((r) => r.pct),
      ),
    ),
  }));
  const topics = b?.syllabus || [],
    remaining = topics.filter((t) => t.status !== "covered").length;
  const skills =
    b?.elements
      .map((e) => ({
        label: e.label,
        pct: mean(
          w.sessions
            .filter((s) => s.classId === c.id && s.subjectId === b.id)
            .flatMap((s) =>
              s.records
                .filter(
                  (r) => r.status === "assessed" && r.scores[e.key] != null,
                )
                .map((r) => (r.scores[e.key] / s.maxScore) * 100),
            ),
        ),
      }))
      .filter((e) => e.pct != null)
      .sort((a, b) => a.pct - b.pct) || [];
  const stats = [
    [Users, c.students.length, "Students", "mint"],
    [ChartColumn, formatPct(avg), "Class average", "lilac"],
    [CircleAlert, support.length, "Need support", "coral"],
    [TrendingUp, improving.length, "Improving", "blue"],
  ];
  return (
    <>
      <section className="stats glass">
        {stats.map(([Icon, value, label, color]) => (
          <div className="stat" key={label}>
            <span className={"stat-icon " + color}>
              <Icon size={25} />
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </section>
      <div className="overview-grid">
        <section className="glass">
          <h2>Progress over time</h2>
          <p className="sub">
            Assessment-day average · {b?.name || "All subjects"} · {c.name}
          </p>
          <ProgressChart points={points} />
        </section>
        <section className="glass focus">
          <h2>Teaching focus</h2>
          <button
            className="focus-row"
            onClick={() => {
              setSupportOnly(true);
              document
                .getElementById("student-progress")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span className="stat-icon coral">
              <Users size={22} />
            </span>
            <span>
              <strong>
                {support.length
                  ? `Follow up with ${support.length} student${support.length === 1 ? "" : "s"}`
                  : "Keep the momentum going"}
              </strong>
              <small>
                {support.length
                  ? "A low average or recent decline needs a closer look."
                  : "No support flags in this class and subject."}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
          <button className="focus-row" onClick={() => go("assessments")}>
            <span className="stat-icon lilac">
              <ClipboardList size={22} />
            </span>
            <span>
              <strong>
                {skills[0]
                  ? `${skills[0].label}: ${Math.round(skills[0].pct)}% average`
                  : "Build a clearer picture"}
              </strong>
              <small>
                {skills[0]
                  ? "Lowest assessed skill. Consider targeted practice."
                  : "Record an assessment to reveal learning patterns."}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
          <button className="focus-row" onClick={() => go("syllabus")}>
            <span className="stat-icon mint">
              <BookOpen size={22} />
            </span>
            <span>
              <strong>{remaining} topics left to cover</strong>
              <small>
                {topics.length
                  ? `${topics.filter((t) => t.status === "covered").length} of ${topics.length} topics completed.`
                  : "Add your teaching plan in Syllabus."}
              </small>
            </span>
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <section className="glass" id="student-progress">
        <div className="section-head">
          <div>
            <h2>Student progress</h2>
            <p className="sub">
              Change compares the first and latest halves of assessed results.
            </p>
          </div>
          <input
            className="search"
            aria-label="Find a student"
            placeholder="Find a student…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button
            className={!supportOnly ? "selected" : ""}
            onClick={() => setSupportOnly(false)}
          >
            All students
          </button>
          <button
            className={supportOnly ? "selected" : ""}
            onClick={() => setSupportOnly(true)}
          >
            Needs support · {support.length}
          </button>
        </div>
        <StudentTable
          rows={rows.filter(
            (r) =>
              (!supportOnly || r.status === "Needs support") &&
              r.student.name.toLowerCase().includes(query.toLowerCase()),
          )}
          onSelect={openStudent}
        />
      </section>
      <section className="glass">
        <h2>Across your school</h2>
        <p className="sub">A consistent view across every class and subject.</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Average</th>
                <th>Need support</th>
                <th>Assessed students</th>
              </tr>
            </thead>
            <tbody>
              {w.classes.flatMap((cl) =>
                cl.subjects.map((sub) => {
                  const rs = studentSummaries(w, cl, sub.id);
                  return (
                    <tr key={cl.id + sub.id}>
                      <td>{cl.name}</td>
                      <td>{sub.name}</td>
                      <td>
                        {formatPct(
                          mean(
                            rs.filter((r) => r.avg != null).map((r) => r.avg),
                          ),
                        )}
                      </td>
                      <td>
                        {rs.filter((r) => r.status === "Needs support").length}
                      </td>
                      <td>
                        {rs.filter((r) => r.count).length}/{rs.length}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
