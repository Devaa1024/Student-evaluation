import { useCallback, useEffect, useRef, useState } from "react";
import {
  House,
  Users,
  ClipboardList,
  BookOpen,
  Trophy,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Plus,
  LogOut,
  Check,
  Cloud,
  RefreshCw,
  ExternalLink,
  X,
  Moon,
  Sun,
} from "lucide-react";
import Login from "./Login.jsx";
import Overview from "./Overview.jsx";
import Classes from "./Classes.jsx";
import Assessments from "./Assessments.jsx";
import Syllabus from "./Syllabus.jsx";
import Settings, { downloadBackup } from "./Settings.jsx";
import { Leaderboard, Reports, SharedPage } from "./Sharing.jsx";
import { Brand, Avatar, Modal } from "./components.jsx";
import {
  supabase,
  loadWorkspaces,
  createWorkspace,
  saveWorkspace,
  publishShare,
} from "./cloud.js";
import { emptyWorkspace, workspaceSchema, saveDemo } from "./model.js";
import { demoWorkspace } from "./demo.js";
const nav = [
  ["overview", "Overview", House],
  ["classes", "Classes & students", Users],
  ["assessments", "Assessments", ClipboardList],
  ["syllabus", "Syllabus", BookOpen],
  ["leaderboard", "Leaderboard", Trophy],
  ["reports", "Reports", ChartNoAxesCombined],
  ["settings", "School settings", SettingsIcon],
];
const descriptions = {
  overview: ["School overview", "A clearer picture. A better next step."],
  classes: [
    "A place for every learner.",
    "Build your classes, connect your subjects, know your students.",
  ],
  assessments: [
    "Notice the learning.",
    "Record meaningful observations, without the administration.",
  ],
  syllabus: [
    "Learning, with direction.",
    "Keep your teaching plan moving with your students.",
  ],
  leaderboard: [
    "Let progress take the spotlight.",
    "A little recognition. A lot of possibility.",
  ],
  reports: [
    "Progress worth sharing.",
    "Turn classroom observations into a conversation with families.",
  ],
  settings: [
    "Make it your school.",
    "Your people, your teaching, your workspace.",
  ],
};
export default function App() {
  const [user, setUser] = useState(null),
    [authLoading, setAuthLoading] = useState(!!supabase),
    [demo, setDemo] = useState(false),
    [rows, setRows] = useState([]),
    [row, setRow] = useState(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(null),
    [tab, setTab] = useState("overview"),
    [classId, setClassId] = useState(""),
    [subjectId, setSubjectId] = useState(""),
    [studentId, setStudentId] = useState(""),
    [dirty, setDirty] = useState(false),
    [shareResult, setShareResult] = useState(null),
    [dark, setDark] = useState(false);
  const writeLock = useRef(false),
    draftRef = useRef(null);
  const token = location.pathname.startsWith("/share/")
    ? location.pathname.split("/")[2]
    : null;
  const notify = (message, isError = false) => setNotice({ message, isError });
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setUser(data?.session?.user || null);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);
  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const rs = await loadWorkspaces();
      setRows(rs);
      setRow((prev) => rs.find((r) => r.id === prev?.id) || rs[0] || null);
    } catch (e) {
      setError("Could not load school records: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => {
    if (user && !demo && !token) reload();
  }, [user?.id, demo, token, reload]);
  useEffect(() => {
    const fn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab, classId, subjectId]);
  useEffect(() => {
    if (!demo) return;
    const fn = (e) => {
      if (e.key === "classinsights_demo_v2")
        setError(
          "The sample workspace changed in another tab. Export any draft, then reload.",
        );
    };
    window.addEventListener("storage", fn);
    return () => window.removeEventListener("storage", fn);
  }, [demo]);
  function explore() {
    try {
      const raw = localStorage.getItem("classinsights_demo_v2");
      const saved = raw
        ? JSON.parse(raw)
        : { revision: 0, payload: demoWorkspace() };
      workspaceSchema.parse(saved.payload);
      setRow({ id: "demo", ...saved });
      setDemo(true);
      setError("");
    } catch (e) {
      setError(
        "Sample data could not be opened: " +
          e.message +
          ". Your stored data has not been cleared.",
      );
    }
  }
  async function update(fn) {
    if (writeLock.current) return false;
    writeLock.current = true;
    setBusy(true);
    let next;
    try {
      next = structuredClone(row.payload);
      fn(next);
      workspaceSchema.parse(next);
      draftRef.current = next;
      const saved = demo
        ? { ...row, ...saveDemo(localStorage, next, row.revision) }
        : await saveWorkspace(row, next);
      setRow(saved);
      setError("");
      draftRef.current = null;
      notify("Changes saved.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      writeLock.current = false;
      setBusy(false);
    }
  }
  function navigate(fn) {
    if (
      dirty &&
      !confirm("Leave this page and discard unsaved assessment changes?")
    )
      return;
    setDirty(false);
    fn();
  }
  function go(t) {
    navigate(() => setTab(t));
  }
  async function share(data, email) {
    if (demo) {
      notify(
        "Sharing is available after Google sign-in. Sample classroom data stays in this browser.",
        true,
      );
      return;
    }
    try {
      const result = await publishShare(row.id, data, email);
      setShareResult(result);
    } catch (e) {
      notify("Could not publish: " + e.message, true);
    }
  }
  async function logout() {
    if (dirty && !confirm("Sign out and discard unsaved assessment changes?"))
      return;
    if (!demo) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        notify(error.message, true);
        return;
      }
    }
    setDemo(false);
    setRow(null);
    setRows([]);
    setDirty(false);
    setError("");
  }
  if (authLoading)
    return (
      <main className="recovery glass" role="status">
        <Brand />
        <p>Opening ClassInsights…</p>
      </main>
    );
  if (token) return <SharedPage token={token} user={user} />;
  if (!demo && !user) return <Login onDemo={explore} error={error} />;
  if (loading)
    return (
      <main className="recovery glass" role="status">
        <Brand />
        <p>Loading your school workspace…</p>
      </main>
    );
  if (!row)
    return (
      <main className="recovery glass">
        <Brand />
        <h1>Your school starts here.</h1>
        {error ? (
          <>
            <p role="alert" className="error">
              {error}
            </p>
            <button onClick={reload}>Try again</button>
          </>
        ) : (
          <>
            <p>
              Create an empty workspace, or ask your headmaster to grant staff
              access to an existing school.
            </p>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await createWorkspace(user.id, emptyWorkspace());
                  setRow(r);
                  setRows([r]);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create school workspace
            </button>
            <button className="quiet" onClick={reload}>
              Check for staff access
            </button>
          </>
        )}
        <button className="quiet" onClick={logout}>
          Sign out
        </button>
      </main>
    );
  const w = row.payload,
    c = w.classes.find((c) => c.id === classId) || w.classes[0],
    b = c?.subjects.find((b) => b.id === subjectId) || c?.subjects[0];
  return (
    <div className="app-layout" aria-busy={busy}>
      <aside className="sidebar glass">
        <Brand />
        <nav aria-label="Main navigation">
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={key === tab ? "active" : ""}
              aria-current={key === tab ? "page" : undefined}
              onClick={() => go(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Avatar
            name={w.settings.teacher || user?.user_metadata?.name || "Teacher"}
          />
          <span>
            <strong>{w.settings.teacher || "School workspace"}</strong>
            <small>{demo ? "Sample classroom" : user?.email}</small>
          </span>
          <button
            className="icon-button"
            title="Sign out"
            aria-label="Sign out"
            onClick={logout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="app-main">
        <div className="topbar">
          <span className="school-name">{w.settings.school}</span>
          <div className="row">
            {demo ? (
              <span className="demo-tag">
                Sample classroom · stored on this device
              </span>
            ) : (
              <span className="saved-status">
                <Cloud size={15} />
                {busy ? "Saving…" : "Cloud workspace"}
              </span>
            )}
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Avatar name={w.settings.teacher || "Teacher"} />
          </div>
        </div>
        <header className="page-header">
          <div>
            <h1>{descriptions[tab][0]}</h1>
            <p>{descriptions[tab][1]}</p>
          </div>
          {tab === "overview" && (
            <button onClick={() => go("assessments")}>
              <Plus size={19} /> Record assessment
            </button>
          )}
        </header>
        {!demo && rows.length > 1 && (
          <label className="field workspace-picker">
            <span>School workspace</span>
            <select
              value={row.id}
              onChange={(e) =>
                navigate(() => {
                  setRow(rows.find((r) => r.id === e.target.value));
                  setClassId("");
                  setSubjectId("");
                })
              }
            >
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.payload.settings.school}
                </option>
              ))}
            </select>
          </label>
        )}
        {c && (
          <div className="context-bar">
            <label className="field">
              <span>Class</span>
              <select
                aria-label="Class"
                value={c.id}
                onChange={(e) =>
                  navigate(() => {
                    setClassId(e.target.value);
                    setSubjectId("");
                    setStudentId("");
                  })
                }
              >
                {w.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {b && (
              <label className="field">
                <span>Subject</span>
                <select
                  aria-label="Subject"
                  value={b.id}
                  onChange={(e) => navigate(() => setSubjectId(e.target.value))}
                >
                  {c.subjects.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="context-note">
              Every learner. A little further.
            </span>
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <strong>Changes may be unsaved.</strong>
            <p>{error}</p>
            <div className="row">
              <button
                className="quiet small"
                onClick={() => downloadBackup(draftRef.current || w)}
              >
                Export recovery copy
              </button>
              <button
                className="quiet small"
                onClick={() =>
                  navigate(() => (demo ? location.reload() : reload()))
                }
              >
                <RefreshCw size={14} /> Reload saved data
              </button>
            </div>
          </div>
        )}
        <div className="view-content" key={tab + ":" + c?.id + ":" + b?.id}>
          <fieldset className="workspace-fields" disabled={busy}>
            {tab === "overview" && (
              <Overview
                {...{ w, c, b, go }}
                openStudent={(sid) => {
                  setStudentId(sid);
                  go("reports");
                }}
              />
            )}
            {tab === "classes" && (
              <Classes
                {...{ w, c, b, update }}
                selectClass={(sid) =>
                  navigate(() => {
                    setClassId(sid);
                    setSubjectId("");
                  })
                }
              />
            )}
            {tab === "assessments" && (
              <Assessments {...{ w, c, b, update, setDirty }} />
            )}
            {tab === "syllabus" && <Syllabus {...{ c, b, update }} />}
            {tab === "leaderboard" && <Leaderboard {...{ w, c, b, share }} />}
            {tab === "reports" && (
              <Reports {...{ w, c, studentId, setStudentId, update, share }} />
            )}
            {tab === "settings" && (
              <Settings {...{ w, c, b, update, row, demo, user, notify }} />
            )}
          </fieldset>
        </div>
        <footer className="app-footer">
          <span>ClassInsights</span>
          <span>See the person behind the progress.</span>
        </footer>
      </main>
      {notice && (
        <div
          className={"toast " + (notice.isError ? "warning" : "")}
          role="status"
        >
          <Check size={18} />
          <span>{notice.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {shareResult && (
        <Modal title="Ready to share." close={() => setShareResult(null)}>
          <p>
            The snapshot expires on {shareResult.expires_at.slice(0, 10)}. You
            can revoke it in School settings.
          </p>
          <input
            aria-label="Shared link"
            readOnly
            value={shareResult.url}
            onFocus={(e) => e.target.select()}
          />
          <div className="row">
            <button
              onClick={() =>
                navigator.clipboard
                  .writeText(shareResult.url)
                  .then(() => notify("Link copied."))
                  .catch(() => notify("Select and copy the link above.", true))
              }
            >
              Copy link
            </button>
            <a
              className="button quiet"
              target="_blank"
              rel="noreferrer"
              href={shareResult.url}
            >
              Open shared view <ExternalLink size={16} />
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
