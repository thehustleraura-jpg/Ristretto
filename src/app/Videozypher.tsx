import { useRef, useState } from "react";
import { placeholder, uploadFile, useCatalog, type Job } from "../lib/api";
import { JobCard, Media, Uploader, downloadName, useRunner } from "./shared";

type Cast = { id: number; kind: "person" | "object"; label: string; photos: string[] };
// What the reference side of the preview shows; captured per job so it stays paired with its recast.
type Snap = { key: string; title: string; seconds: number; ratio: string; aspect: string; preview: string; video: boolean; castLabel: string };

const RATIO_OPTIONS = ["16:9", "9:16", "1:1", "4:5", "3:4", "3:2", "2:3"];
const nearestRatio = (w: number, h: number) =>
  RATIO_OPTIONS.reduce((best, r) => { const [a, b] = r.split(":").map(Number); const [x, y] = best.split(":").map(Number); return Math.abs(a / b - w / h) < Math.abs(x / y - w / h) ? r : best; });
const cssAspect = (r: string) => r.replace(":", " / ");

export function VideozypherApp() {
  const { references } = useCatalog();
  const [refId, setRefId] = useState(references[0].id);
  const [upload, setUpload] = useState<{ url: string; seconds: number; w: number; h: number } | null>(null);
  const [upErr, setUpErr] = useState("");
  const [cast, setCast] = useState<Cast[]>([{ id: 1, kind: "person", label: "Person 1", photos: [] }]);
  const [prompt, setPrompt] = useState("");
  const [snaps, setSnaps] = useState<Record<string, Snap>>({});
  const pairRef = useRef<HTMLDivElement>(null);
  const { jobs, run, error, busy } = useRunner();

  const ref = references.find((r) => r.id === refId)!;
  const seconds = upload ? upload.seconds : ref.seconds;
  const photoCount = cast.reduce((n, c) => n + c.photos.length, 0);
  const valid = cast.length > 0 && cast.every((c) => c.photos.length >= 1) && photoCount <= 9;
  const ratio = upload ? nearestRatio(upload.w, upload.h) : ref.ratio;
  const current: Snap = upload
    ? { key: upload.url, title: "Your clip", seconds: upload.seconds, ratio, aspect: `${upload.w} / ${upload.h}`, preview: upload.url, video: true, castLabel: "" }
    : { key: ref.id, title: ref.title, seconds: ref.seconds, ratio, aspect: cssAspect(ref.ratio), preview: placeholder(ref.seed, ref.ratio, ref.title), video: false, castLabel: "" };
  // The pair shows the latest job while its reference is still selected; otherwise the new selection with an empty recast slot.
  const latest = jobs[0];
  const paired = latest && snaps[latest.id]?.key === current.key ? latest : undefined;
  const shown = paired ? snaps[paired.id] : current;
  const recent = jobs.filter((j) => j !== paired);

  async function pickClip(f: File | undefined) {
    if (!f) return;
    setUpErr("");
    const probe = document.createElement("video");
    const objUrl = URL.createObjectURL(f);
    probe.preload = "metadata";
    probe.src = objUrl;
    const dur = await new Promise<number>((res, rej) => { probe.onloadedmetadata = () => res(probe.duration); probe.onerror = () => rej(new Error("Could not read this video")); }).catch((e) => { setUpErr(e.message); return 0; });
    const w = probe.videoWidth || 16, h = probe.videoHeight || 9;
    URL.revokeObjectURL(objUrl);
    if (!dur) return;
    if (dur < 4 || dur > 30) { setUpErr(`Clip is ${dur.toFixed(1)}s. Use a clip between 4 and 30 seconds.`); return; }
    try { setUpload({ url: await uploadFile(f), seconds: Math.round(dur), w, h }); } catch (e: any) { setUpErr(e.message); }
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
            <button className="btn primary lg" disabled={busy || !valid} onClick={() => {
              const snap = { ...current, castLabel: cast.map((c) => c.label.trim() || (c.kind === "person" ? "Person" : "Object")).join(" + ") };
              run({ kind: "videozypher", reference: upload ? upload.url : ref.id, cast: cast.map((c) => ({ label: c.label, kind: c.kind, photos: c.photos })), prompt, seconds, ratio }, (j) => {
                setSnaps((m) => ({ ...m, [j.id]: snap }));
                const r = pairRef.current?.getBoundingClientRect();
                if (r && (r.top < 0 || r.top > window.innerHeight * 0.4)) pairRef.current!.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}>
              {busy ? "Submitting…" : "Generate"}
            </button>
            <p className="note" style={{ margin: 0 }}>Use photos of people who agreed to appear and label the result as AI-generated.</p>
          </div>
        </div>
        <div className="stack">
          <div className="pair" ref={pairRef} style={{ scrollMarginTop: 80 }}>
            <div className="result">
              <div className="frame" style={{ aspectRatio: shown.aspect }}>
                <span className="tag">REFERENCE</span>
                {shown.video ? <video src={shown.preview} muted loop playsInline controls preload="metadata" /> : <img src={shown.preview} alt={shown.title} />}
              </div>
              <div className="meta"><span className="mono">{shown.title} · {shown.seconds}s</span></div>
            </div>
            <RecastCard job={paired} snap={shown} />
          </div>
          {recent.length > 0 && (
            <div className="card pad stack">
              <span className="mono">Recent swaps</span>
              <div className="result-grid">{recent.map((j) => <JobCard key={j.id} job={j} />)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RecastCard({ job, snap }: { job?: Job; snap: Snap }) {
  const out = job?.status === "done" ? job.outputs[0] : undefined;
  return (
    <div className="result recast">
      <div className="frame" style={{ aspectRatio: snap.aspect }}>
        <span className="tag">RECAST</span>
        {!job && <div className="empty">Your recast appears here.</div>}
        {job && (job.status === "queued" || job.status === "running") && <div className="pending"><div className="spinner" /></div>}
        {job?.status === "failed" && <div className="empty err">{job.error || "Failed"}</div>}
        {out && <Media o={out} ratio={snap.ratio} />}
      </div>
      <div className="meta">
        <span className="mono">{job ? `${snap.castLabel} · 1080p` : "Recast"}</span>
        {out && (out.url.startsWith("/")
          ? <a className="btn sm" href={out.url} download={downloadName(job!, out, 0)}>Download</a>
          : <a className="btn sm" href={out.url} target="_blank" rel="noreferrer">Open</a>)}
      </div>
    </div>
  );
}
