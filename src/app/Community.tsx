import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type CommunityItem } from "../lib/api";
import { Media, useSpecName } from "./shared";

export function CommunityPage() {
  const [items, setItems] = useState<CommunityItem[] | null>(null);
  const [err, setErr] = useState("");
  const specName = useSpecName();
  useEffect(() => { api<{ items: CommunityItem[] }>("/api/community").then((r) => setItems(r.items)).catch((e) => setErr(e.message)); }, []);

  async function unshare(id: string) {
    setErr("");
    try {
      await api(`/api/shares/${id}`, { method: "DELETE" });
      setItems((list) => (list || []).filter((x) => x.id !== id));
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <div className="page-head"><div><span className="mono">Community</span><h2>Made by the <em>community.</em></h2><p className="note" style={{ margin: "6px 0 0" }}>Pieces you share from History. Shared pieces are public and appear on the landing page.</p></div></div>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      {items === null ? <div className="spinner" /> : items.length === 0 ? (
        <div className="card pad note">Nothing shared yet. Open <Link to="/app/history" style={{ color: "var(--accent)" }}>History</Link> and press Share on a render.</div>
      ) : (
        <div className="result-grid">
          {items.map((it) => (
            <div key={it.id} className="result">
              <Media o={it.output} ratio={it.ratio} />
              <div className="body" style={{ padding: "12px 12px 0" }}>
                {it.prompt && <p style={{ margin: 0, fontSize: 14 }}>{it.prompt}</p>}
              </div>
              <div className="meta">
                <span className="mono">{specName(it.spec)}</span>
                <button className="btn sm" onClick={() => unshare(it.id)}>Unshare</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
