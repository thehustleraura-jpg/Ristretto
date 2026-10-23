import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, placeholder, useCatalog, type CommunityItem } from "../lib/api";
import { Section, SiteFooter, SiteNav } from "../components/Site";

export function Landing() {
  const { models, studios, tools, brand } = useCatalog();
  const ticker = models.slice(0, 12);
  // Latest pieces shared from History; sample art until something is shared.
  const [shared, setShared] = useState<CommunityItem[] | null>(null);
  useEffect(() => { api<{ items: CommunityItem[] }>("/api/community?limit=8").then((r) => setShared(r.items)).catch(() => setShared([])); }, []);
  return (
    <>
      <SiteNav />
      <div className="wrap hero">
        <Link to="/videozypher" className="pill-trend"><b>NEW</b> Reference Swap — recast any clip with your own cast <span>→</span></Link>
        <h1>Cast, prompt,<br /><em>render.</em></h1>
        <p className="lead">Cast a character, add your product, describe the shot. {brand} renders the image and the video.</p>
        <Link className="btn primary lg" to="/login">Start creating</Link>
        <div className="hero-strip">
          {[3, 14, 25, 36].map((s, i) => (
            <div className="tile" key={s}><img src={placeholder(s, "3:4")} alt="" /><span className="cap mono">{["Naomi · wardrobe", "image → video", "product · held", "shot 04"][i]}</span></div>
          ))}
        </div>
      </div>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[...ticker, ...ticker].map((m, i) => <span key={i}><b>{m.vendor} {m.name}</b>{m.tag}</span>)}
        </div>
      </div>

      <Section num="01 · STUDIOS" title={<>A dedicated studio for <em>every job.</em></>} intro="Each studio comes preconfigured with the model, ratio and prompt structure that job needs, so you skip setup and start shooting.">
        <div className="grid g4">
          {studios.map((s, i) => (
            <Link key={s.id} to={`/app/studios/${s.id}`} className="card">
              <div className="thumb"><img src={placeholder(100 + i, "4:5")} alt="" /></div>
              <div className="body"><h3>{s.name}</h3><p>{s.blurb}</p></div>
            </Link>
          ))}
        </div>
      </Section>

      <Section num="02 · CHARACTERS" title={<>Same face. <em>Every frame.</em></>} intro="Lock a face, a look or a product once, then carry it across every shot, scene and format without re-prompting.">
        <div className="char-row">
          {["REF · LOCKED", "SHOT 02", "SHOT 03", "SHOT 04 · VIDEO", "SHOT 05"].map((l, i) => (
            <div key={l} className={`tile ${i === 0 ? "ref" : ""}`}>
              <img src={placeholder(7, "3:4", "")} style={{ filter: `hue-rotate(${i * 18}deg)` }} alt="" />
              <span className="cap mono">{l}</span>
            </div>
          ))}
        </div>
        <p className="mono" style={{ marginTop: 16 }}>Character #0413 "June" · locked across every output</p>
      </Section>

      <Section num="03 · MODELS" title={<>The best models, <em>all of them.</em></>} intro="The right model for every shot, image or video, curated and ready.">
        <div className="grid g3">
          {models.filter((m) => ["veo-3-1", "kling-3", "sora-2-pro", "nano-banana-pro", "flux-2-max", "seedream-4-5"].includes(m.id)).map((m) => (
            <div key={m.id} className="card pad">
              <div className="row" style={{ justifyContent: "space-between" }}><span className="mono">{m.tag}</span>{m.badge && <span className="chip on">{m.badge}</span>}</div>
              <h3 style={{ margin: "14px 0 8px" }}>{m.vendor} {m.name}</h3>
              <p className="note" style={{ margin: 0 }}>{m.blurb}</p>
              <div className="chips" style={{ marginTop: 14 }}><span className="chip">{m.kind}</span><span className="chip">{m.res}</span>{m.audio && <span className="chip">audio</span>}</div>
            </div>
          ))}
        </div>
        <p className="mono" style={{ marginTop: 20 }}>{models.length} models · image · video · edit · upscale · lipsync</p>
      </Section>

      <Section num="04 · TOOLS" title={<>Every tool, <em>one canvas.</em></>} intro="Generate, edit, upscale, relight and extend. The full toolkit lives in one workspace, with no exporting between apps.">
        <div className="tools-marquee">
          {tools.map((t) => <div key={t.id} className="tool-card"><b>{t.name}</b><span>{t.blurb}</span></div>)}
        </div>
      </Section>

      <Section num="05 · COMMUNITY" title={<>Made by the <em>community.</em></>} intro="A daily feed of what creators make here. Every piece started as a prompt.">
        <div className="grid g4">
          {shared && shared.length > 0
            ? shared.map((it) => <div key={it.id} className="card">{it.output.type === "video" && !it.output.mock ? <video src={it.output.url} muted loop playsInline autoPlay preload="metadata" /> : <img src={it.output.url} alt={it.prompt} loading="lazy" />}</div>)
            : Array.from({ length: 8 }, (_, i) => <div key={i} className="card"><img src={placeholder(200 + i, i % 2 ? "4:5" : "1:1")} alt="" /></div>)}
        </div>
      </Section>

      <div className="cta">
        <div className="wrap">
          <h2>The shot you need is <em>one prompt away.</em></h2>
          <p className="note" style={{ margin: "18px 0 28px", fontSize: 17 }}>Every model, every tool, one place to create.</p>
          <Link className="btn primary lg" to="/login">Start creating</Link>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
