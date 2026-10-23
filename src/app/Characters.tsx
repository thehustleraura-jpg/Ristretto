import { useEffect, useState } from "react";
import { api, type Character } from "../lib/api";
import { Uploader } from "./shared";

export function CharactersPage() {
  const [list, setList] = useState<Character[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [imgs, setImgs] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const load = () => api<{ characters: Character[] }>("/api/characters").then((r) => setList(r.characters));
  useEffect(() => { load(); }, []);

  async function save() {
    setErr("");
    try {
      await api("/api/characters", { body: { name, description: desc, images: imgs } });
      setOpen(false); setName(""); setDesc(""); setImgs([]);
      load();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <>
      <div className="page-head">
        <div><span className="mono">Characters</span><h2>Same face. <em>Every frame.</em></h2><p className="note" style={{ margin: "6px 0 0" }}>Lock a face, look or product once. Pick it on Create or in any studio and it is sent as a reference.</p></div>
        <button className="btn primary" onClick={() => setOpen(!open)}>{open ? "Cancel" : "New character"}</button>
      </div>
      {open && (
        <div className="card pad stack" style={{ maxWidth: 560, marginBottom: 24 }}>
          <label className="f">Name<input className="in" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
          <label className="f">Notes (hair, build, signature details)<textarea className="in" value={desc} onChange={(e) => setDesc(e.target.value)} /></label>
          <div className="stack" style={{ gap: 6 }}><span className="note">Reference photos (1–6, front-facing, even light)</span><Uploader label="Add photos" max={6} value={imgs} onChange={setImgs} /></div>
          {err && <div className="err">{err}</div>}
          <button className="btn primary" onClick={save} disabled={!name.trim() || !imgs.length}>Lock character</button>
        </div>
      )}
      {list.length === 0 && !open && <div className="card pad note">No characters yet.</div>}
      <div className="grid g4">
        {list.map((c) => (
          <div key={c.id} className="card">
            <div className="thumb"><img src={c.images[0]} alt={c.name} /></div>
            <div className="body">
              <span className="mono">Character #{c.number} · locked</span>
              <h3 style={{ margin: "6px 0 4px" }}>{c.name}</h3>
              {c.description && <p>{c.description}</p>}
              <button className="btn sm danger" style={{ marginTop: 12 }} onClick={async () => { await api(`/api/characters/${c.id}`, { method: "DELETE" }); load(); }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
