import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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

// Bottom tab bar on mobile; Tools and Community live in the menu sheet.
const TABS: [string, string, string][] = [
  ["/app", "Create", "✦"],
  ["/app/studios", "Studios", "▦"],
  ["/app/characters", "Characters", "☺"],
  ["/app/videozypher", "Swap", "⇄"],
  ["/app/history", "History", "◷"],
];

export function Shell() {
  const { logout } = useAuth();
  const { brand, provider } = useCatalog();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => { setMenu(false); }, [loc.pathname]);
  const signOut = () => { logout(); nav("/"); };
  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="logo"><i />{brand}</Link>
        {NAV.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/app"} className={({ isActive }) => `item ${isActive ? "active" : ""}`}><span aria-hidden>{icon}</span>{label}</NavLink>
        ))}
        <div className="grow" />
        <button className="btn sm" style={{ marginTop: 8 }} onClick={signOut}>Sign out</button>
        <span className="mono" style={{ padding: "8px 4px 0" }}>provider: {provider}</span>
      </aside>

      <header className="m-head">
        <Link to="/" className="logo"><i />{brand}</Link>
        <button className="m-menu-btn" aria-label={menu ? "Close menu" : "Menu"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? "×" : "≡"}</button>
      </header>
      {menu && (
        <div className="m-sheet">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === "/app"} className={({ isActive }) => `item ${isActive ? "active" : ""}`}><span aria-hidden>{icon}</span>{label}</NavLink>
          ))}
          <div className="row" style={{ justifyContent: "space-between", padding: "10px 4px 0" }}>
            <span className="mono">provider: {provider}</span>
            <button className="btn sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      )}

      <main className="main">
        {provider === "mock" && <div className="banner"><b>Mock mode.</b> Generations return placeholder art and no model is called. Set <code>PROVIDER=fal</code> and <code>FAL_KEY</code> on the server for real renders.</div>}
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Studio">
        {TABS.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/app"} className={({ isActive }) => (isActive ? "on" : "")}><span aria-hidden>{icon}</span>{label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
