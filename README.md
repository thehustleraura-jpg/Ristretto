# Ristretto

Personal all-in-one AI studio for image and video: model hub, characters, studios, tools, reference-video swap, history. Single owner login; no pricing, credits or billing.

React + Vite frontend, Express backend, SQLite store (better-sqlite3).

## Run

```bash
npm install
npm run dev        # client :5173, server :8787
```

Production: `npm run build && npm start` (server serves `dist/` on :8787).

## First run

Open the app and go to Sign in. With no accounts yet it shows "Set up your studio": create the owner account there. Setup closes once it exists, and there is no public signup. To reset, stop the server and delete `DATA_DIR/ristretto.db` (plus its `-wal` and `-shm` files).

## Real renders

Mock mode is the default and returns placeholder art. For real models:

```bash
PROVIDER=fal FAL_KEY=your_key npm start
```

Endpoint ids live in `server/catalog.mjs` (`fal` field per model and tool). They are best-effort; check each against fal's model list and input schema, and adjust `buildInput` in `server/providers.mjs` where a model expects different field names.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default 8787) |
| `DATA_DIR` | Where `ristretto.db`, uploads and renders are stored (default `./data`). Needs a persistent disk in production. |
| `APP_SECRET` | Token signing secret. Generated into `DATA_DIR/.secret` if unset. |
| `PROVIDER` / `FAL_KEY` | Enable the fal.ai provider |
| `FAL_VIDEOZYPHER_ENDPOINT` | Video-to-video endpoint for Reference Swap |

## Database

Data lives in `DATA_DIR/ristretto.db` (SQLite, WAL mode): users, characters, jobs and shares. On the first start after upgrading, an existing `DATA_DIR/db.json` is imported automatically and renamed to `db.json.imported`, so nothing is lost. To back up, copy the `.db` file while the server is stopped (or use `sqlite3 ristretto.db ".backup backup.db"` while it runs).

`better-sqlite3` ships prebuilt binaries for common platforms; on others `npm install` compiles it and needs Python and a C++ toolchain.

Jobs run inside the server process, so a job still running when the server restarts is marked failed ("Interrupted by a server restart").

## Community

Press **Share** on any finished render in History to add it to Community. Shared pieces are public: `GET /api/community` needs no sign-in, and the landing page shows the latest 8 (sample art until something is shared). It exposes only the output, prompt, model and ratio. Unshare from History or Community; deleting a job also removes its shares.

## Not built yet

- **Reference Swap library clips** are placeholders. Real renders need an uploaded clip, or real video URLs added to `REFERENCES`.
- **Team seats** and character LoRA training are not implemented. Characters are sent as reference images.
- **Multiple servers**: SQLite lives on one disk, so run a single instance. Move to Postgres before running more than one server.

## Monetizing later

Users, jobs and a per-model `cost` field in `server/catalog.mjs` are still in place, so plans, credits and a payment processor can be added without a rewrite.

## Layout

```
server/   index.mjs (API, owner auth, jobs) · store.mjs (SQLite) · providers.mjs (mock + fal) · catalog.mjs (models, tools, studios, references)
src/      pages/ (marketing) · app/ (studio) · lib/api.tsx (client, auth, job polling)
```
