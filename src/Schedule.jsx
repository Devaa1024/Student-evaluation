import { useState } from "react";
import { id } from "./model.js";
import { Field } from "./components.jsx";
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export default function Schedule({ w, c, b, update, go }) {
  const [error, setError] = useState("");
  if (!c || !b)
    return (
      <section className="glass">
        <h2>Add a class and subject first.</h2>
        <p>Your schedule needs a class and a subject. This setup is free.</p>
        <button onClick={() => go("classes")}>Create classes & subjects</button>
      </section>
    );
  async function save(e) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setError("");
    const item = {
      id: id(),
      classId: c.id,
      subjectId: b.id,
      day: Number(f.get("day")),
      start: String(f.get("start")),
      end: String(f.get("end")),
      room: String(f.get("room")).trim(),
    };
    if (item.end <= item.start)
      return setError("End time must be after start time.");
    if (
      (w.schedules || []).some(
        (s) =>
          s.classId === c.id &&
          s.day === item.day &&
          s.start < item.end &&
          item.start < s.end,
      )
    )
      return setError("This class already has a lesson during that time.");
    if (
      await update((n) => {
        n.schedules ??= [];
        n.schedules.push(item);
      })
    ) {
      form.reset();
    }
  }
  return (
    <section className="glass">
      <span className="plan-badge">FREE</span>
      <h2>Your weekly teaching schedule.</h2>
      <p>
        Choose the class and subject above. Add a weekday and time; lessons
        repeat weekly. All times are Malaysia time.
      </p>
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Day">
            <select name="day">
              {days.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts">
            <input name="start" type="time" required defaultValue="08:00" />
          </Field>
          <Field label="Ends">
            <input name="end" type="time" required defaultValue="09:00" />
          </Field>
          <Field label="Room (optional)">
            <input name="room" maxLength={100} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button>Add lesson</button>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Day / time</th>
              <th>Class & subject</th>
              <th>Room</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {[...(w.schedules || [])]
              .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
              .map((s) => {
                const cl = w.classes.find((x) => x.id === s.classId),
                  sub = cl?.subjects.find((x) => x.id === s.subjectId);
                return (
                  <tr key={s.id}>
                    <td>
                      {days[s.day]} · {s.start}–{s.end}
                    </td>
                    <td>
                      {cl?.name} · {sub?.name}
                    </td>
                    <td>{s.room || "—"}</td>
                    <td>
                      <button
                        className="quiet danger"
                        aria-label={`Remove ${days[s.day]} ${s.start}`}
                        onClick={() =>
                          update((n) => {
                            n.schedules = n.schedules.filter(
                              (x) => x.id !== s.id,
                            );
                          })
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!w.schedules?.length && (
        <p>No lessons yet. Add your first lesson above.</p>
      )}
    </section>
  );
}
