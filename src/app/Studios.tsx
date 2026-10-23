import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, placeholder, useCatalog, type Character, type Studio } from "../lib/api";
import { JobCard, Uploader, useRunner } from "./shared";

function StudioRoom({ studio }: { studio: Studio }) {
  const { models } = useCatalog();
  const nav = useNavigate();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [count, setCount] = useState(2);
  const [refs, setRefs] = useState<string[]>([]);
  const [characterId, setCharacterId] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const { jobs, run, error, busy } = useRunner();
  const model = models.find((m) => m.id === studio.model)!;
  useEffect(() => { setVals({}); }, [studio.id]);
  useEffect(() => { api<{ characters: Character[] }>("/api/characters").then((r) => setCharacters(r.characters)).catch(() => {}); }, []);

  const prompt = studio.template.replace(/\{(\w+)\}/g, (_, k) => vals[k]?.trim() || studio.fields.find((f) => f.key === k)?.placeholder || "");
  const ready = studio.fields.every((f) => vals[f.key]?.trim());
  const isVideoStudio = model.kind === "video";

  return (
    <>
      <div className="page-head">
        <div><span className="mono"><Link to="/app/studios">Studios</Link> / {studio.name}</span><h2>{studio.name}</h2><p className="note" style={{ margin: "6px 0 0" }}>{studio.blurb}</p></div>
        <button className="btn sm" onClick={() => nav("/app/studios")}>All studios</button>
      </div>
      <div className="studio-layout">
        <div className="card pad stack">
          <span className="chip" style={{ justifySelf: "start" }}>{model.name} · {studio.ratio}</span>
          {studio.fields.map((f) => (
            <label className="f" key={f.key}>{f.label}
              <input className="in" placeholder={f.placeholder} value={vals[f.key] || ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
            </label>
          ))}
          <label className="f">Character
            <select className="in" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">None</option>
              {characters.map((c) => <option key={c.id} value={c.id}>#{c.number} {c.name}</option>)}
            </select>
          </label>
          <div className="stack" style={{ gap: 6 }}><span className="note">Reference images (optional)</span><Uploader label="Add reference" max={3} value={refs} onChange={setRefs} /></div>
          {!isVideoStudio && <label className="f">Variations<select className="in" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>}
          <details><summary className="note" style={{ cursor: "pointer" }}>Prompt preview</summary><p className="note">{prompt}</p></details>
          {error && <div className="err">{error}</div>}
          <button className="btn primary lg" disabled={busy || !ready}
            onClick={() => run({ kind: model.kind, model: model.id, prompt, ratio: studio.ratio, count, seconds: 5, characterId: characterId || undefined, images: refs, studio: studio.id })}>
            {busy ? "Submitting…" : "Shoot"}
          </button>
        </div>
        <div>{jobs.length === 0 ? <div className="card pad note">Fill in the fields and shoot.</div> : <div className="result-grid">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>}</div>
      </div>
    </>
  );
}

export function StudiosPage() {
  const { studios } = useCatalog();
  const { id } = useParams();
  const studio = studios.find((s) => s.id === id);
  if (studio) return <StudioRoom studio={studio} />;
  return (
    <>
      <div className="page-head"><div><span className="mono">Studios</span><h2>A studio for <em>every job.</em></h2></div></div>
      <div className="grid g4">
        {studios.map((s, i) => (
          <Link key={s.id} to={`/app/studios/${s.id}`} className="card">
            <div className="thumb"><img src={placeholder(100 + i, "4:5")} alt="" /></div>
            <div className="body"><h3>{s.name}</h3><p>{s.blurb}</p></div>
          </Link>
        ))}
      </div>
    </>
  );
}
