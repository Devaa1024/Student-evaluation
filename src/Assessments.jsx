import { useState } from "react";
import { Plus, Pencil, Trash2, Save, ArrowLeft } from "lucide-react";
import { id, localDate, percentage, formatPct } from "./model.js";
import { Field, Empty } from "./components.jsx";
export default function Assessments({ w, c, b, update, setDirty }) {
  const [draft, setDraft] = useState(null),
    [error, setError] = useState("");
  if (!c || !b)
    return (
      <section className="glass">
        <Empty title="Choose a class and subject.">
          Add your class and subjects first.
        </Empty>
      </section>
    );
  const sessions = w.sessions
    .filter((s) => s.classId === c.id && s.subjectId === b.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  function edit(s) {
    setError("");
    setDraft(
      s
        ? structuredClone(s)
        : {
            id: id(),
            classId: c.id,
            subjectId: b.id,
            date: localDate(),
            createdAt: new Date().toISOString(),
            label: "",
            maxScore: w.settings.maxScore,
            elements: structuredClone(b.elements),
            topicId: "",
            records: c.students.map((st) => ({
              studentId: st.id,
              status: "unassessed",
              scores: {},
              comment: "",
            })),
          },
    );
  }
  function change(fn) {
    setDirty(true);
    setDraft((prev) => {
      const n = structuredClone(prev);
      fn(n);
      return n;
    });
  }
  function discard() {
    if (!confirm("Close this assessment? Unsaved changes will be discarded."))
      return;
    setDraft(null);
    setDirty(false);
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    if (draft.date > localDate()) {
      setError("Assessment dates cannot be in the future.");
      return;
    }
    if (
      !draft.records.some(
        (r) =>
          r.status === "absent" ||
          (r.status === "assessed" &&
            Object.values(r.scores).some((v) => v != null)),
      )
    ) {
      setError(
        "Add at least one mark or attendance entry. Notes alone do not create a grade.",
      );
      return;
    }
    const ok = await update((next) => {
      const found = next.sessions.findIndex((s) => s.id === draft.id);
      if (found >= 0) next.sessions[found] = draft;
      else next.sessions.push(draft);
    });
    if (ok) {
      setDraft(null);
      setDirty(false);
    }
  }
  return (
    <>
      {draft ? (
        <form className="glass assessment-editor" onSubmit={save}>
          <div className="section-head">
            <div>
              <h2>
                {sessions.some((s) => s.id === draft.id)
                  ? "Edit assessment"
                  : "Record assessment"}
              </h2>
              <p className="sub">
                Saved scale and skill weights stay attached to this assessment.
              </p>
            </div>
            <button type="button" className="quiet" onClick={discard}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <div className="form-grid">
            <Field label="Assessment name">
              <input
                required
                maxLength={200}
                value={draft.label}
                onChange={(e) => change((n) => (n.label = e.target.value))}
                placeholder="e.g. Narrative writing · Week 6"
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                max={localDate()}
                value={draft.date}
                onChange={(e) => change((n) => (n.date = e.target.value))}
              />
            </Field>
            <Field label="Linked topic">
              <select
                value={draft.topicId}
                onChange={(e) => change((n) => (n.topicId = e.target.value))}
              >
                <option value="">No linked topic</option>
                {b.syllabus.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.topic}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="notice">
            Marks out of <b>{draft.maxScore}</b>. Blank skills remain unassessed
            and are excluded from the average. A genuine zero must be entered as
            0.
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Attendance</th>
                  {draft.elements.map((el) => (
                    <th key={el.key}>
                      {el.label}
                      <small className="block muted">{el.weight}% weight</small>
                    </th>
                  ))}
                  <th>Result</th>
                  <th>Teacher note (private)</th>
                </tr>
              </thead>
              <tbody>
                {c.students.map((st) => {
                  const r = draft.records.find(
                    (r) => r.studentId === st.id,
                  ) || {
                    studentId: st.id,
                    status: "unassessed",
                    scores: {},
                    comment: "",
                  };
                  const modify = (fn) =>
                    change((n) => {
                      let rec = n.records.find((x) => x.studentId === st.id);
                      if (!rec) {
                        rec = structuredClone(r);
                        n.records.push(rec);
                      }
                      fn(rec);
                    });
                  return (
                    <tr key={st.id}>
                      <td className="nowrap">
                        <strong>{st.name}</strong>
                      </td>
                      <td>
                        <select
                          aria-label={"Attendance for " + st.name}
                          value={r.status === "absent" ? "absent" : "present"}
                          onChange={(e) =>
                            modify((x) => {
                              x.status =
                                e.target.value === "absent"
                                  ? "absent"
                                  : Object.values(x.scores).some(
                                        (v) => v != null,
                                      )
                                    ? "assessed"
                                    : "unassessed";
                            })
                          }
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                      {draft.elements.map((el) => (
                        <td key={el.key}>
                          <input
                            className="score-input"
                            aria-label={`${st.name} ${el.label}`}
                            type="number"
                            min="0"
                            max={draft.maxScore}
                            step="0.5"
                            disabled={r.status === "absent"}
                            value={r.scores[el.key] ?? ""}
                            onChange={(e) =>
                              modify((x) => {
                                x.scores[el.key] =
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value);
                                x.status = Object.values(x.scores).some(
                                  (v) => v != null,
                                )
                                  ? "assessed"
                                  : "unassessed";
                              })
                            }
                          />
                        </td>
                      ))}
                      <td className="number">
                        {formatPct(percentage(draft, r))}
                      </td>
                      <td>
                        <input
                          aria-label={"Private note for " + st.name}
                          maxLength={2000}
                          value={r.comment}
                          onChange={(e) =>
                            modify((x) => (x.comment = e.target.value))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-footer">
            <span className="helper">Absent students receive no grade.</span>
            <button>
              <Save size={17} /> Save assessment
            </button>
          </div>
        </form>
      ) : (
        <section className="glass">
          <div className="section-head">
            <div>
              <h2>Assessment history</h2>
              <p className="sub">
                Stable records, even when a session is renamed.
              </p>
            </div>
            <button onClick={() => edit()}>
              <Plus size={17} /> New assessment
            </button>
          </div>
          {sessions.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Date</th>
                    <th>Assessed</th>
                    <th>Scale</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.label || "Untitled assessment"}</strong>
                      </td>
                      <td>{s.date}</td>
                      <td>
                        {
                          s.records.filter((r) => percentage(s, r) != null)
                            .length
                        }
                      </td>
                      <td>/{s.maxScore}</td>
                      <td>
                        <button className="quiet small" onClick={() => edit(s)}>
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={"Delete " + s.label}
                          onClick={() => {
                            if (
                              confirm("Delete this assessment and its marks?")
                            )
                              update(
                                (n) =>
                                  (n.sessions = n.sessions.filter(
                                    (x) => x.id !== s.id,
                                  )),
                              );
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Make the first observation.">
              Record marks to see progress, strengths, and the next learning
              opportunity.
            </Empty>
          )}
        </section>
      )}
    </>
  );
}
