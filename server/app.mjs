// The API as an Express app with no listener. Used by the Netlify function (netlify/functions/api.mjs)
// and by the local server (server/index.mjs). State lives in Postgres and file storage, never in memory.
import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { BRAND, MODELS, TOOLS, STUDIOS, REFERENCES } from "./catalog.mjs";
import { getProvider, providerFor, saveOutputs } from "./providers.mjs";
import { placeholderSvg } from "./placeholder.mjs";

const uid = (p) => `${p}_${crypto.randomBytes(6).toString("hex")}`;
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next); // async errors -> error handler

const UPLOAD_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4" };
const UPLOAD_MAX = 50 * 1024 * 1024; // Supabase's default per-file limit
const SAVE_STALE = 2 * 60 * 1000;   // a copy-to-storage claim older than this is retaken

export function createApp({ db, files, secret }) {
  const ctx = { MODELS, TOOLS, files, uid };

  /* ---------- auth ---------- */
  const hashPw = (pw, salt = crypto.randomBytes(16).toString("hex")) => ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") });
  function sign(userId) {
    const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
    const body = `${userId}.${exp}`;
    return `${body}.${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
  }
  function verify(token) {
    const [userId, exp, sig] = String(token || "").split(".");
    if (!userId || !exp || !sig) return null;
    const good = crypto.createHmac("sha256", secret).update(`${userId}.${exp}`).digest("hex");
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    if (Number(exp) < Date.now()) return null;
    return userId;
  }
  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });
  const auth = ah(async (req, res, next) => {
    const h = req.headers.authorization || "";
    const userId = verify(h.startsWith("Bearer ") ? h.slice(7) : "");
    const user = userId && (await db.users.byId(userId));
    if (!user) return res.status(401).json({ error: "Not signed in" });
    req.user = user;
    next();
  });
  // Netlify passes the visitor's address in x-nf-client-connection-ip; locally it's the socket address.
  const clientIp = (req) => String(req.headers["x-nf-client-connection-ip"] || req.ip || "unknown");

  /* ---------- jobs ---------- */
  async function pubJobs(jobs) {
    const shares = await db.shares.forJobs(jobs.map((j) => j.id));
    return jobs.map((j) => ({
      id: j.id, kind: j.kind, spec: j.spec, status: j.status, createdAt: j.createdAt, finishedAt: j.finishedAt,
      input: { prompt: j.input.prompt, ratio: j.input.ratio, seconds: j.input.seconds, studio: j.input.studio, characterName: j.input.characterName },
      outputs: j.outputs, error: j.error,
      shares: Object.fromEntries(shares.filter((s) => s.jobId === j.id).map((s) => [s.index, s.id])),
    }));
  }
  const fail = async (job, error) => {
    Object.assign(job, { status: "failed", error: String(error).slice(0, 300), finishedAt: Date.now(), phase: null });
    await db.jobs.update(job);
    return job;
  };
  // Advance a running job by asking its provider. Called on every poll and when History loads.
  async function refresh(job) {
    if (job.status !== "running" || !job.provider) return job;
    if (job.phase === "saving" && job.phaseAt > Date.now() - SAVE_STALE) return job;
    let r;
    try { r = await providerFor(job.provider.name).check(job, ctx); } catch { return job; } // transient: try again next poll
    if (r.status === "running") return job;
    if (r.status === "failed") return fail(job, r.error);
    if (!(await db.jobs.claimSaving(job.id, Date.now() - SAVE_STALE))) return job; // another request is copying outputs
    Object.assign(job, { outputs: await saveOutputs(r.outputs, ctx), status: "done", finishedAt: Date.now(), phase: null });
    await db.jobs.update(job);
    return job;
  }

  /* ---------- app ---------- */
  const app = express();
  // Inside the Netlify function, requests can arrive as /.netlify/functions/api/...; route them as /api/...
  app.use((req, _res, next) => { req.url = req.url.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, "/api"); next(); });
  app.use("/api", express.json({ limit: "1mb" }));

  app.get("/api/placeholder/:seed.svg", (req, res) => {
    res.type("image/svg+xml").set("Cache-Control", "public, max-age=86400").send(placeholderSvg(req.params.seed, req.query));
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true, brand: BRAND, provider: getProvider().name, storage: files.kind }));
  app.get("/api/catalog", (_req, res) =>
    res.json({ brand: BRAND, provider: getProvider().name, models: MODELS, tools: TOOLS, studios: STUDIOS, references: REFERENCES }),
  );

  // Single-owner app: the first account created through /api/auth/setup is the owner. After that, setup is closed.
  app.get("/api/auth/status", ah(async (_req, res) => res.json({ needsSetup: (await db.users.count()) === 0 })));
  app.post("/api/auth/setup", ah(async (req, res) => {
    if ((await db.users.count()) > 0) return res.status(403).json({ error: "Setup is already complete" });
    const { email, password, name } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
    if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const { salt, hash } = hashPw(password);
    const user = { id: uid("usr"), email, name: name || email.split("@")[0], salt, hash, createdAt: Date.now() };
    await db.users.insert(user);
    res.json({ token: sign(user.id), user: publicUser(user) });
  }));
  app.post("/api/auth/login", ah(async (req, res) => {
    const ip = clientIp(req);
    const rec = await db.attempts.get(ip);
    if (rec.until > Date.now()) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    const { email, password } = req.body || {};
    const user = await db.users.byEmail(String(email || ""));
    let ok = false;
    if (user) {
      const { hash } = hashPw(String(password || ""), user.salt);
      ok = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.hash));
    }
    if (!ok) {
      const n = rec.n + 1;
      await (n >= 8 ? db.attempts.set(ip, 0, Date.now() + 5 * 60 * 1000) : db.attempts.set(ip, n, rec.until));
      return res.status(401).json({ error: "Wrong email or password" });
    }
    await db.attempts.clear(ip);
    res.json({ token: sign(user.id), user: publicUser(user) });
  }));
  app.get("/api/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

  /* ---------- uploads: signed URL, then the browser sends the file straight to storage ---------- */
  app.post("/api/uploads", auth, ah(async (req, res) => {
    const { name, size } = req.body || {};
    const ext = path.extname(String(name || "")).toLowerCase();
    if (!UPLOAD_TYPES[ext]) return res.status(400).json({ error: "Unsupported file type" });
    if (!(Number(size) > 0) || Number(size) > UPLOAD_MAX) return res.status(400).json({ error: "Files must be under 50 MB" });
    const file = `${uid("up")}${ext}`;
    res.json({ url: `/files/${file}`, upload: await files.signedUpload(file, UPLOAD_TYPES[ext]) });
  }));
  if (files.kind === "disk") {
    // Local stand-in for storage's signed upload URL.
    app.put("/api/uploads/local/:name", express.raw({ type: () => true, limit: UPLOAD_MAX }), ah(async (req, res) => {
      const name = path.basename(req.params.name);
      if (!UPLOAD_TYPES[path.extname(name).toLowerCase()] || !files.verifyLocalUpload(name, req.query.exp, req.query.sig)) return res.status(403).json({ error: "Upload link expired" });
      await files.put(name, req.body);
      res.json({ ok: true });
    }));
  }

  /* ---------- characters ---------- */
  app.get("/api/characters", auth, ah(async (req, res) => res.json({ characters: await db.characters.list(req.user.id) })));
  app.post("/api/characters", auth, ah(async (req, res) => {
    const { name, description, images } = req.body || {};
    if (!name || !Array.isArray(images) || images.length < 1) return res.status(400).json({ error: "Name and at least one reference image are required" });
    const n = (await db.characters.count(req.user.id)) + 1;
    const c = { id: uid("chr"), userId: req.user.id, number: String(n).padStart(4, "0"), name: String(name).slice(0, 40), description: String(description || "").slice(0, 400), images: images.slice(0, 6), locked: true, createdAt: Date.now() };
    await db.characters.insert(c);
    res.json({ character: c });
  }));
  app.delete("/api/characters/:id", auth, ah(async (req, res) => {
    await db.characters.delete(req.params.id, req.user.id);
    res.json({ ok: true });
  }));

  /* ---------- generation ---------- */
  app.post("/api/generate", auth, ah(async (req, res) => {
    const b = req.body || {};
    const kind = b.kind;
    if (!["image", "video", "tool", "videozypher"].includes(kind)) return res.status(400).json({ error: "Unknown job kind" });
    const spec = kind === "videozypher" ? "videozypher" : b.model || b.tool;
    if (kind === "image" && !MODELS.find((m) => m.id === spec && m.kind === "image")) return res.status(400).json({ error: "Pick an image model" });
    if (kind === "video" && !MODELS.find((m) => m.id === spec && m.kind === "video")) return res.status(400).json({ error: "Pick a video model" });
    if (kind === "tool" && !TOOLS.find((t) => t.id === spec)) return res.status(400).json({ error: "Unknown tool" });
    if (kind !== "tool" && kind !== "videozypher" && !String(b.prompt || "").trim()) return res.status(400).json({ error: "Write a prompt first" });
    if (kind === "videozypher") {
      if (!b.reference) return res.status(400).json({ error: "Choose a reference video" });
      const cast = Array.isArray(b.cast) ? b.cast : [];
      if (!cast.length) return res.status(400).json({ error: "Add at least one person or object" });
      if (cast.length > 4) return res.status(400).json({ error: "Up to 4 cast members" });
      const photos = cast.reduce((n, c) => n + (c.photos?.length || 0), 0);
      if (photos > 9 || cast.some((c) => !c.photos?.length || c.photos.length > 4)) return res.status(400).json({ error: "1–4 photos each, 9 in total" });
    }

    const count = kind === "image" ? Math.max(1, Math.min(4, Number(b.count || 1))) : 1;
    const seconds = Math.max(2, Math.min(30, Number(b.seconds || 5)));
    const job = {
      id: uid("job"), userId: req.user.id, kind, spec, status: "queued", createdAt: Date.now(),
      input: { prompt: String(b.prompt || "").slice(0, 2000), ratio: b.ratio || "1:1", count, seconds, characterId: b.characterId || null, images: b.images || [], audio: b.audio || null, reference: b.reference || null, cast: b.cast || [], studio: b.studio || null },
      outputs: [], error: null,
    };
    if (job.input.characterId) {
      const c = await db.characters.get(job.input.characterId, req.user.id);
      if (c) { job.input.characterImages = c.images; job.input.characterName = c.name; }
    }
    await db.jobs.insert(job);
    const provider = getProvider();
    try {
      const r = await provider.submit(job, ctx);
      if (r.status === "done") Object.assign(job, { status: "done", outputs: r.outputs, finishedAt: Date.now() });
      else Object.assign(job, { status: "running", provider: { name: provider.name, ...r.provider } });
      await db.jobs.update(job);
    } catch (err) {
      await fail(job, err?.message || err);
    }
    res.json({ job: (await pubJobs([job]))[0] });
  }));

  app.get("/api/jobs/:id", auth, ah(async (req, res) => {
    const job = await db.jobs.get(req.params.id, req.user.id);
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json({ job: (await pubJobs([await refresh(job)]))[0] });
  }));
  app.get("/api/history", auth, ah(async (req, res) => {
    const jobs = await db.jobs.history(req.user.id, 100);
    // Jobs still rendering when the tab was closed only advance when asked; check a few of them now.
    const running = jobs.filter((j) => j.status === "running").slice(0, 5);
    await Promise.all(running.map(refresh));
    res.json({ jobs: await pubJobs(jobs) });
  }));
  app.delete("/api/jobs/:id", auth, ah(async (req, res) => {
    await db.jobs.delete(req.params.id, req.user.id);
    res.json({ ok: true });
  }));

  /* ---------- community: owner shares outputs from History; the feed is public ---------- */
  app.post("/api/shares", auth, ah(async (req, res) => {
    const { jobId } = req.body || {};
    const index = Number(req.body?.index ?? 0);
    const job = await db.jobs.get(String(jobId || ""), req.user.id);
    if (!job || job.status !== "done" || !Number.isInteger(index) || !job.outputs[index]) return res.status(404).json({ error: "Nothing to share" });
    await db.shares.insert({ id: uid("shr"), userId: req.user.id, jobId: job.id, index, sharedAt: Date.now() }); // no-op if already shared
    const share = await db.shares.find(job.id, index);
    res.json({ share: { id: share.id, jobId: share.jobId, index: share.index } });
  }));
  app.delete("/api/shares/:id", auth, ah(async (req, res) => {
    await db.shares.delete(req.params.id, req.user.id);
    res.json({ ok: true });
  }));
  app.get("/api/community", ah(async (req, res) => {
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 60));
    res.json({ items: await db.shares.feed(limit) });
  }));

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  });
  return app;
}
