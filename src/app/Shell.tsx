import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth, useCatalog } from "../lib/api";

const NAV: [string, string, string][] = [
  ["/app", "Create", "✦"],
  ["/app/studios", "Studios", "▦"],
  ["/app/characters", "Characters", "☺"],
  ["/app/tools", "Tools", "✎"],
  ["/app/videozypher", "Reference Swap", "⇄"],
  ["/app/history", "History", "◷"],
  ["/app/community", "Community", "❖"],
];

export function Shell() {
  const { user, logout } = useAuth();
  const { brand, provider } = useCatalog();
  const nav = useNavigate();
  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="logo"><i />{brand}</Link>
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/app"} className={({ isActive }) => `item ${isActive ? "active" : ""}`}><span aria-hidden>{icon}</span>{label}</NavLink>
        ))}
        <div className="grow" />
        <button className="btn sm" style={{ marginTop: 8 }} onClick={() => { logout(); nav("/"); }}>Sign out</button>
        <span className="mono" style={{ padding: "8px 4px 0" }}>provider: {provider}</span>
      </aside>
      <main className="main">
        {provider === "mock" && <div className="banner"><b>Mock mode.</b> Generations return placeholder art and no model is called. Set <code>PROVIDER=fal</code> and <code>FAL_KEY</code> on the server for real renders.</div>}
        <Outlet />
      </main>
    </div>
  );
}
