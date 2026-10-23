import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, MODELS, TOOLS, STUDIOS, REFERENCES } from "./catalog.mjs";
import { getProvider } from "./providers.mjs";
import { placeholderSvg } from "./placeholder.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const FILES_DIR = path.join(DATA_DIR, "files");
fs.mkdirSync(FILES_DIR, { recursive: true });

const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.APP_SECRET || (() => {
  const f = path.join(DATA_DIR, ".secret");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  const s = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(f, s);
  return s;
})();

/* ---------- tiny JSON store ---------- */
const DB_FILE = path.join(DATA_DIR, "db.json");
let db = fs.existsSync(DB_FILE)
  ? JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
  : { users: [], characters: [], jobs: [] };
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => fs.writeFileSync(DB_FILE, JSON.stringify(db)), 50);
}
const uid = (p) => `${p}_${crypto.randomBytes(6).toString("hex")}`;

/* ---------- auth ---------- */
function hashPw(pw, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString("hex") };
}
function sign(userId) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  const body = `${userId}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
}
function verify(token) {
  const [userId, exp, sig] = String(token || "").split(".");
  if (!userId || !exp || !sig) return null;
  const good = crypto.createHmac("sha256", SECRET).update(`${userId}.${exp}`).digest("hex");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (Number(exp) < Date.now()) return null;
  return userId;
}
const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name });

function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const userId = verify(h.startsWith("Bearer ") ? h.slice(7) : "");
  const user = db.users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: "Not signed in" });
  req.user = user;
  next();
}

/* ---------- app ---------- */
const app = express();
app.use(express.json({ limit: "30mb" }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });

app.use("/files", express.static(FILES_DIR, { maxAge: "7d" }));

app.get("/api/placeholder/:seed.svg", (req, res) => {
  res.type("image/svg+xml").set("Cache-Control", "public, max-age=86400").send(placeholderSvg(req.params.seed, req.query));
});

app.get("/api/health", (_req, res) => res.json({ ok: true, brand: BRAND, provider: getProvider().name }));

app.get("/api/catalog", (_req, res) =>
  res.json({ brand: BRAND, provider: getProvider().name, models: MODELS, tools: TOOLS, studios: STUDIOS, references: REFERENCES }),
);

// Single-owner app: the first account created through /api/auth/setup is the owner. After that, setup is closed.
app.get("/api/auth/status", (_req, res) => res.json({ needsSetup: db.users.length === 0 }));

app.post("/api/auth/setup", (req, res) => {
  if (db.users.length > 0) return res.status(403).json({ error: "Setup is already complete" });
  const { email, password, name } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const { salt, hash } = hashPw(password);
  const user = { id: uid("usr"), email, name: name || email.split("@")[0], salt, hash, createdAt: Date.now() };
  db.users.push(user);
  save();
  res.json({ token: sign(user.id), user: publicUser(user) });
});

const attempts = new Map();
app.post("/api/auth/login", (req, res) => {
  const ip = req.ip;
  const rec = attempts.get(ip) || { n: 0, until: 0 };
  if (rec.until > Date.now()) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
  let ok = false;
  if (user) {
    const { hash } = hashPw(String(password || ""), user.salt);
    ok = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.hash));
  }
  if (!ok) {
    rec.n += 1;
    if (rec.n >= 8) { rec.until = Date.now() + 5 * 60 * 1000; rec.n = 0; }
    attempts.set(ip, rec);
    return res.status(401).json({ error: "Wrong email or password" });
  }
  attempts.delete(ip);
  res.json({ token: sign(user.id), user: publicUser(user) });
});

app.get("/api/me", auth, (req, res) => res.json({ user: publicUser(req.user) }));

/* ---------- uploads ---------- */
app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  const allowed = [".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov", ".webm", ".mp3", ".wav", ".m4a"];
  if (!allowed.includes(ext)) return res.status(400).json({ error: "Unsupported file type" });
  const name = `${uid("up")}${ext}`;
  fs.writeFileSync(path.join(FILES_DIR, name), req.file.buffer);
  res.json({ url: `/files/${name}`, name: req.file.originalname, size: req.file.size });
});

/* ---------- characters ---------- */
app.get("/api/characters", auth, (req, res) => res.json({ characters: db.characters.filter((c) => c.userId === req.user.id) }));
app.post("/api/characters", auth, (req, res) => {
  const { name, description, images } = req.body || {};
  if (!name || !Array.isArray(images) || images.length < 1) return res.status(400).json({ error: "Name and at least one reference image are required" });
  const n = db.characters.filter((c) => c.userId === req.user.id).length + 1;
  const c = { id: uid("chr"), userId: req.user.id, number: String(n).padStart(4, "0"), name: String(name).slice(0, 40), description: String(description || "").slice(0, 400), images: images.slice(0, 6), locked: true, createdAt: Date.now() };
  db.characters.push(c);
  save();
  res.json({ character: c });
});
app.delete("/api/characters/:id", auth, (req, res) => {
  db.characters = db.characters.filter((c) => !(c.id === req.params.id && c.userId === req.user.id));
  save();
  res.json({ ok: true });
});

/* ---------- generation ---------- */
app.post("/api/generate", auth, (req, res) => {
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
    const c = db.characters.find((x) => x.id === job.input.characterId && x.userId === req.user.id);
    if (c) { job.input.characterImages = c.images; job.input.characterName = c.name; }
  }
  db.jobs.push(job);
  save();
  run(job);
  res.json({ job: pubJob(job) });
});

async function run(job) {
  job.status = "running";
  save();
  try {
    const provider = getProvider();
    job.outputs = await provider.run(job, { MODELS, TOOLS, FILES_DIR, uid });
    job.status = "done";
  } catch (err) {
    job.status = "failed";
    job.error = String(err?.message || err).slice(0, 300);
  }
  job.finishedAt = Date.now();
  save();
}

const pubJob = (j) => ({ id: j.id, kind: j.kind, spec: j.spec, status: j.status, createdAt: j.createdAt, finishedAt: j.finishedAt, input: { prompt: j.input.prompt, ratio: j.input.ratio, seconds: j.input.seconds, studio: j.input.studio, characterName: j.input.characterName }, outputs: j.outputs, error: j.error });

app.get("/api/jobs/:id", auth, (req, res) => {
  const job = db.jobs.find((j) => j.id === req.params.id && j.userId === req.user.id);
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json({ job: pubJob(job) });
});
app.get("/api/history", auth, (req, res) => {
  const jobs = db.jobs.filter((j) => j.userId === req.user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map(pubJob);
  res.json({ jobs });
});
app.delete("/api/jobs/:id", auth, (req, res) => {
  db.jobs = db.jobs.filter((j) => !(j.id === req.params.id && j.userId === req.user.id));
  save();
  res.json({ ok: true });
});

/* ---------- static client in production ---------- */
const DIST = path.join(ROOT, "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api|files).*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => console.log(`${BRAND} server on :${PORT} (provider: ${getProvider().name})`));
