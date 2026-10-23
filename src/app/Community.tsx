import { placeholder } from "../lib/api";

const PROMPTS = [
  "Neon-lit ramen counter, rain on the window, 35mm", "Astronaut reading in a greenhouse, soft morning light", "Studio shot of a ceramic teapot, matte black, rim light",
  "Street style, camel coat, autumn leaves, Paris", "Macro of dew on a spiderweb at sunrise", "Retro-futurist kitchen, pastel palette, wide angle",
  "Portrait of a sailor, weathered skin, window light", "Isometric tiny island with a lighthouse", "Dancer mid-leap in an empty warehouse, long exposure",
  "Cozy reading nook with a sleeping cat", "Product flat-lay: sunscreen, shells, sand", "Cinematic desert road at blue hour",
];

export function CommunityPage() {
  return (
    <>
      <div className="page-head"><div><span className="mono">Community</span><h2>Made by the <em>community.</em></h2><p className="note" style={{ margin: "6px 0 0" }}>Sample feed. Sharing from History is not built yet.</p></div></div>
      <div className="grid g4">
        {PROMPTS.map((p, i) => (
          <div key={p} className="card">
            <img src={placeholder(300 + i, i % 3 === 0 ? "4:5" : "1:1")} alt="" />
            <div className="body"><p style={{ margin: 0 }}>{p}</p></div>
          </div>
        ))}
      </div>
    </>
  );
}
