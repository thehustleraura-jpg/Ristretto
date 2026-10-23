import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, useCatalog } from "../lib/api";

export function SiteNav() {
  const { user } = useAuth();
  const { brand } = useCatalog();
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link to="/" className="logo"><i />{brand}</Link>
        <nav className="nav-links">
          <Link className="link" to="/videozypher">Reference Swap<span className="badge">NEW</span></Link>
          <Link className="btn primary sm" to={user ? "/app" : "/login"}>{user ? "Open studio" : "Start creating"}</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { brand } = useCatalog();
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <span>© 2026 {brand}</span>
        <span className="mono">No watermarks · Commercial license included</span>
      </div>
    </footer>
  );
}

export function Section({ num, title, intro, children }: { num: string; title: ReactNode; intro?: string; children: ReactNode }) {
  return (
    <section className="block">
      <div className="wrap">
        <div className="sec-head">
          <span className="mono sec-num">{num}</span>
          <h2>{title}</h2>
          {intro && <p>{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

