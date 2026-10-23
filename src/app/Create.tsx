import { useEffect, useMemo, useState } from "react";
import { api, useCatalog, type Character } from "../lib/api";
import { JobCard, RATIOS, Uploader, useRunner } from "./shared";

type Sheet = "model" | "ratio" | "count" | "seconds" | "character";
const COUNTS = [1, 2, 3, 4];
const SECONDS = [3, 5, 8, 10, 15];

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
  const [sheet, setSheet] = useState<Sheet | null>(null); // mobile chip picker
  const { jobs, run, error, busy } = useRunner();

  useEffect(() => { api<{ characters: Character[] }>("/api/characters").then((r) => setCharacters(r.characters)).catch(() => {}); }, []);
  useEffect(() => { setModelId(list[0].id); }, [list]);
  const model = list.find((m) => m.id === modelId) || list[0];
  const character = characters.find((c) => c.id === characterId);
  const pick = (fn: () => void) => () => { fn(); setSheet(null); };

  return (
    <>
      <div className="page-head"><div><span className="mono">Create</span><h2>Idea to image to <em>video.</em></h2></div></div>
      <div className="studio-layout">
        <div className="card pad stack form-card">
          <div className="seg" role="tablist">
            <button className={kind === "image" ? "on" : ""} onClick={() => setKind("image")}>Image</button>
            <button className={kind === "video" ? "on" : ""} onClick={() => setKind("video")}>Video</button>
          </div>
          <label className="f">Prompt
            <textarea className="in" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={kind === "image" ? "A ceramic mug on a sunlit windowsill, steam rising, 50mm" : "Slow dolly in on a lighthouse in a storm, cinematic"} />
          </label>
          <div className="chip-row" role="group" aria-label="Settings">
            <button className="pchip on" onClick={() => setSheet("model")}>{model.name}</button>
            <button className="pchip" onClick={() => setSheet("ratio")}>{ratio}</button>
            {kind === "image"
              ? <button className="pchip" aria-label={`Images: ${count}`} onClick={() => setSheet("count")}>×{count}</button>
              : <button className="pchip" aria-label={`Seconds: ${seconds}`} onClick={() => setSheet("seconds")}>{seconds}s</button>}
            <button className="pchip" onClick={() => setSheet("character")}>{character ? character.name : "No character"}</button>
          </div>
          <div className="stack desk-only" style={{ gap: 6 }}>
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
          <div className="row desk-only">
            <label className="f" style={{ flex: 1 }}>Aspect ratio
              <select className="in" value={ratio} onChange={(e) => setRatio(e.target.value)}>{RATIOS.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
            {kind === "image"
              ? <label className="f" style={{ width: 100 }}>Images<select className="in" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></label>
              : <label className="f" style={{ width: 110 }}>Seconds<select className="in" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>{[3, 5, 8, 10, 15].map((n) => <option key={n}>{n}</option>)}</select></label>}
          </div>
          <label className="f desk-only">Character (optional)
            <select className="in" value={characterId} onChange={(e) => setCharacterId(e.target.value)}>
              <option value="">None</option>
              {characters.map((c) => <option key={c.id} value={c.id}>#{c.number} {c.name}</option>)}
            </select>
          </label>
          {kind === "video" && <div className="stack" style={{ gap: 6 }}><span className="note">Start frame (optional, image-to-video)</span><Uploader label="Add a start frame" max={1} multiple={false} value={frame} onChange={setFrame} /></div>}
          {error && <div className="err">{error}</div>}
          <button className="btn primary lg gen-cta" disabled={busy || !prompt.trim()} onClick={() => run({ kind, model: modelId, prompt, ratio, count, seconds, characterId: characterId || undefined, images: frame })}>
            {busy ? "Submitting…" : "Generate"}
          </button>
        </div>
        <div>
          {jobs.length === 0 ? <div className="card pad note">Your renders appear here. Everything is saved to History.</div> : <div className="result-grid">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>}
        </div>
      </div>
      {sheet && (
        <div className="sheet-wrap" onClick={() => setSheet(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label={SHEET_TITLES[sheet]} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Escape" && setSheet(null)}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mono">{SHEET_TITLES[sheet]}</span>
              <button className="btn sm" autoFocus onClick={() => setSheet(null)}>Done</button>
            </div>
            <div className="sheet-opts">
              {sheet === "model" && list.map((m) => (
                <button key={m.id} className={m.id === modelId ? "on" : ""} onClick={pick(() => setModelId(m.id))}><b>{m.name}</b><small>{m.vendor} · {m.tag} · {m.res}</small></button>
              ))}
              {sheet === "ratio" && RATIOS.map((r) => <button key={r} className={r === ratio ? "on" : ""} onClick={pick(() => setRatio(r))}>{r}</button>)}
              {sheet === "count" && COUNTS.map((n) => <button key={n} className={n === count ? "on" : ""} onClick={pick(() => setCount(n))}>{n} {n === 1 ? "image" : "images"}</button>)}
              {sheet === "seconds" && SECONDS.map((n) => <button key={n} className={n === seconds ? "on" : ""} onClick={pick(() => setSeconds(n))}>{n} seconds</button>)}
              {sheet === "character" && (
                <>
                  <button className={!characterId ? "on" : ""} onClick={pick(() => setCharacterId(""))}>No character</button>
                  {characters.map((c) => <button key={c.id} className={c.id === characterId ? "on" : ""} onClick={pick(() => setCharacterId(c.id))}><b>{c.name}</b><small>Character #{c.number}</small></button>)}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const SHEET_TITLES: Record<Sheet, string> = { model: "Model", ratio: "Aspect ratio", count: "Images", seconds: "Seconds", character: "Character" };
