// File storage for uploads and renders. Supabase Storage when SUPABASE_URL is set, otherwise DATA_DIR/files on disk.
// Either way the app refers to files as /files/<name>: Netlify proxies that path to the public bucket, and the
// local server serves it from disk. Browsers upload straight to storage through a short-lived signed URL.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function openFiles({ dataDir, secret }) {
  const base = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  return base ? supabaseFiles(base) : diskFiles(path.join(dataDir, "files"), secret);
}

function supabaseFiles(base) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  const bucket = process.env.SUPABASE_BUCKET || "ristretto";
  const auth = { Authorization: `Bearer ${key}`, apikey: key };
  return {
    kind: "supabase",
    publicDir: `${base}/storage/v1/object/public/${bucket}`,
    // Absolute URL a provider (fal) can fetch.
    publicUrl: (name) => `${base}/storage/v1/object/public/${bucket}/${encodeURIComponent(name)}`,
    async put(name, body, contentType) {
      const r = await fetch(`${base}/storage/v1/object/${bucket}/${encodeURIComponent(name)}`, {
        method: "POST", headers: { ...auth, "Content-Type": contentType, "x-upsert": "true", "cache-control": "max-age=604800" }, body,
      });
      if (!r.ok) throw new Error(`Storage upload failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
    },
    async signedUpload(name, contentType) {
      const r = await fetch(`${base}/storage/v1/object/upload/sign/${bucket}/${encodeURIComponent(name)}`, { method: "POST", headers: auth });
      if (!r.ok) throw new Error(`Could not prepare the upload (${r.status})`);
      const { url } = await r.json(); // "/object/upload/sign/<bucket>/<name>?token=..."
      return { url: `${base}/storage/v1${url}`, method: "PUT", headers: { "Content-Type": contentType, "x-upsert": "false" } };
    },
  };
}

function diskFiles(dir, secret) {
  fs.mkdirSync(dir, { recursive: true });
  const sign = (name, exp) => crypto.createHmac("sha256", secret).update(`upload:${name}:${exp}`).digest("hex");
  return {
    kind: "disk",
    dir,
    // fal can't reach a local disk, so local files are inlined as data URIs.
    publicUrl(name) {
      const file = path.join(dir, path.basename(name));
      const ext = path.extname(file).slice(1).toLowerCase();
      const mime = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" }[ext] || "application/octet-stream";
      return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
    },
    async put(name, body) {
      fs.writeFileSync(path.join(dir, path.basename(name)), Buffer.from(body));
    },
    async signedUpload(name, contentType) {
      const exp = Date.now() + 10 * 60 * 1000;
      return { url: `/api/uploads/local/${encodeURIComponent(name)}?exp=${exp}&sig=${sign(name, exp)}`, method: "PUT", headers: { "Content-Type": contentType } };
    },
    verifyLocalUpload: (name, exp, sig) => Number(exp) > Date.now() && typeof sig === "string" && sig.length === 64 &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(name, Number(exp)))),
  };
}
