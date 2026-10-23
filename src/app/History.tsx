import { useEffect, useState } from "react";
import { api, type Job } from "../lib/api";
import { JobCard } from "./shared";

export function HistoryPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [filter, setFilter] = useState("all");
  const load = () => api<{ jobs: Job[] }>("/api/history").then((r) => setJobs(r.jobs));
  useEffect(() => { load(); }, []);
  const [shareErr, setShareErr] = useState("");
  async function toggleShare(job: Job, index: number) {
    setShareErr("");
    try {
      const existing = job.shares?.[index];
      if (existing) await api(`/api/shares/${existing}`, { method: "DELETE" });
      const id = existing ? null : (await api<{ share: { id: string } }>("/api/shares", { body: { jobId: job.id, index } })).share.id;
      setJobs((list) => (list || []).map((j) => {
        if (j.id !== job.id) return j;
        const shares = { ...(j.shares || {}) };
        if (id) shares[index] = id; else delete shares[index];
        return { ...j, shares };
      }));
    } catch (e: any) { setShareErr(e.message); }
  }
  const shown = (jobs || []).filter((j) => filter === "all" || j.kind === filter);
  return (
    <>
      <div className="page-head"><div><span className="mono">History</span><h2>Everything you <em>made.</em></h2></div>
        <div className="chips">{["all", "image", "video", "tool", "videozypher"].map((f) => <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f === "videozypher" ? "reference swap" : f}</button>)}</div>
      </div>
      {shareErr && <div className="err" style={{ marginBottom: 12 }}>{shareErr}</div>}
      {jobs === null ? <div className="spinner" /> : shown.length === 0 ? <div className="card pad note">Nothing here yet.</div> : (
        <div className="result-grid">
          {shown.map((j) => (
            <div key={j.id} style={{ display: "contents" }}>
              <JobCard job={j} onShare={toggleShare} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
