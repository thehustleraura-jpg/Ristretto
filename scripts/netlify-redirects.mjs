// Netlify build step: proxy /api and /files to the Express backend, then fall back to the SPA.
// Netlify can't read env vars inside redirect rules, so the rules are written into dist/_redirects here.
import fs from "node:fs";

const api = (process.env.RISTRETTO_API_URL || "").trim().replace(/\/+$/, "");
if (!/^https:\/\/[^/\s]+$/.test(api)) {
  console.error("Set RISTRETTO_API_URL to the backend's https origin (e.g. https://ristretto-api.onrender.com) in the Netlify site's environment variables.");
  process.exit(1);
}
fs.writeFileSync("dist/_redirects", [
  `/api/*    ${api}/api/:splat    200`,
  `/files/*  ${api}/files/:splat  200`,
  `/*        /index.html         200`,
  "",
].join("\n"));
console.log(`dist/_redirects: /api and /files -> ${api}`);
