import fs from "node:fs";
import path from "node:path";
import { placeholderSvg } from "./placeholder.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- mock: no keys needed, produces placeholder art ---------------- */
const mock = {
  name: "mock",
  async run(job, { FILES_DIR, uid }) {
    await sleep(1500 + Math.random() * 1500);
    const outs = [];
    const isVideo = job.kind === "video" || job.kind === "videozypher" || (job.kind === "tool" && job.spec === "lipsync");
    const n = job.kind === "image" ? job.input.count : 1;
    for (let i = 0; i < n; i++) {
      const name = `${uid("out")}.svg`;
      const label = `${job.kind}:${job.spec} · mock`;
      fs.writeFileSync(path.join(FILES_DIR, name), placeholderSvg(`${job.id}-${i}`, { ratio: job.input.ratio, label, video: isVideo ? "1" : "0" }));
      outs.push({ type: isVideo ? "video" : "image", url: `/files/${name}`, mock: true });
    }
    return outs;
  },
};

/* ---------------- fal.ai: set FAL_KEY and PROVIDER=fal ---------------- */
const FAL_BASE = "https://queue.fal.run";

function toRemote(url, FILES_DIR) {
  // Local uploads are sent as data URIs; remote URLs pass through.
  if (!url) return url;
  if (url.startsWith("/files/")) {
    const file = path.join(FILES_DIR, path.basename(url));
    const ext = path.extname(file).slice(1).toLowerCase();
    const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" }[ext] || "application/octet-stream";
    return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  }
  return url;
}

function buildInput(job, ctx) {
  const { FILES_DIR } = ctx;
  const i = job.input;
  const ref = (u) => toRemote(u, FILES_DIR);
  const characterRefs = (i.characterImages || []).map(ref);
  const base = { prompt: i.prompt, aspect_ratio: i.ratio };
  if (job.kind === "image") {
    return { ...base, num_images: i.count, ...(characterRefs.length ? { image_urls: characterRefs, image_url: characterRefs[0] } : {}) };
  }
  if (job.kind === "video") {
    const first = ref(i.images?.[0]) || characterRefs[0];
    return { ...base, duration: String(i.seconds), ...(first ? { image_url: first } : {}) };
  }
  if (job.kind === "tool") {
    return { prompt: i.prompt, image_url: ref(i.images?.[0]), second_image_url: ref(i.images?.[1]), video_url: ref(i.images?.[0]), audio_url: ref(i.audio) };
  }
  if (job.kind === "videozypher") {
    if (!String(i.reference).startsWith("/files/") && !String(i.reference).startsWith("http")) {
      throw new Error("Library clips are placeholders. Upload your own clip, or add real video URLs to the reference library.");
    }
    return { prompt: i.prompt, video_url: ref(i.reference), image_urls: (i.cast || []).flatMap((c) => (c.photos || []).map(ref)) };
  }
  return base;
}

function endpointFor(job, { MODELS, TOOLS }) {
  if (job.kind === "image" || job.kind === "video") return MODELS.find((m) => m.id === job.spec)?.fal;
  if (job.kind === "tool") return TOOLS.find((t) => t.id === job.spec)?.fal;
  if (job.kind === "videozypher") return process.env.FAL_VIDEOZYPHER_ENDPOINT || "fal-ai/kling-video/o1/video-to-video/edit";
}

function extract(result) {
  const out = [];
  for (const im of result.images || []) out.push({ type: "image", url: im.url });
  if (result.image?.url) out.push({ type: "image", url: result.image.url });
  if (result.video?.url) out.push({ type: "video", url: result.video.url });
  return out;
}

const EXT_BY_MIME = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

// Copies provider outputs into FILES_DIR so they are served same-origin (download + range seeking)
// and outlive the provider's CDN. If a copy fails, the remote URL is kept.
async function saveLocally(outs, { FILES_DIR, uid }) {
  return Promise.all(outs.map(async (o) => {
    if (!/^https?:\/\//.test(o.url)) return o;
    try {
      const r = await fetch(o.url);
      if (!r.ok) throw new Error(String(r.status));
      const mime = (r.headers.get("content-type") || "").split(";")[0].trim();
      const urlExt = path.extname(new URL(o.url).pathname).slice(1).toLowerCase();
      const ext = EXT_BY_MIME[mime] || (/^[a-z0-9]{2,4}$/.test(urlExt) ? urlExt : o.type === "video" ? "mp4" : "png");
      const name = `${uid("out")}.${ext}`;
      fs.writeFileSync(path.join(FILES_DIR, name), Buffer.from(await r.arrayBuffer()));
      return { ...o, url: `/files/${name}` };
    } catch {
      return o;
    }
  }));
}

const fal = {
  name: "fal",
  async run(job, ctx) {
    const key = process.env.FAL_KEY;
    const endpoint = endpointFor(job, ctx);
    if (!endpoint) throw new Error("No endpoint configured for this model");
    const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };
    const submit = await fetch(`${FAL_BASE}/${endpoint}`, { method: "POST", headers, body: JSON.stringify(buildInput(job, ctx)) });
    if (!submit.ok) throw new Error(`Provider rejected the request (${submit.status})`);
    const { status_url, response_url } = await submit.json();
    const deadline = Date.now() + 1000 * 60 * 10;
    while (Date.now() < deadline) {
      await sleep(2500);
      const s = await (await fetch(status_url, { headers })).json();
      if (s.status === "COMPLETED") {
        const r = await fetch(response_url, { headers });
        if (!r.ok) throw new Error(`Provider error (${r.status})`);
        const outs = extract(await r.json());
        if (!outs.length) throw new Error("Provider returned no output");
        return saveLocally(outs, ctx);
      }
      if (s.status === "FAILED" || s.error) throw new Error("Generation failed at the provider");
    }
    throw new Error("Generation timed out");
  },
};

export function getProvider() {
  if (process.env.PROVIDER === "fal" && process.env.FAL_KEY) return fal;
  return mock;
}
