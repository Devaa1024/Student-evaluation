import { useState } from "react";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { id, localDate } from "./model.js";
import { Empty, Pill } from "./components.jsx";
export default function Syllabus({ c, b, update }) {
  const [topic, setTopic] = useState("");
  if (!b)
    return (
      <section className="glass">
        <Empty title="Choose a subject to plan its lessons." />
      </section>
    );
  const change = (fn) =>
    update((n) =>
      fn(
        n.classes.find((x) => x.id === c.id).subjects.find((x) => x.id === b.id)
          .syllabus,
      ),
    );
  const covered = b.syllabus.filter((t) => t.status === "covered").length;
  return (
    <section className="glass">
      <div className="section-head">
        <div>
          <h2>A plan with room to grow.</h2>
          <p className="sub">
            {covered} of {b.syllabus.length} topics covered · {b.name}
          </p>
        </div>
        <strong>
          {b.syllabus.length
            ? Math.round((covered / b.syllabus.length) * 100)
            : 0}
          %
        </strong>
      </div>
      <div className="progress-track">
        <i
          style={{
            width:
              (b.syllabus.length ? (covered / b.syllabus.length) * 100 : 0) +
              "%",
          }}
        />
      </div>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!topic.trim()) return;
          if (
            await change((list) =>
              list.push({
                id: id(),
                topic: topic.trim(),
                status: "upcoming",
                date: "",
              }),
            )
          )
            setTopic("");
        }}
      >
        <input
          aria-label="New syllabus topic"
          placeholder="Add a topic or learning milestone…"
          maxLength={200}
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button>
          <Plus size={17} /> Add topic
        </button>
      </form>
      {b.syllabus.map((t, i) => (
        <div className="topic-row" key={t.id}>
          <span className="topic-number">{String(i + 1).padStart(2, "0")}</span>
          <div className="grow">
            <strong>{t.topic}</strong>
            <small className="block muted">
              {t.status === "covered"
                ? "Covered " + t.date
                : "Next learning opportunity"}
            </small>
          </div>
          <select
            aria-label={"Status of " + t.topic}
            value={t.status}
            onChange={(e) =>
              change((list) => {
                const row = list.find((x) => x.id === t.id);
                row.status = e.target.value;
                row.date = row.status === "covered" ? localDate() : "";
              })
            }
          >
            <option value="upcoming">Upcoming</option>
            <option value="covered">Covered</option>
            <option value="missed">Missed</option>
          </select>
          <button
            className="icon-button"
            disabled={!i}
            aria-label={"Move up " + t.topic}
            onClick={() =>
              change(
                (list) => ([list[i - 1], list[i]] = [list[i], list[i - 1]]),
              )
            }
          >
            <ArrowUp size={15} />
          </button>
          <button
            className="icon-button"
            disabled={i === b.syllabus.length - 1}
            aria-label={"Move down " + t.topic}
            onClick={() =>
              change(
                (list) => ([list[i + 1], list[i]] = [list[i], list[i + 1]]),
              )
            }
          >
            <ArrowDown size={15} />
          </button>
          <button
            className="icon-button danger"
            aria-label={"Delete topic " + t.topic}
            onClick={() => {
              if (
                confirm(
                  "Delete this topic? Assessments remain; their topic link will be cleared.",
                )
              )
                update((n) => {
                  n.classes
                    .find((x) => x.id === c.id)
                    .subjects.find((x) => x.id === b.id).syllabus = n.classes
                    .find((x) => x.id === c.id)
                    .subjects.find((x) => x.id === b.id)
                    .syllabus.filter((x) => x.id !== t.id);
                  n.sessions.forEach((s) => {
                    if (s.topicId === t.id) s.topicId = "";
                  });
                });
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {!b.syllabus.length && (
        <Empty title="What will your class learn next?">
          Build your topic list in the order you plan to teach.
        </Empty>
      )}
    </section>
  );
}
