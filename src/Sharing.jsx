import { useEffect, useState } from "react";
import {
  Trophy,
  TrendingUp,
  Share2,
  Printer,
  ShieldCheck,
  Target,
  Plus,
} from "lucide-react";
import {
  boardSnapshot,
  parentSnapshot,
  formatPct,
  id,
  localDate,
} from "./model.js";
import {
  DateRange,
  Empty,
  ProgressChart,
  Pill,
  Change,
  Brand,
  Field,
} from "./components.jsx";
import { publishShare, readShare, signIn, supabase } from "./cloud.js";
export function Board({ data }) {
  const podium = [data.rows[1], data.rows[0], data.rows[2]].filter(Boolean);
  return (
    <div className="board-content">
      <div className="board-heading">
        <span className="trophy-emblem">
          <Trophy size={32} />
        </span>
        <h2>
          {data.mode === "growth" ? "The growth club" : "Classroom champions"}
        </h2>
        <p>
          {data.className} · {data.subjectName}
        </p>
        <small>
          {data.from || "First assessment"} — {data.to || data.generated} · At
          least {data.minimum} assessments
        </small>
      </div>
      {data.rows.length ? (
        <>
          <div className="podium">
            {podium.map((r) => (
              <div className={"podium-place place-" + r.rank} key={r.alias}>
                <span className="podium-avatar">{r.alias.slice(0, 1)}</span>
                <span className="medal">
                  {r.rank === 1 ? <Trophy size={18} /> : r.rank}
                </span>
                <h3>{r.alias}</h3>
                <strong>
                  {data.mode === "growth"
                    ? (r.score > 0 ? "+" : "") + r.score + " pp"
                    : formatPct(r.score)}
                </strong>
                <small>{r.count} assessments</small>
              </div>
            ))}
          </div>
          <div className="rank-list">
            {data.rows.map((r) => (
              <div className="rank-row" key={r.alias}>
                <span className="rank-number">
                  {String(r.rank).padStart(2, "0")}
                </span>
                <strong>{r.alias}</strong>
                <span>
                  {data.mode === "growth"
                    ? (r.score > 0 ? "+" : "") + r.score + " pp"
                    : formatPct(r.score)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty title="The next chapter is yours.">
          Students appear after permission is recorded and enough assessments
          are available.
        </Empty>
      )}
      <p className="board-footer">
        Celebrate the effort. Keep growing together.
        <br />
        <small>ClassInsights · Snapshot published {data.generated}</small>
      </p>
    </div>
  );
}
export function Leaderboard({ w, c, b, share }) {
  const [mode, setMode] = useState("achievement"),
    [minimum, setMinimum] = useState(3),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  if (!c) return <Empty />;
  const data = boardSnapshot(w, c, b?.id, { mode, minimum, from, to });
  return (
    <>
      <section className="glass">
        <div className="section-head">
          <div>
            <h2>More than one way to shine.</h2>
            <p className="sub">
              Recognise achievement and progress. Only students with recorded
              sharing permission appear.
            </p>
          </div>
          <button disabled={!data.rows.length} onClick={() => share(data)}>
            <Share2 size={17} /> Share leaderboard
          </button>
        </div>
        <div className="board-controls">
          <div className="filter-tabs">
            <button
              className={mode === "achievement" ? "selected" : ""}
              onClick={() => setMode("achievement")}
            >
              <Trophy size={16} /> Achievement
            </button>
            <button
              className={mode === "growth" ? "selected" : ""}
              onClick={() => setMode("growth")}
            >
              <TrendingUp size={16} /> Most improved
            </button>
          </div>
          <Field label="Minimum assessments">
            <select
              value={minimum}
              onChange={(e) => setMinimum(Number(e.target.value))}
            >
              {[1, 3, 5].map((n) => (
                <option key={n} value={n}>
                  {n} assessments
                </option>
              ))}
            </select>
          </Field>
          <DateRange {...{ from, to, setFrom, setTo }} />
        </div>
        <div className="notice">
          <ShieldCheck size={16} /> Links contain display names and results
          only. They expire after 7 days and can be revoked in School settings.
        </div>
      </section>
      <section className="glass leaderboard-panel">
        <Board data={data} />
      </section>
    </>
  );
}
export function ParentReport({ data }) {
  return (
    <article className="parent-report">
      <div className="report-title">
        <Brand />
        <span>{data.school}</span>
      </div>
      <h1>{data.studentName}’s learning journey</h1>
      <p className="sub">
        {data.className} · {data.from || "First assessment"} to{" "}
        {data.to || data.generated}
      </p>
      {data.comment && (
        <section className="parent-update">
          <h2>A note from your teacher</h2>
          <p className="prewrap">{data.comment}</p>
        </section>
      )}
      <div className="report-subjects">
        {data.subjects.map((b, i) => (
          <section className="glass" key={i}>
            <div className="section-head">
              <div>
                <h2>{b.name}</h2>
                <p className="sub">
                  {b.count} assessed · {b.absent} absent
                </p>
              </div>
              <div className="report-score">
                <strong>{formatPct(b.avg)}</strong>
                <Change value={b.change} />
              </div>
            </div>
            <Pill>{b.status}</Pill>
            <ProgressChart points={b.points} label={b.name} />
            <div className="skill-list">
              {b.skills.map((e, i) => (
                <div className="skill-row" key={i}>
                  <span>{e.label}</span>
                  <div className="progress-track">
                    <i style={{ width: (e.pct ?? 0) + "%" }} />
                  </div>
                  <b>{e.pct == null ? "Not assessed" : formatPct(e.pct)}</b>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="helper">
        Results describe recorded assessments, not the whole child. Discuss
        strengths, effort, and next steps with your teacher. Generated{" "}
        {data.generated}.
      </p>
    </article>
  );
}
export function Reports({ w, c, studentId, setStudentId, update, share }) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [comment, setComment] = useState(""),
    [goal, setGoal] = useState(""),
    [due, setDue] = useState(localDate());
  if (!c?.students.length)
    return (
      <section className="glass">
        <Empty title="Every learner has a story.">
          Add students and assessments to create their progress reports.
        </Empty>
      </section>
    );
  const st = c.students.find((s) => s.id === studentId) || c.students[0],
    data = parentSnapshot(w, c, st.id, from, to, comment),
    goals = w.interventions.filter(
      (x) => x.classId === c.id && x.studentId === st.id,
    );
  return (
    <>
      <section className="glass no-print">
        <div className="section-head">
          <div>
            <h2>Bring families into the journey.</h2>
            <p className="sub">
              Private reports show only this student. Share with their exact
              Google email.
            </p>
          </div>
          <div className="row">
            <button className="quiet" onClick={() => print()}>
              <Printer size={17} /> Print / Save PDF
            </button>
            <button
              disabled={!st.parentEmail}
              title={
                !st.parentEmail
                  ? "Add a parent email in Classes & students"
                  : ""
              }
              onClick={() => share(data, st.parentEmail)}
            >
              <Share2 size={17} /> Share with parent
            </button>
          </div>
        </div>
        <div className="report-controls">
          <Field label="Student">
            <select
              value={st.id}
              onChange={(e) => {
                setStudentId(e.target.value);
                setComment("");
              }}
            >
              {c.students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </Field>
          <DateRange {...{ from, to, setFrom, setTo }} />
        </div>
        <Field label="Parent update (included in this report)">
          <textarea
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Recognise a strength and suggest one specific next step…"
          />
        </Field>
        <p className="helper">
          Draft text remains on this page; publishing saves it in the shared
          report snapshot.
        </p>
      </section>
      <section className="glass no-print">
        <div className="section-head">
          <div>
            <h2>
              <Target size={19} /> Next steps
            </h2>
            <p className="sub">Staff-only follow-up goals · {st.name}</p>
          </div>
        </div>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await update((n) =>
                n.interventions.push({
                  id: id(),
                  classId: c.id,
                  studentId: st.id,
                  goal: goal.trim(),
                  due,
                  status: "open",
                }),
              )
            )
              setGoal("");
          }}
        >
          <input
            aria-label="Follow-up goal"
            required
            maxLength={1000}
            placeholder="e.g. Practise paragraph structure twice this week"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <input
            aria-label="Follow-up due date"
            required
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          <button>
            <Plus size={17} /> Add goal
          </button>
        </form>
        {goals.map((g) => (
          <div className="goal-row" key={g.id}>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={g.status === "done"}
                onChange={(e) =>
                  update(
                    (n) =>
                      (n.interventions.find((x) => x.id === g.id).status = e
                        .target.checked
                        ? "done"
                        : "open"),
                  )
                }
              />
              <span className={g.status === "done" ? "done" : ""}>
                {g.goal}
              </span>
            </label>
            <small
              className={
                g.status === "open" && g.due < localDate()
                  ? "negative"
                  : "muted"
              }
            >
              Due {g.due}
            </small>
          </div>
        ))}
      </section>
      <div id="print-report">
        <ParentReport data={data} />
      </div>
    </>
  );
}
export function SharedPage({ token, user }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    readShare(token)
      .then((d) => {
        if (active) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [token, user?.id]);
  return (
    <main className="shared-page">
      <header className="shared-header">
        <a href="/">
          <Brand />
        </a>
        <div className="row">
          {user && <span className="muted">Signed in as {user.email}</span>}
          <button className="quiet no-print" onClick={() => print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </header>
      {error ? (
        <section className="glass recovery">
          <ShieldCheck size={35} />
          <h1>A private link, for the right person.</h1>
          <p>{error}</p>
          {!user && (
            <button onClick={() => signIn().catch((e) => setError(e.message))}>
              Continue with Google
            </button>
          )}
          <p className="helper">
            For a parent report, use the Google account your teacher invited.
            Ask for a new link if this one has expired.
          </p>
        </section>
      ) : !data ? (
        <section className="glass recovery" role="status">
          Opening your shared view…
        </section>
      ) : data.kind === "leaderboard" ? (
        <section className="glass leaderboard-panel">
          <Board data={data} />
        </section>
      ) : (
        <ParentReport data={data} />
      )}
    </main>
  );
}
