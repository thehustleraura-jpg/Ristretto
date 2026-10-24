// Local / self-hosted server: the same API as the Netlify function, plus /files from disk and the built client.
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.mjs";
import { openDb } from "./db.mjs";
import { openFiles } from "./files.mjs";
import { getProvider } from "./providers.mjs";
import { BRAND } from "./catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.APP_SECRET || (() => {
  const f = path.join(DATA_DIR, ".secret");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  const s = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(f, s);
  return s;
})();

const db = openDb();
const files = openFiles({ dataDir: DATA_DIR, secret: SECRET });
const app = express();
if (files.kind === "disk") app.use("/files", express.static(files.dir, { maxAge: "7d" }));
else app.get("/files/:name", (req, res) => res.redirect(302, files.publicUrl(path.basename(req.params.name))));
app.use(createApp({ db, files, secret: SECRET }));

const DIST = path.join(ROOT, "dist");
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api|files).*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.listen(PORT, () => console.log(`${BRAND} server on :${PORT} (provider: ${getProvider().name}, storage: ${files.kind})`));
