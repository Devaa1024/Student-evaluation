import { useCallback, useEffect, useState } from "react";
import { supabase } from "./cloud.js";
import { Brand } from "./components.jsx";
const date = (v) =>
  v
    ? new Date(v).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })
    : "—";
export default function Admin({ user, logout }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState(null),
    [payment, setPayment] = useState(null),
    [reference, setReference] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const load = useCallback(async (q = "") => {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("ci_admin_overview", {
        search_text: q,
      });
      if (error) throw error;
      setData(data);
    } catch (e) {
      setData(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function inspect(id) {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("ci_admin_workspace", {
        workspace: id,
      });
      if (error) throw error;
      setDetail(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function record(e) {
    e.preventDefault();
    if (!confirmed) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("ci_record_payment", {
        target_user: payment.id,
        payment_reference: reference,
      });
      if (error) throw error;
      setPayment(null);
      setReference("");
      setConfirmed(false);
      await load(search);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-page">
      <header className="glass section-head">
        <div>
          <Brand />
          <span className="plan-badge">PLATFORM ADMINISTRATION</span>
          <p>{user.email} · Malaysia time</p>
        </div>
        <div className="row">
          <a className="button quiet" href="/">
            Teacher app
          </a>
          <button className="quiet" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <h1>Users, payments & school data.</h1>
      <p>Private administration. Knowing this URL does not grant access.</p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Loading…</p>}
      {data && (
        <>
          <div className="admin-metrics">
            {[
              ["Users", data.metrics.users],
              ["Workspaces", data.metrics.workspaces],
              ["Active Pro", data.metrics.activePro],
              [
                "Verified receipts",
                `RM${(data.metrics.paymentsSen / 100).toFixed(2)}`,
              ],
            ].map(([k, v]) => (
              <section className="glass" key={k}>
                <span>{k}</span>
                <h2>{v}</h2>
              </section>
            ))}
          </div>
          <form
            className="inline-form glass"
            onSubmit={(e) => {
              e.preventDefault();
              setDetail(null);
              load(search);
            }}
          >
            <input
              aria-label="Search users by email"
              placeholder="Search by email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
            />
            <button disabled={busy}>Search / refresh</button>
          </form>
          <p className="helper">
            Latest 100 matching users, workspaces and payments. Search by email
            to narrow results. Metrics cover all accounts. Revenue here is
            recorded receipts, not a bank reconciliation.
          </p>
          <section className="glass">
            <h2>Accounts & activation requests</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Last login</th>
                    <th>Plan</th>
                    <th>Paid until</th>
                    <th>Request</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        {u.email}
                        <small className="block muted">
                          {u.workspace_count} workspaces · joined{" "}
                          {date(u.created_at)}
                        </small>
                      </td>
                      <td>{date(u.last_sign_in_at)}</td>
                      <td>{u.pro ? "Pro" : "Free"}</td>
                      <td>{date(u.period_end)}</td>
                      <td>{u.request_status || "—"}</td>
                      <td>
                        <button
                          className="quiet"
                          disabled={busy}
                          onClick={() => {
                            setPayment(u);
                            setReference("");
                            setConfirmed(false);
                          }}
                        >
                          Record verified payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {payment && (
            <section className="glass">
              <h2>Verify RM19.90 received · {payment.email}</h2>
              <p>
                This grants one calendar month (or extends an active
                membership). Confirm receipt in your payment account first. A
                screenshot or request is not proof. Duplicate references are
                rejected.
              </p>
              <form onSubmit={record}>
                <label className="field">
                  <span>Bank / provider transaction reference</span>
                  <input
                    required
                    minLength={3}
                    maxLength={200}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  I independently verified receipt of RM19.90 for this account.
                </label>
                <div className="row">
                  <button disabled={busy || !confirmed}>
                    Record RM19.90 & activate one month
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => setPayment(null)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}
          <section className="glass">
            <h2>School usage & data</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>School</th>
                    <th>Owner</th>
                    <th>Classes</th>
                    <th>Students</th>
                    <th>Assessments</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workspaces.map((w) => (
                    <tr key={w.id}>
                      <td>{w.school}</td>
                      <td>{w.email}</td>
                      <td>{w.classes}</td>
                      <td>{w.students}</td>
                      <td>{w.assessments}</td>
                      <td>
                        <button
                          className="quiet"
                          disabled={busy}
                          onClick={() => inspect(w.id)}
                        >
                          Inspect records
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {detail && (
            <section className="glass">
              <div className="section-head">
                <h2>Workspace records · {detail.payload.settings.school}</h2>
                <button className="quiet" onClick={() => setDetail(null)}>
                  Close records
                </button>
              </div>
              <p>
                Read-only inspection. Access is recorded in the administrator
                audit log. This contains private school information.
              </p>
              <pre className="admin-json">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </section>
          )}
          <section className="glass">
            <h2>Verified payment ledger</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Period</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.email}</td>
                      <td>RM{(p.amount_sen / 100).toFixed(2)}</td>
                      <td>{p.reference}</td>
                      <td>
                        {date(p.period_start)} → {date(p.period_end)}
                      </td>
                      <td>{date(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <details className="glass">
            <summary>Recent administrator activity</summary>
            {data.audit.map((a) => (
              <p key={a.id}>
                {date(a.created_at)} · {a.action} · {a.target}
              </p>
            ))}
          </details>
        </>
      )}
    </main>
  );
}
