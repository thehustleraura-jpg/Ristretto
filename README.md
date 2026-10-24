# Ristretto

Personal all-in-one AI studio for image and video: model hub, characters, studios, tools, reference-video swap, history. Single owner login; no pricing, credits or billing.

React + Vite frontend. The API is an Express app that runs as a Netlify Function in production (or as a plain Node server locally). Data in Postgres (Supabase), files in Supabase Storage.

## Deploy: Netlify + Supabase

1. **Supabase**: create a project. In the SQL editor run `supabase/schema.sql` (tables, row-level security, and the public `ristretto` storage bucket).
2. **Netlify**: point the project at this repo (the `netlify.toml` here sets the build). Add these environment variables with the **Builds** and **Functions** scopes, marking the keys as secret:

| Variable | Where to find it |
| --- | --- |
| `DATABASE_URL` | Supabase > Connect > **Transaction pooler** connection string (port 6543), with your database password filled in |
| `SUPABASE_URL` | Supabase > Project settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project settings > API keys > `service_role` (secret) |
| `APP_SECRET` | Any long random string (signs login tokens; changing it signs you out) |
| `PROVIDER`, `FAL_KEY` | Optional: `fal` and your fal key for real renders. Without them it runs in mock mode. |

3. Deploy. Open the site, go to Sign in and create the owner account.

How it fits together: `/api/*` is rewritten to the `api` function, and `/files/*` is proxied to the public bucket, so file links stay same-origin. Browsers upload straight to Storage with a signed URL (functions only accept ~4.5 MB bodies; uploads are limited to 50 MB). A render is submitted to fal and checked each time the page polls or History loads; when it finishes, the outputs are copied into Storage. Nothing depends on a long-running process.

## Run locally

```bash
npm install
export DATABASE_URL=postgres://...   # your Supabase database, or any local Postgres
npm run db:setup                     # applies supabase/schema.sql (safe to re-run)
npm run dev                          # client :5173, server :8787
```

Without `SUPABASE_URL`, files are kept in `DATA_DIR/files` on disk (default `./data`) and served by the local server. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to use Storage locally too. `npm run build && npm start` serves the built client from the same server.

## First run

Open the app and go to Sign in. With no accounts yet it shows "Set up your studio": create the owner account there. Setup closes once it exists, and there is no public signup. To reset, empty the `users` table (or all tables) in Supabase.

## Real renders

Mock mode is the default and returns placeholder art. Set `PROVIDER=fal` and `FAL_KEY` for real models.

Endpoint ids live in `server/catalog.mjs` (`fal` field per model and tool). They are best-effort; check each against fal's model list and input schema, and adjust `buildInput` in `server/providers.mjs` where a model expects different field names.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (required) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | File storage in Supabase. Without them (local only) files go to `DATA_DIR/files`. |
| `SUPABASE_BUCKET` | Storage bucket (default `ristretto`) |
| `APP_SECRET` | Token signing secret. Required on Netlify; locally generated into `DATA_DIR/.secret` if unset. |
| `PROVIDER` / `FAL_KEY` | Enable the fal.ai provider |
| `FAL_VIDEOZYPHER_ENDPOINT` | Video-to-video endpoint for Reference Swap |
| `PORT`, `DATA_DIR` | Local server only |

## Community

Press **Share** on any finished render in History to add it to Community. Shared pieces are public: `GET /api/community` needs no sign-in, and the landing page shows the latest 8 (sample art until something is shared). It exposes only the output, prompt, model and ratio. Unshare from History or Community; deleting a job also removes its shares.

## Not built yet

- **Reference Swap library clips** are placeholders. Real renders need an uploaded clip, or real video URLs added to `REFERENCES`.
- **Team seats** and character LoRA training are not implemented. Characters are sent as reference images.

## Monetizing later

Users, jobs and a per-model `cost` field in `server/catalog.mjs` are still in place, so plans, credits and a payment processor can be added without a rewrite.

## Layout

```
server/   app.mjs (API, owner auth, jobs) · index.mjs (local server) · db.mjs (Postgres) · files.mjs (Storage / disk) · providers.mjs (mock + fal) · catalog.mjs
netlify/  functions/api.mjs (runs app.mjs on Netlify)
supabase/ schema.sql
src/      pages/ (marketing) · app/ (studio) · lib/api.tsx (client, auth, job polling)
```
