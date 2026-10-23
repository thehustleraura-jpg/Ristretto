import { useState } from "react";
import { placeholder, uploadFile, useCatalog } from "../lib/api";
import { JobCard, Uploader, useRunner } from "./shared";

type Cast = { id: number; kind: "person" | "object"; label: string; photos: string[] };

export function VideozypherApp() {
  const { references } = useCatalog();
  const [refId, setRefId] = useState(references[0].id);
  const [upload, setUpload] = useState<{ url: string; seconds: number } | null>(null);
  const [upErr, setUpErr] = useState("");
  const [cast, setCast] = useState<Cast[]>([{ id: 1, kind: "person", label: "Person 1", photos: [] }]);
  const [prompt, setPrompt] = useState("");
  const { jobs, run, error, busy } = useRunner();

  const ref = references.find((r) => r.id === refId)!;
  const seconds = upload ? upload.seconds : ref.seconds;
  const photoCount = cast.reduce((n, c) => n + c.photos.length, 0);
  const valid = cast.length > 0 && cast.every((c) => c.photos.length >= 1) && photoCount <= 9;

  async function pickClip(f: File | undefined) {
    if (!f) return;
    setUpErr("");
    const probe = document.createElement("video");
    const objUrl = URL.createObjectURL(f);
    probe.preload = "metadata";
    probe.src = objUrl;
    const dur = await new Promise<number>((res, rej) => { probe.onloadedmetadata = () => res(probe.duration); probe.onerror = () => rej(new Error("Could not read this video")); }).catch((e) => { setUpErr(e.message); return 0; });
    URL.revokeObjectURL(objUrl);
    if (!dur) return;
    if (dur < 4 || dur > 30) { setUpErr(`Clip is ${dur.toFixed(1)}s. Use a clip between 4 and 30 seconds.`); return; }
    try { setUpload({ url: await uploadFile(f), seconds: Math.round(dur) }); } catch (e: any) { setUpErr(e.message); }
  }

  const update = (id: number, patch: Partial<Cast>) => setCast(cast.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <>
      <div className="page-head"><div><span className="mono">Reference Swap · Beta</span><h2>Same clip. <em>Your cast.</em></h2><p className="note" style={{ margin: "6px 0 0" }}>Motion, camera, cuts and audio come from the reference. Only the cast changes.</p></div></div>
      <div className="studio-layout" style={{ gridTemplateColumns: "460px 1fr" }}>
        <div className="stack">
          <div className="card pad stack">
            <span className="mono">1 · Reference video</span>
            {upload ? (
              <div className="row" style={{ justifyContent: "space-between" }}><span>Your clip · {upload.seconds}s</span><button className="btn sm" onClick={() => setUpload(null)}>Use library</button></div>
            ) : (
              <>
                <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {references.map((r) => (
                    <button key={r.id} onClick={() => setRefId(r.id)} style={{ all: "unset", cursor: "pointer", borderRadius: 12, overflow: "hidden", outline: r.id === refId ? "2px solid var(--accent)" : "1px solid var(--line)" }}>
                      <img src={placeholder(r.seed, "1:1", r.title)} alt={r.title} style={{ aspectRatio: "1", objectFit: "cover", width: "100%" }} />
                      <span className="mono" style={{ display: "block", padding: "6px 8px" }}>{r.title}</span>
                    </button>
                  ))}
                </div>
                <label className="drop">+ Upload your own clip (4–30 s)<input hidden type="file" accept="video/*" onChange={(e) => pickClip(e.target.files?.[0])} /></label>
              </>
            )}
            {upErr && <div className="err">{upErr}</div>}
          </div>

          <div className="card pad stack">
            <div className="row" style={{ justifyContent: "space-between" }}><span className="mono">2 · Swap in · {cast.length}/4 · {photoCount}/9 photos</span>
              <span className="row" style={{ gap: 6 }}>
                <button className="btn sm" disabled={cast.length >= 4} onClick={() => setCast([...cast, { id: Date.now(), kind: "person", label: `Person ${cast.length + 1}`, photos: [] }])}>+ Person</button>
                <button className="btn sm" disabled={cast.length >= 4} onClick={() => setCast([...cast, { id: Date.now(), kind: "object", label: `Object ${cast.length + 1}`, photos: [] }])}>+ Object</button>
              </span>
            </div>
            {cast.map((c) => (
              <div key={c.id} className="cast-card stack" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <input className="in" style={{ width: "70%" }} value={c.label} onChange={(e) => update(c.id, { label: e.target.value })} aria-label="Name or position" />
                  {cast.length > 1 && <button className="btn sm danger" onClick={() => setCast(cast.filter((x) => x.id !== c.id))}>Remove</button>}
                </div>
                <Uploader label={`Add ${c.kind} photos (1–4)`} max={Math.min(4, 4 - 0)} value={c.photos} onChange={(v) => { const others = photoCount - c.photos.length; update(c.id, { photos: v.slice(0, Math.max(0, 9 - others)) }); }} />
              </div>
            ))}
            <p className="note" style={{ margin: 0 }}>Front-facing, even light, no sunglasses. One person per photo.</p>
            <label className="f">Direction (optional)<input className="in" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Person 1 stands left, Person 2 right. Remove the red handbag." /></label>
          </div>

          <div className="card pad stack">
            <span className="mono">3 · Output</span>
            <div className="row"><span className="chip">Match source · {seconds}s</span><span className="chip">1080p</span><span className="chip">Audio kept</span></div>
            {error && <div className="err">{error}</div>}
            <button className="btn primary lg" disabled={busy || !valid} onClick={() => run({ kind: "videozypher", reference: upload ? upload.url : ref.id, cast: cast.map((c) => ({ label: c.label, kind: c.kind, photos: c.photos })), prompt, seconds, ratio: ref.ratio })}>
              {busy ? "Submitting…" : "Generate"}
            </button>
            <p className="note" style={{ margin: 0 }}>Use photos of people who agreed to appear and label the result as AI-generated.</p>
          </div>
        </div>
        <div>{jobs.length === 0 ? <div className="card pad note">Your recast videos appear here.</div> : <div className="result-grid">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>}</div>
      </div>
    </>
  );
}
