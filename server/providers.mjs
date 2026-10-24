import path from "node:path";
import { placeholderSvg } from "./placeholder.mjs";

// Providers are stateless so they can run inside short-lived functions:
//   submit(job, ctx) -> { status: "done", outputs } | { status: "running", provider }   (provider = queue handle, stored on the job)
//   check(job, ctx)  -> { status: "running" } | { status: "completed", outputs } | { status: "failed", error }
// ctx = { MODELS, TOOLS, files, uid }. Finished remote outputs are copied into storage with saveOutputs().

/* ---------------- mock: no keys needed, produces placeholder art ---------------- */
const mock = {
  name: "mock",
  async submit(job, { files, uid }) {
    const outputs = [];
    const isVideo = job.kind === "video" || job.kind === "videozypher" || (job.kind === "tool" && job.spec === "lipsync");
    const n = job.kind === "image" ? job.input.count : 1;
    for (let i = 0; i < n; i++) {
      const name = `${uid("out")}.svg`;
      const label = `${job.kind}:${job.spec} · mock`;
      await files.put(name, Buffer.from(placeholderSvg(`${job.id}-${i}`, { ratio: job.input.ratio, label, video: isVideo ? "1" : "0" })), "image/svg+xml");
      outputs.push({ type: isVideo ? "video" : "image", url: `/files/${name}`, mock: true });
    }
    return { status: "done", outputs };
  },
  async check() {
    return { status: "failed", error: "Mock jobs finish on submit" };
  },
};

/* ---------------- fal.ai: set FAL_KEY and PROVIDER=fal ---------------- */
const FAL_BASE = process.env.FAL_QUEUE_URL || "https://queue.fal.run"; // override only for testing

// Our files become URLs the provider can fetch (public storage URL, or a data URI for local disk); remote URLs pass through.
const toRemote = (url, files) => (url && url.startsWith("/files/") ? files.publicUrl(path.basename(url)) : url);

function buildInput(job, ctx) {
  const i = job.input;
  const ref = (u) => toRemote(u, ctx.files);
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

// Copies provider outputs into our storage so they are served same-origin under /files (download + range seeking)
// and outlive the provider's CDN. If a copy fails, the remote URL is kept.
export async function saveOutputs(outs, { files, uid }) {
  return Promise.all(outs.map(async (o) => {
    if (!/^https?:\/\//.test(o.url)) return o;
    try {
      const r = await fetch(o.url);
      if (!r.ok) throw new Error(String(r.status));
      const mime = (r.headers.get("content-type") || "").split(";")[0].trim();
      const urlExt = path.extname(new URL(o.url).pathname).slice(1).toLowerCase();
      const ext = EXT_BY_MIME[mime] || (/^[a-z0-9]{2,4}$/.test(urlExt) ? urlExt : o.type === "video" ? "mp4" : "png");
      const name = `${uid("out")}.${ext}`;
      await files.put(name, Buffer.from(await r.arrayBuffer()), mime || (o.type === "video" ? "video/mp4" : "image/png"));
      return { ...o, url: `/files/${name}` };
    } catch {
      return o;
    }
  }));
}

const falHeaders = () => ({ Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" });
const JOB_TIMEOUT = 1000 * 60 * 15;

const fal = {
  name: "fal",
  async submit(job, ctx) {
    const endpoint = endpointFor(job, ctx);
    if (!endpoint) throw new Error("No endpoint configured for this model");
    const r = await fetch(`${FAL_BASE}/${endpoint}`, { method: "POST", headers: falHeaders(), body: JSON.stringify(buildInput(job, ctx)) });
    if (!r.ok) throw new Error(`Provider rejected the request (${r.status})`);
    const { request_id, status_url, response_url } = await r.json();
    return { status: "running", provider: { request_id, status_url, response_url } };
  },
  async check(job) {
    const p = job.provider;
    if (!p?.status_url) return { status: "failed", error: "Lost track of this job at the provider" };
    const s = await (await fetch(p.status_url, { headers: falHeaders() })).json();
    if (s.status === "COMPLETED") {
      const r = await fetch(p.response_url, { headers: falHeaders() });
      if (!r.ok) return { status: "failed", error: `Provider error (${r.status})` };
      const outputs = extract(await r.json());
      return outputs.length ? { status: "completed", outputs } : { status: "failed", error: "Provider returned no output" };
    }
    if (s.status === "FAILED" || s.error) return { status: "failed", error: "Generation failed at the provider" };
    if (Date.now() - job.createdAt > JOB_TIMEOUT) return { status: "failed", error: "Generation timed out" };
    return { status: "running" };
  },
};

export function getProvider() {
  if (process.env.PROVIDER === "fal" && process.env.FAL_KEY) return fal;
  return mock;
}

// The provider a job was submitted to, even if PROVIDER has changed since.
export const providerFor = (name) => ({ fal, mock })[name] || getProvider();
