import { Link } from "react-router-dom";
import { placeholder, useCatalog } from "../lib/api";
import { Section, SiteFooter, SiteNav } from "../components/Site";

export function VideozypherLanding() {
  const { references } = useCatalog();
  return (
    <>
      <SiteNav />
      <div className="wrap hero">
        <span className="pill-trend"><b>NEW</b> Reference video studio · Beta</span>
        <h1>Same clip. <em>Your cast.</em></h1>
        <p className="lead">Reference Swap takes a clip and recasts it with your people, products or objects. The motion, camera, cuts, timing and audio stay exactly as filmed. Only the cast changes.</p>
        <Link className="btn primary lg" to="/app/videozypher">Make mine</Link>
        <p className="mono" style={{ marginTop: 18 }}>1080p · No watermarks</p>
      </div>

      <Section num="01 · LIBRARY" title={<>Turn one video into <em>many.</em></>} intro="Pick a reference clip or upload your own (4–30 seconds), choose who goes in, and render.">
        <div className="grid g4">
          {references.map((r) => (
            <Link key={r.id} to="/app/videozypher" className="card">
              <div className="thumb" style={{ aspectRatio: r.ratio === "9:16" ? "9/12" : "16/10" }}><img src={placeholder(r.seed, r.ratio, r.title)} alt="" /></div>
              <div className="body"><b>{r.title}</b><p className="mono" style={{ marginTop: 6 }}>{r.tag}</p></div>
            </Link>
          ))}
        </div>
      </Section>

      <Section num="02 · HOW IT WORKS" title={<>Three steps, <em>no editing skills.</em></>} intro="The clip supplies the performance. You supply the people.">
        <div className="grid g3">
          {[["01", "Pick a reference clip", "Choose from the library or upload any 4–30 second clip. Its motion, camera, cuts and timing are what gets kept."],
            ["02", "Swap in your cast", "Add up to 4 people or objects with 1–4 photos each. Say who stands left, centre or right, or describe it in your own words."],
            ["03", "Generate and post", "Get a 1080p video the same length as the source, with the original audio kept. Download it and label it as AI-generated when you post."]].map(([n, t, d]) => (
            <div key={n} className="card pad"><span className="mono">{n}</span><h3 style={{ margin: "12px 0 8px" }}>{t}</h3><p className="note" style={{ margin: 0 }}>{d}</p></div>
          ))}
        </div>
        <div className="chips" style={{ marginTop: 24 }}>
          {["Clip 4–30 s", "Cast up to 4", "Photos 1–4 each", "1080p · source length", "Audio kept"].map((c) => <span key={c} className="chip">{c}</span>)}
        </div>
      </Section>

      <Section num="03 · BEYOND TRENDS" title={<>Any clip. <em>Any cast.</em></>}>
        <div className="grid g4">
          {[["Person swap", "Your face, their choreography. Up to four people in one clip."], ["Motion transfer", "Shoot the moves on a phone, recast them with any character."], ["Location restyle", "Keep the performance, rebuild the set."], ["Scene remix", "Borrow a clip's motion for a scene that is entirely yours."]].map(([t, d]) => (
            <div key={t} className="card pad"><h3 style={{ fontSize: 24, marginBottom: 8 }}>{t}</h3><p className="note" style={{ margin: 0 }}>{d}</p></div>
          ))}
        </div>
      </Section>

      <Section num="04 · PHOTO TIPS" title={<>Better photos, <em>better likeness.</em></>}>
        <div className="grid g3">
          {["One person per photo. Separate shots beat a group photo.", "Front-facing, eyes visible, no sunglasses or hands over the face.", "Even light, sharp focus, 300–6000 px per side.", "The outfit in the photo carries into the video, so dress the part.", "Add 2–4 angles of the same person for a tighter likeness."].map((t) => (
            <div key={t} className="card pad"><p style={{ margin: 0 }}>{t}</p></div>
          ))}
        </div>
      </Section>

      <SiteFooter />
    </>
  );
}
