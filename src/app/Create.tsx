import { useEffect, useMemo, useState } from "react";
import { api, useCatalog, type Character } from "../lib/api";
import { JobCard, RATIOS, Uploader, useRunner } from "./shared";

export function CreatePage() {
  const { models } = useCatalog();
  const [kind, setKind] = useState<"image" | "video">("image");
  const list = useMemo(() => models.filter((m) => m.kind === kind), [models, kind]);
  const [modelId, setModelId] = useState(list[0].id);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [count, setCount] = useState(1);
  const [seconds, setSeconds] = useState(5);
  const [frame, setFrame] = useState<string[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [characterId, setCharacterId] = useState("");
  const { jobs, run, error, busy } = useRunner();

  useEffect(() => { api<{ characters: Character[] }>("/api/characters").then((r) => setCharacters(r.characters)).catch(() => {}); }, []);
  useEffect(() => { setModelId(list[0].id); }, [list]);


  return (
    <>
      <div className="page-head"><div><span className="mono">Create</span><h2>Idea to image to <em>video.</em></h2></div></div>
      <div className="studio-layout">
        <div className="card pad stack">
          <div className="seg" role="tablist">
            <button className={kind === "image" ? "on" : ""} onClick={() => setKind("image")}>Image</button>
            <button className={kind === "video" ? "on" : ""} onClick={() => setKind("video")}>Video</button>
          </div>
          <label className="f">Prompt
            <textarea className="in" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={kind === "image" ? "A ceramic mug on a sunlit windowsill, steam rising, 50mm" : "Slow dolly in on a lighthouse in a storm, cinematic"} />
          </label>
          <div className="stack" style={{ gap: 6 }}>
            <span className="note">Model</span>
            <div className="model-pick">
              {list.map((m) => (
                <button key={m.id} className={m.id === modelId ? "on" : ""} onClick={() => setModelId(m.id)}>
                  <b>{m.name}</b>
                  <small>{m.vendor} · {m.tag} · {m.res}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <label className="f" style={{ flex: 1 }}>Aspect ratio
              <select className="in" value={ratio} onChange={(e) => setRatio(e.target.value)}>{RATIOS.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            {kind === "image"
              ? <label className="f" style={{ width: 100 }}>Images<select className="in" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
              : <label className="f" style={{ width: 110 }}>Seconds<select className="in" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>{[3, 5, 8, 10, 15].map((n) => <option key={n}>{n}</option>)}</select></label>}
          </div>
          <label className="f">Character (optional)
            <select className="in" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">None</option>
              {characters.map((c) => <option key={c.id} value={c.id}>#{c.number} {c.name}</option>)}
            </select>
          </label>
          {kind === "video" && <div className="stack" style={{ gap: 6 }}><span className="note">Start frame (optional, image-to-video)</span><Uploader label="Add a start frame" max={1} multiple={false} value={frame} onChange={setFrame} /></div>}
          {error && <div className="err">{error}</div>}
          <button className="btn primary lg" disabled={busy || !prompt.trim()} onClick={() => run({ kind, model: modelId, prompt, ratio, count, seconds, characterId: characterId || undefined, images: frame })}>
            {busy ? "Submitting…" : "Generate"}
          </button>
        </div>
        <div>
          {jobs.length === 0 ? <div className="card pad note">Your renders appear here. Everything is saved to History.</div> : <div className="result-grid">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>}
        </div>
      </div>
    </>
  );
}
