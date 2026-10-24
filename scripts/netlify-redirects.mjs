// Netlify build step: route /api to the api function and /files to the public Supabase Storage bucket, then fall back to the SPA.
// Netlify can't read env vars inside redirect rules, so the rules are written into dist/_redirects here.
import fs from "node:fs";

const supabase = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const bucket = process.env.SUPABASE_BUCKET || "ristretto";
if (!/^https:\/\/[^/\s]+$/.test(supabase)) {
  console.error("Set SUPABASE_URL (e.g. https://abcd1234.supabase.co) in the Netlify project's environment variables, with the Builds scope.");
  process.exit(1);
}
fs.writeFileSync("dist/_redirects", [
  `/api/*    /.netlify/functions/api/:splat    200`,
  `/files/*  ${supabase}/storage/v1/object/public/${bucket}/:splat  200`,
  `/*        /index.html  200`,
  "",
].join("\n"));
console.log(`dist/_redirects: /api -> function, /files -> ${supabase} (${bucket})`);
