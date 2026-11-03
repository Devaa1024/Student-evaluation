import { useState } from "react";
import { supabase } from "./cloud.js";
export const PRICE = "RM19.90";
export function ProGate({ go, title = "Unlock student progress with Pro" }) {
  return (
    <section className="glass upgrade-card">
      <span className="plan-badge">CLASSINSIGHTS PRO</span>
      <h2>{title}</h2>
      <p>
        Add students, record marks, understand progress and share beautiful
        reports and leaderboards. Free setup stays available.
      </p>
      <strong className="price">
        {PRICE}
        <small> / calendar month</small>
      </strong>
      <button onClick={() => go("settings")}>
        View Pro benefits & activation
      </button>
    </section>
  );
}
export function PlanPanel({ row, plan, refresh, notify }) {
  const [busy, setBusy] = useState(false);
  async function request() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("ci_request_pro", {
        workspace: row.id,
      });
      if (error) throw error;
      await refresh();
      notify(
        "Request sent. The administrator will arrange payment and verify activation.",
      );
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="glass" id="plan">
      <div className="section-head">
        <div>
          <span className="plan-badge">
            {plan?.pro ? "PRO ACTIVE" : "FREE SETUP"}
          </span>
          <h2>Your plan, clearly explained.</h2>
        </div>
        <strong className="price">
          {PRICE}
          <small> / calendar month</small>
        </strong>
      </div>
      <p>
        One Pro membership covers school workspaces owned by the paying account,
        including invited staff. Parents pay nothing to open a report shared
        with them.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Free</th>
              <th>Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              "Google login and account access",
              "Create classes and subjects",
              "Create and edit weekly schedules",
            ].map((x) => (
              <tr key={x}>
                <td>{x}</td>
                <td>Included</td>
                <td>Included</td>
              </tr>
            ))}
            {[
              "Add and manage students",
              "Record marks, absence and observations",
              "Performance dashboard and support flags",
              "Achievement and growth leaderboards",
              "Private parent reports and follow-up goals",
              "Lesson topic tracking and staff invitations",
            ].map((x) => (
              <tr key={x}>
                <td>{x}</td>
                <td>—</td>
                <td>Included</td>
              </tr>
            ))}
            <tr>
              <td>
                Security settings, existing-data export and link revocation
              </td>
              <td>Always available</td>
              <td>Always available</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Calendar-month billing:</strong> one month from activation,
        renewing on the same date. A month ending sooner uses its last day. This
        is not a fixed 30-day pass. Dates are shown in Malaysia time.
      </p>
      {plan?.periodEnd && (
        <p>
          Paid access {plan.pro ? "ends" : "ended"}:{" "}
          <strong>
            {new Date(plan.periodEnd).toLocaleString("en-MY", {
              timeZone: "Asia/Kuala_Lumpur",
            })}
          </strong>
          .
        </p>
      )}
      <p className="helper">
        Online checkout is not connected yet. Activation is manual after the
        administrator verifies an actual RM19.90 payment. There is no automatic
        debit or automatic renewal. Requests alone never activate Pro. On
        expiry, existing records remain available for viewing and export; new
        paid entries and new shared links are blocked.
      </p>
      <div className="row">
        {plan?.owner && !plan.pro && (
          <button
            disabled={busy || plan.requestStatus === "pending"}
            onClick={request}
          >
            {plan.requestStatus === "pending"
              ? "Activation request pending"
              : busy
                ? "Sending…"
                : "Request Pro activation"}
          </button>
        )}
        <button className="quiet" onClick={refresh}>
          Refresh plan status
        </button>
      </div>
      {!plan?.owner && (
        <p>
          Only the workspace owner manages payment. Ask your school owner about
          Pro.
        </p>
      )}
    </section>
  );
}
export function SetupHome({ w, go, pro }) {
  const classes = w.classes.length,
    subjects = w.classes.reduce((n, c) => n + c.subjects.length, 0),
    schedules = w.schedules?.length || 0;
  return (
    <>
      <section className="glass">
        <span className="plan-badge">START HERE · {pro ? "PRO" : "FREE"}</span>
        <h2>Ready in three simple steps.</h2>
        <p>
          Create a class, add its subjects, then put lessons on your timetable.
          No students or marks are needed to finish setup.
        </p>
        <div className="setup-steps">
          {[
            [
              "1",
              "Classes & subjects",
              `${classes} classes · ${subjects} subjects`,
              "classes",
            ],
            [
              "2",
              "Weekly schedule",
              `${schedules} lessons scheduled`,
              "schedule",
            ],
            [
              "3",
              "Students & marks",
              pro
                ? "Pro is active. Start your first roster."
                : "Upgrade when you are ready to track students.",
              "classes",
            ],
          ].map(([n, title, copy, target]) => (
            <button
              className="setup-step quiet"
              key={n}
              onClick={() => go(target)}
            >
              <span className="brand-mark">{n}</span>
              <strong>{title}</strong>
              <span>{copy}</span>
            </button>
          ))}
        </div>
      </section>
      {!pro && <ProGate go={go} />}
    </>
  );
}
