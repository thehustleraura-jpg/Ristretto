import { useCallback, useRef, useState } from "react";
import { submitJob, uploadFile, waitForJob, type Job, type Output } from "../lib/api";

export function Media({ o, ratio }: { o: Output; ratio?: string }) {
  if (o.type === "video" && !o.mock) {
    const ar = ratio && /^\d+:\d+$/.test(ratio) ? ratio.replace(":", " / ") : undefined;
    return <video className="player" src={o.url} controls loop playsInline preload="metadata" style={{ aspectRatio: ar }} />;
  }
  return <img src={o.url} alt="" loading="lazy" />;
}

export function downloadName(job: Job, o: Output, i: number) {
  const ext = o.url.split("?")[0].split(".").pop() || (o.type === "video" ? "mp4" : "png");
  return `ristretto-${job.spec}-${job.id.replace(/^job_/, "")}${job.outputs.length > 1 ? `-${i + 1}` : ""}.${ext}`;
}

export function JobCard({ job }: { job: Job }) {
  const pending = job.status === "queued" || job.status === "running";
  return (
    <>
      {pending && <div className="result"><div className="pending"><div className="spinner" /></div><div className="meta"><span className="mono">{job.status}…</span></div></div>}
      {job.status === "failed" && <div className="result"><div className="pending err" style={{ padding: 16, textAlign: "center" }}>{job.error || "Failed"}</div></div>}
      {job.status === "done" && job.outputs.map((o, i) => (
        <div className="result" key={`${job.id}-${i}`}>
          <Media o={o} ratio={job.input.ratio} />
          <div className="meta">
            <span className="mono">{o.mock ? "mock render" : job.spec}</span>
            {o.url.startsWith("/")
              ? <a className="btn sm" href={o.url} download={downloadName(job, o, i)}>Download</a>
              : <a className="btn sm" href={o.url} target="_blank" rel="noreferrer">Open</a>}
          </div>
        </div>
      ))}
    </>
  );
}

/** Submits jobs and polls them. Newest first. */
export function useRunner() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (body: Record<string, unknown>, onSubmit?: (job: Job) => void) => {
    setError(""); setBusy(true);
    try {
      const j = await submitJob(body);
      onSubmit?.(j);
      setJobs((p) => [j, ...p]);
      setBusy(false);
      const done = await waitForJob(j.id, (t) => setJobs((p) => p.map((x) => (x.id === t.id ? t : x))));
      setJobs((p) => p.map((x) => (x.id === done.id ? done : x)));
    } catch (e: any) { setError(e.message); setBusy(false); }
  }, []);
  return { jobs, run, error, busy };
}

export function Uploader({ label, accept = "image/*", multiple = true, max = 4, value, onChange }: { label: string; accept?: string; multiple?: boolean; max?: number; value: string[]; onChange: (v: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isImg = accept.startsWith("image");
  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setErr(""); setBusy(true);
    try {
      const next = [...value];
      for (const f of Array.from(files)) {
        if (next.length >= max) break;
        next.push(await uploadFile(f));
      }
      onChange(next);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      {value.length > 0 && (
        <div className="thumbs">
          {value.map((u) => (
            <div className="t" key={u}>
              {isImg ? <img src={u} alt="" /> : <span className="mono" style={{ padding: 6, display: "block" }}>{u.split(".").pop()}</span>}
              <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x !== u))}>×</button>
            </div>
          ))}
        </div>
      )}
      {value.length < max && (
        <div className="drop" onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : `+ ${label}`}
          <input ref={input} hidden type="file" accept={accept} multiple={multiple && max > 1} onChange={(e) => pick(e.target.files)} />
        </div>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  );
}

export const RATIOS = ["1:1", "4:5", "3:4", "9:16", "16:9", "3:2"];
