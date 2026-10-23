import { useEffect, useState } from "react";
import { api, type Job } from "../lib/api";
import { JobCard } from "./shared";

export function HistoryPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [filter, setFilter] = useState("all");
  const load = () => api<{ jobs: Job[] }>("/api/history").then((r) => setJobs(r.jobs));
  useEffect(() => { load(); }, []);
  const shown = (jobs || []).filter((j) => filter === "all" || j.kind === filter);
  return (
    <>
      <div className="page-head"><div><span className="mono">History</span><h2>Everything you <em>made.</em></h2></div>
        <div className="chips">{["all", "image", "video", "tool", "videozypher"].map((f) => <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f === "videozypher" ? "reference swap" : f}</button>)}</div>
      </div>
      {jobs === null ? <div className="spinner" /> : shown.length === 0 ? <div className="card pad note">Nothing here yet.</div> : (
        <div className="result-grid">
          {shown.map((j) => (
            <div key={j.id} style={{ display: "contents" }}>
              <JobCard job={j} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
