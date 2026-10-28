import { useState } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Users,
} from "lucide-react";
import { Brand } from "./components.jsx";
import { signIn } from "./cloud.js";
export default function Login({ onDemo, error: externalError }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function login() {
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <div className="login-top">
        <Brand />
        <span>Every learner, moving forward.</span>
      </div>
      <section className="login-story">
        <h1>
          See the progress.
          <br />
          Shape the <span>possibilities.</span>
        </h1>
        <p>
          One thoughtful space for teachers to understand every student — and
          for families to be part of the journey.
        </p>
        <div className="login-preview glass">
          <div className="section-head">
            <span className="person">
              <span className="stat-icon mint">
                <TrendingUp size={22} />
              </span>
              <strong>Small steps. Real growth.</strong>
            </span>
            <ArrowUpRight size={22} />
          </div>
          <div className="preview-bars">
            {[34, 46, 42, 62, 58, 76, 82, 94].map((h, i) => (
              <i key={i} style={{ height: h + "%" }} />
            ))}
          </div>
          <span className="sub">Understand the journey behind every mark.</span>
        </div>
        <div className="login-values">
          <span>
            <BookOpen size={17} /> Every class. Every subject.
          </span>
          <span>
            <Users size={17} /> A stronger school–home connection.
          </span>
        </div>
      </section>
      <section className="login-card glass">
        <span className="brand-mark">
          <BookOpen size={30} />
        </span>
        <h2>Welcome to ClassInsights</h2>
        <p>A little clarity for a lot of potential.</p>
        <button className="google-button" onClick={login} disabled={busy}>
          <span className="google-g" aria-hidden="true">
            G
          </span>
          {busy ? "Opening Google…" : "Continue with Google"}
          <ArrowRight size={18} />
        </button>
        {(error || externalError) && (
          <p className="error" role="alert">
            {error || externalError}
          </p>
        )}
        <p className="login-note">
          Use your school or personal Google account.
          <br />
          Parents open the private link shared by their teacher.
        </p>
        <div className="divider">
          <span>Take a look around</span>
        </div>
        <button className="quiet demo-button" onClick={onDemo}>
          Explore a sample classroom <ArrowUpRight size={17} />
        </button>
        <div className="privacy-note">
          <ShieldCheck size={20} />
          <span>
            School records stay private. You choose what to share with families.
          </span>
        </div>
      </section>
      <footer className="login-footer">
        Built for the people behind the progress.
      </footer>
    </main>
  );
}
