import { useEffect, useState } from "react";
import { Download, Upload, Plus, Trash2, Link2 } from "lucide-react";
import { Field, Empty } from "./components.jsx";
import { id, migrateLegacy, localDate } from "./model.js";
import { listShares, revokeShare, supabase } from "./cloud.js";
export function downloadBackup(w) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob([JSON.stringify(w, null, 2)], { type: "application/json" }),
    );
  a.href = url;
  a.download = `ClassInsights-${localDate()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Settings({ w, c, b, update, row, demo, user, notify }) {
  const [shares, setShares] = useState([]),
    [invites, setInvites] = useState([]),
    [profile, setProfile] = useState(w.settings),
    [rubric, setRubric] = useState(b?.elements || []);
  useEffect(() => {
    setRubric(b?.elements || []);
  }, [b?.id]);
  async function refresh() {
    if (demo || !row) return;
    try {
      setShares(await listShares(row.id));
      const { data, error } = await supabase
        .from("ci_staff")
        .select("*")
        .eq("workspace_id", row.id);
      if (error) throw error;
      setInvites(data);
    } catch (e) {
      notify(e.message, true);
    }
  }
  useEffect(() => {
    refresh();
  }, [row?.id]);
  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024)
      return notify("Backup must be under 10 MB.", true);
    try {
      const parsed = JSON.parse(await file.text()),
        next = migrateLegacy(parsed);
      if (
        !confirm(
          `Replace this workspace with ${next.classes.length} classes and ${next.sessions.length} assessments? Export a backup first. Legacy files use the last recorded scale and weights because the original app did not save historical rubrics.`,
        )
      )
        return;
      await update((n) => Object.assign(n, next));
    } catch (err) {
      notify("Import stopped: " + err.message, true);
    }
  }
  const owner = !demo && row?.owner_id === user?.id;
  return (
    <>
      <section className="glass">
        <h2>Your school, your workspace.</h2>
        <p className="sub">
          Profile and marking defaults. Existing assessments keep their original
          scale.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update((n) => (n.settings = profile));
          }}
        >
          <div className="form-grid">
            <Field label="School name">
              <input
                required
                maxLength={200}
                value={profile.school}
                onChange={(e) =>
                  setProfile({ ...profile, school: e.target.value })
                }
              />
            </Field>
            <Field label="Teacher / headmaster">
              <input
                maxLength={200}
                value={profile.teacher}
                onChange={(e) =>
                  setProfile({ ...profile, teacher: e.target.value })
                }
              />
            </Field>
            <Field label="Default maximum mark">
              <select
                value={profile.maxScore}
                onChange={(e) =>
                  setProfile({ ...profile, maxScore: Number(e.target.value) })
                }
              >
                {[5, 10, 20, 25, 50, 100].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          </div>
          <button>Save school settings</button>
        </form>
      </section>
      {b && (
        <section className="glass">
          <h2>Assessment skills · {b.name}</h2>
          <p className="sub">
            Changes apply to new assessments only. Weights automatically
            normalise.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update(
                (n) =>
                  (n.classes
                    .find((x) => x.id === c.id)
                    .subjects.find((x) => x.id === b.id).elements = rubric),
              );
            }}
          >
            {rubric.map((el, i) => (
              <div className="rubric-row" key={el.key}>
                <Field label="Skill">
                  <input
                    required
                    maxLength={200}
                    value={el.label}
                    onChange={(e) =>
                      setRubric((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Weight">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={el.weight}
                    onChange={(e) =>
                      setRubric((prev) =>
                        prev.map((x, j) =>
                          j === i
                            ? { ...x, weight: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </Field>
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label={"Remove skill " + el.label}
                  disabled={rubric.length === 1}
                  onClick={() =>
                    setRubric((prev) => prev.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <div className="row">
              <button
                type="button"
                className="quiet"
                disabled={rubric.length >= 30}
                onClick={() =>
                  setRubric([
                    ...rubric,
                    { key: id(), label: "New skill", weight: 0 },
                  ])
                }
              >
                <Plus size={16} /> Add skill
              </button>
              <button>Save rubric for future assessments</button>
            </div>
          </form>
        </section>
      )}
      <section className="glass">
        <h2>Keep a copy. Keep control.</h2>
        <p className="sub">
          JSON backups include the full gradebook and private notes. Store them
          securely.
        </p>
        <div className="row">
          <button className="quiet" onClick={() => downloadBackup(w)}>
            <Download size={17} /> Export gradebook backup
          </button>
          <label className="button quiet">
            <Upload size={17} /> Import backup
            <input
              type="file"
              accept="application/json,.json"
              onChange={importFile}
              className="sr-only"
            />
          </label>
        </div>
        <p className="helper">
          To migrate the old browser app, use the included legacy-export.js
          instructions. Browser storage does not transfer to a new Vercel
          domain.
        </p>
      </section>
      {!demo && (
        <>
          <section className="glass">
            <h2>Shared links</h2>
            <p className="sub">
              Snapshots expire in seven days. Revoke a link whenever access
              should end.
            </p>
            <button className="quiet small" onClick={refresh}>
              Refresh links
            </button>
            {shares.map((s) => (
              <div className="subject-row" key={s.id}>
                <div>
                  <strong>
                    {s.kind === "parent"
                      ? "Private parent report"
                      : "Leaderboard"}
                  </strong>
                  <small className="block muted">
                    {s.parent_email || "Anyone with this link"} · Expires{" "}
                    {s.expires_at.slice(0, 10)}
                  </small>
                </div>
                <button
                  className="quiet danger small"
                  onClick={async () => {
                    try {
                      await revokeShare(s.id);
                      await refresh();
                      notify("Link revoked.");
                    } catch (e) {
                      notify(e.message, true);
                    }
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
          </section>
          <section className="glass">
            <h2>School staff access</h2>
            <p className="sub">
              Staff can view and edit the entire school workspace. Only its
              owner can manage invitations. Parents use private reports instead.
            </p>
            {owner && (
              <form
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const form = e.currentTarget;
                  const { error } = await supabase
                    .from("ci_staff")
                    .insert({
                      workspace_id: row.id,
                      email: String(f.get("email")).trim().toLowerCase(),
                    });
                  if (error) notify(error.message, true);
                  else {
                    form.reset();
                    refresh();
                    notify(
                      "Staff access granted. Ask them to sign in; no email was sent.",
                    );
                  }
                }}
              >
                <input
                  name="email"
                  type="email"
                  required
                  aria-label="Staff Google email"
                  placeholder="Teacher’s Google email"
                />
                <button>
                  <Plus size={17} /> Grant staff access
                </button>
              </form>
            )}
            {invites.map((inv) => (
              <div className="subject-row" key={inv.email}>
                <span>{inv.email}</span>
                {owner && (
                  <button
                    className="quiet danger small"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("ci_staff")
                        .delete()
                        .eq("workspace_id", row.id)
                        .eq("email", inv.email);
                      if (error) notify(error.message, true);
                      else refresh();
                    }}
                  >
                    Remove access
                  </button>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
