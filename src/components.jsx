import { useEffect, useRef } from "react";
import {
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  ChevronRight,
} from "lucide-react";
import { formatPct, localDate } from "./model.js";
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <BookOpen size={25} />
      </span>
      <span>
        Class<span className="brand-light">Insights</span>
      </span>
    </div>
  );
}
export function Avatar({ name }) {
  return (
    <span className="avatar">
      {name
        ?.split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("") || "CI"}
    </span>
  );
}
export function Pill({ children }) {
  return (
    <span
      className={
        "pill " +
        (children === "Needs support"
          ? "coral"
          : children === "Improving"
            ? "blue"
            : children === "Not assessed"
              ? "neutral"
              : "mint")
      }
    >
      {children}
    </span>
  );
}
export function Change({ value }) {
  return (
    <span
      className={
        "change " +
        (value == null ? "muted" : value < 0 ? "negative" : "positive")
      }
    >
      {value == null ? (
        <Minus size={14} />
      ) : value < 0 ? (
        <ArrowDownRight size={16} />
      ) : (
        <ArrowUpRight size={16} />
      )}{" "}
      {value == null ? "—" : `${value > 0 ? "+" : ""}${value} pp`}
    </span>
  );
}
export function Empty({ title = "A fresh start.", children }) {
  return (
    <div className="empty">
      <BookOpen size={30} />
      <h3>{title}</h3>
      <p>{children || "Add your first class and students to begin."}</p>
    </div>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function DateRange({ from, to, setFrom, setTo }) {
  return (
    <div className="range">
      <Field label="From">
        <input
          aria-label="From date"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </Field>
      <Field label="To">
        <input
          aria-label="To date"
          type="date"
          value={to}
          max={localDate()}
          onChange={(e) => setTo(e.target.value)}
        />
      </Field>
      {from && to && from > to && (
        <span className="negative">From must be before To.</span>
      )}
    </div>
  );
}
export function Modal({ title, close, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector("input,button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={ref}
        className="modal glass"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Tab") {
            const fields = [
              ...ref.current.querySelectorAll(
                "button,input,select,textarea,a[href]",
              ),
            ].filter((x) => !x.disabled);
            if (e.shiftKey && document.activeElement === fields[0]) {
              e.preventDefault();
              fields.at(-1)?.focus();
            } else if (
              !e.shiftKey &&
              document.activeElement === fields.at(-1)
            ) {
              e.preventDefault();
              fields[0]?.focus();
            }
          }
        }}
      >
        <div className="section-head">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function ProgressChart({ points, label = "Average mark" }) {
  const valid = points.filter((p) => p.pct != null);
  if (!valid.length)
    return (
      <Empty title="The story starts with an assessment.">
        Recorded marks will appear here.
      </Empty>
    );
  const x = (i) => 55 + i * (565 / Math.max(1, valid.length - 1)),
    y = (p) => 210 - p * 1.8;
  const path = valid
    .map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.pct)}`)
    .join(" ");
  return (
    <div className="chart">
      <svg viewBox="0 0 650 255" role="img" aria-label={label + " over time"}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00a58b" stopOpacity=".22" />
            <stop offset="1" stopColor="#00a58b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line x1="55" x2="620" y1={y(p)} y2={y(p)} className="grid-line" />
            <text x="4" y={y(p) + 4}>
              {p}%
            </text>
          </g>
        ))}
        <path
          d={`${path} L ${x(valid.length - 1)} 210 L 55 210 Z`}
          fill="url(#chart-fill)"
        />
        <path
          d={path}
          fill="none"
          stroke="#009984"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {valid.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(p.pct)}
              r="4"
              fill="var(--surface)"
              stroke="#009984"
              strokeWidth="2"
            >
              <title>
                {p.date}: {p.pct}%
              </title>
            </circle>
            {(i === 0 ||
              i === valid.length - 1 ||
              i % Math.max(1, Math.ceil(valid.length / 6)) === 0) && (
              <text textAnchor="middle" x={x(i)} y="240">
                {p.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
export function StudentTable({ rows, onSelect }) {
  return (
    <div className="table-scroll">
      <table className="student-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Average</th>
            <th>Change</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.student.id}>
              <td>
                <span className="person">
                  <Avatar name={r.student.name} />
                  <button
                    className="name-button"
                    title="Open progress report"
                    onClick={() => onSelect(r.student.id)}
                  >
                    {r.student.name}
                  </button>
                </span>
              </td>
              <td className="number">{formatPct(r.avg)}</td>
              <td>
                <Change value={r.change} />
              </td>
              <td>
                <Pill>{r.status}</Pill>
              </td>
              <td>
                <button
                  className="quiet small"
                  onClick={() => onSelect(r.student.id)}
                >
                  See progress <ChevronRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <Empty title="No students match." />}
    </div>
  );
}
