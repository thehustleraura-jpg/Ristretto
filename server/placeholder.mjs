// Deterministic gradient art used for mock generations, reference thumbnails and the community feed.
function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const RATIOS = { "1:1": [1024, 1024], "3:4": [900, 1200], "4:5": [960, 1200], "9:16": [720, 1280], "16:9": [1280, 720], "3:2": [1200, 800], "2:3": [800, 1200] };

export function placeholderSvg(seed, q = {}) {
  const r = rng(seed);
  const [w, h] = RATIOS[q.ratio] || RATIOS["1:1"];
  const hue = Math.floor(r() * 360);
  const hue2 = (hue + 40 + Math.floor(r() * 80)) % 360;
  const label = String(q.label || "").slice(0, 40).replace(/[<>&"]/g, "");
  const animated = q.video === "1";
  const blobs = Array.from({ length: 4 }, (_, i) => {
    const cx = Math.floor(r() * w), cy = Math.floor(r() * h), rad = Math.floor(Math.min(w, h) * (0.25 + r() * 0.4));
    const dx = Math.floor((r() - 0.5) * w * 0.3), dy = Math.floor((r() - 0.5) * h * 0.3);
    const anim = animated
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;${dx} ${dy};0 0" dur="${4 + i}s" repeatCount="indefinite"/>`
      : "";
    return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="hsl(${(hue + i * 25) % 360} 70% ${40 + i * 6}%)" opacity="0.55">${anim}</circle>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 45% 14%)"/><stop offset="1" stop-color="hsl(${hue2} 50% 22%)"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="${Math.round(Math.min(w, h) / 10)}"/></filter></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><g filter="url(#b)">${blobs}</g>
<rect width="${w}" height="${h}" fill="none" stroke="rgba(255,255,255,.06)"/>
${label ? `<text x="${w / 2}" y="${h - 36}" text-anchor="middle" font-family="monospace" font-size="${Math.round(Math.min(w, h) / 40)}" fill="rgba(255,255,255,.6)">${label}</text>` : ""}
</svg>`;
}
