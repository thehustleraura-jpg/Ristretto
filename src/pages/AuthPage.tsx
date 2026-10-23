import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, useAuth } from "../lib/api";
import { SiteNav } from "../components/Site";

export function AuthPage() {
  const { user, login, setup } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<{ needsSetup: boolean }>("/api/auth/status").then((r) => setNeedsSetup(r.needsSetup)).catch((e) => setErr(e.message)); }, []);

  if (user) return <Navigate to="/app" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (needsSetup) await setup(email, password, name); else await login(email, password);
      nav(sp.get("next") || "/app", { replace: true });
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <>
      <SiteNav />
      <form className="card pad auth-card stack" onSubmit={submit}>
        {needsSetup === null && !err ? <div className="spinner" /> : <>
          <h3>{needsSetup ? "Set up your studio" : "Welcome back"}</h3>
          {needsSetup && <p className="note" style={{ margin: 0 }}>Create the owner account. This is the only account, and setup closes once it exists.</p>}
          {needsSetup && <label className="f">Name<input className="in" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
          <label className="f">Email<input className="in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="f">Password<input className="in" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={needsSetup ? "new-password" : "current-password"} /></label>
          {err && <div className="err">{err}</div>}
          <button className="btn primary" disabled={busy || needsSetup === null}>{busy ? "…" : needsSetup ? "Create owner account" : "Sign in"}</button>
        </>}
      </form>
    </>
  );
}
