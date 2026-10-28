import { useState } from "react";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { id, defaultElements } from "./model.js";
import { Field, Modal, Avatar, Empty } from "./components.jsx";
export default function Classes({ w, c, b, update, selectClass }) {
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      name = f.get("name")?.trim();
    if (!name) return;
    const ok = await update((next) => {
      if (modal.type === "class") {
        if (modal.item)
          next.classes.find((x) => x.id === modal.item.id).name = name;
        else next.classes.push({ id: id(), name, students: [], subjects: [] });
      }
      if (modal.type === "subject") {
        const cl = next.classes.find((x) => x.id === c.id);
        if (modal.item)
          cl.subjects.find((x) => x.id === modal.item.id).name = name;
        else
          cl.subjects.push({
            id: id(),
            name,
            elements: defaultElements(),
            syllabus: [],
          });
      }
      if (modal.type === "student") {
        const cl = next.classes.find((x) => x.id === c.id);
        const data = {
          name,
          parent: f.get("parent").trim(),
          parentEmail: f.get("email").trim().toLowerCase(),
          alias: f.get("alias").trim(),
          shareConsent: f.get("consent") === "on",
        };
        if (data.shareConsent && !data.alias)
          throw new Error(
            "A display name is required when leaderboard sharing is enabled.",
          );
        if (modal.item)
          Object.assign(
            cl.students.find((x) => x.id === modal.item.id),
            data,
          );
        else cl.students.push({ id: id(), ...data });
      }
    });
    if (ok) close();
  }
  async function remove(type, item) {
    if (
      !confirm(
        `Delete ${item.name}? Associated marks will also be deleted. Export a backup first if you need them.`,
      )
    )
      return;
    await update((next) => {
      if (type === "class") {
        next.classes = next.classes.filter((x) => x.id !== item.id);
        next.sessions = next.sessions.filter((s) => s.classId !== item.id);
        next.interventions = next.interventions.filter(
          (x) => x.classId !== item.id,
        );
      } else {
        const cl = next.classes.find((x) => x.id === c.id);
        if (type === "student") {
          cl.students = cl.students.filter((x) => x.id !== item.id);
          next.sessions.forEach((s) => {
            if (s.classId === c.id)
              s.records = s.records.filter((r) => r.studentId !== item.id);
          });
          next.interventions = next.interventions.filter(
            (x) => x.studentId !== item.id,
          );
        } else {
          cl.subjects = cl.subjects.filter((x) => x.id !== item.id);
          next.sessions = next.sessions.filter(
            (s) => s.classId !== c.id || s.subjectId !== item.id,
          );
        }
      }
    });
  }
  return (
    <>
      <section className="glass">
        <div className="section-head">
          <div>
            <h2>Your classes</h2>
            <p className="sub">
              One roster. Every subject. Less administration.
            </p>
          </div>
          <button onClick={() => setModal({ type: "class" })}>
            <Plus size={17} /> Add class
          </button>
        </div>
        <div className="class-grid">
          {w.classes.map((cl) => (
            <div
              className={"class-card " + (cl.id === c?.id ? "active" : "")}
              key={cl.id}
            >
              <button className="class-pick" onClick={() => selectClass(cl.id)}>
                <strong>{cl.name}</strong>
                <span>
                  {cl.students.length} students · {cl.subjects.length} subjects
                </span>
              </button>
              <div className="row">
                <button
                  className="icon-button"
                  aria-label={"Rename " + cl.name}
                  onClick={() => setModal({ type: "class", item: cl })}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={"Delete " + cl.name}
                  onClick={() => remove("class", cl)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {!w.classes.length && <Empty />}
      </section>
      {c && (
        <>
          <section className="glass">
            <div className="section-head">
              <div>
                <h2>Students · {c.name}</h2>
                <p className="sub">
                  Leaderboard participation is off until you record permission
                  and a display name.
                </p>
              </div>
              <button onClick={() => setModal({ type: "student" })}>
                <Plus size={17} /> Add student
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Parent / guardian</th>
                    <th>Display name</th>
                    <th>Sharing</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {c.students.map((st) => (
                    <tr key={st.id}>
                      <td>
                        <span className="person">
                          <Avatar name={st.name} />
                          <strong>{st.name}</strong>
                        </span>
                      </td>
                      <td>
                        {st.parent || "—"}
                        <small className="block muted">{st.parentEmail}</small>
                      </td>
                      <td>{st.alias || "—"}</td>
                      <td>
                        {st.shareConsent ? (
                          <span className="positive">Permission recorded</span>
                        ) : (
                          <span className="muted">Private</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={"Edit " + st.name}
                          onClick={() =>
                            setModal({ type: "student", item: st })
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={"Delete " + st.name}
                          onClick={() => remove("student", st)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!c.students.length && (
                <Empty title="Who’s in your classroom?">
                  Add students to start tracking progress.
                </Empty>
              )}
            </div>
          </section>
          <section className="glass">
            <div className="section-head">
              <h2>Subjects</h2>
              <button
                className="quiet"
                onClick={() => setModal({ type: "subject" })}
              >
                <Plus size={17} /> Add subject
              </button>
            </div>
            <div className="subject-list">
              {c.subjects.map((sub) => (
                <div className="subject-row" key={sub.id}>
                  <div>
                    <strong>{sub.name}</strong>
                    <span className="block muted">
                      {sub.elements.length} assessment skills ·{" "}
                      {sub.syllabus.length} topics
                    </span>
                  </div>
                  <div>
                    <button
                      className="icon-button"
                      aria-label={"Rename " + sub.name}
                      onClick={() => setModal({ type: "subject", item: sub })}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={"Delete " + sub.name}
                      onClick={() => remove("subject", sub)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {modal && (
        <Modal
          title={`${modal.item ? "Edit" : "Add"} ${modal.type}`}
          close={close}
        >
          <form onSubmit={save}>
            <Field
              label="Name"
              name="name"
              required
              maxLength={200}
              autoFocus
              defaultValue={modal.item?.name}
            />
            {modal.type === "student" && (
              <>
                <Field
                  label="Parent / guardian"
                  name="parent"
                  maxLength={200}
                  defaultValue={modal.item?.parent}
                />
                <Field
                  label="Parent Google email (for private reports)"
                  name="email"
                  type="email"
                  maxLength={254}
                  defaultValue={modal.item?.parentEmail}
                />
                <Field
                  label="Leaderboard display name"
                  name="alias"
                  maxLength={50}
                  defaultValue={modal.item?.alias}
                  placeholder="e.g. Aisha R. or Star reader"
                />
                <label className="checkbox">
                  <input
                    name="consent"
                    type="checkbox"
                    defaultChecked={modal.item?.shareConsent}
                  />
                  <span>
                    I have permission to include this display name and result on
                    shared leaderboards.
                  </span>
                </label>
                <p className="helper">
                  <ShieldCheck size={15} /> Parent contact details are never
                  included on leaderboards.
                </p>
              </>
            )}
            <button className="full">Save {modal.type}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
