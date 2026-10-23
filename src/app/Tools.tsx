import { useState } from "react";
import { useCatalog } from "../lib/api";
import { JobCard, Uploader, useRunner } from "./shared";

const NEED_LABEL: Record<string, string> = { image: "Image", image2: "Second image (reference / garment / face)", video: "Video", audio: "Audio / voice" };

export function ToolsPage() {
  const { tools } = useCatalog();
  const [toolId, setToolId] = useState(tools[0].id);
  const tool = tools.find((t) => t.id === toolId)!;
  const [files, setFiles] = useState<Record<string, string[]>>({});
  const [prompt, setPrompt] = useState("");
  const { jobs, run, error, busy } = useRunner();

  const get = (k: string) => files[k] || [];
  const missing = tool.needs.some((n) => (n === "prompt" ? !prompt.trim() : !get(n).length));

  function go() {
    const primary = tool.needs.includes("video") ? get("video") : get("image");
    const images = tool.needs.includes("image2") ? [...primary, ...get("image2")] : primary;
    run({ kind: "tool", tool: tool.id, prompt, images, audio: get("audio")[0], ratio: "1:1" });
  }

  return (
    <>
      <div className="page-head"><div><span className="mono">Tools</span><h2>Every tool, <em>one canvas.</em></h2></div></div>
      <div className="chips" style={{ marginBottom: 22 }}>
        {tools.map((t) => <button key={t.id} className={`chip ${t.id === toolId ? "on" : ""}`} onClick={() => { setToolId(t.id); setFiles({}); }}>{t.name}</button>)}
      </div>
      <div className="studio-layout">
        <div className="card pad stack">
          <div><h3>{tool.name}</h3><p className="note" style={{ margin: "4px 0 0" }}>{tool.blurb}</p></div>
          {tool.needs.filter((n) => n !== "prompt").map((n) => (
            <div key={n} className="stack" style={{ gap: 6 }}>
              <span className="note">{NEED_LABEL[n]}</span>
              <Uploader label={`Add ${n === "audio" ? "audio" : n === "video" ? "video" : "image"}`} accept={n === "video" ? "video/*" : n === "audio" ? "audio/*" : "image/*"} max={1} multiple={false} value={get(n)} onChange={(v) => setFiles({ ...files, [n]: v })} />
            </div>
          ))}
          {tool.needs.includes("prompt") && <label className="f">Instruction<textarea className="in" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={tool.id === "extend" ? "Extend the scene to the left: more street, same light" : "Replace the sign with a potted fern"} /></label>}
          {error && <div className="err">{error}</div>}
          <button className="btn primary lg" disabled={busy || missing} onClick={go}>{busy ? "Submitting…" : "Run"}</button>
        </div>
        <div>{jobs.length === 0 ? <div className="card pad note">Results appear here.</div> : <div className="result-grid">{jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>}</div>
      </div>
    </>
  );
}
