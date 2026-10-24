// SQLite store (better-sqlite3). Rows are mapped back to the same plain objects the API used with the JSON file.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const SCHEMA = `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  salt TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL,           -- JSON array of /files urls
  locked INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX characters_user ON characters(user_id, created_at);
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  spec TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER,
  input TEXT NOT NULL,            -- JSON
  outputs TEXT NOT NULL DEFAULT '[]', -- JSON
  error TEXT
);
CREATE INDEX jobs_user ON jobs(user_id, created_at);
CREATE TABLE shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  shared_at INTEGER NOT NULL,
  UNIQUE (job_id, idx)
);
CREATE INDEX shares_time ON shares(shared_at);
`;

const userRow = (r) => r && { id: r.id, email: r.email, name: r.name, salt: r.salt, hash: r.hash, createdAt: r.created_at };
const charRow = (r) => r && { id: r.id, userId: r.user_id, number: r.number, name: r.name, description: r.description, images: JSON.parse(r.images), locked: !!r.locked, createdAt: r.created_at };
const jobRow = (r) => r && { id: r.id, userId: r.user_id, kind: r.kind, spec: r.spec, status: r.status, createdAt: r.created_at, finishedAt: r.finished_at ?? undefined, input: JSON.parse(r.input), outputs: JSON.parse(r.outputs), error: r.error };
const shareRow = (r) => r && { id: r.id, userId: r.user_id, jobId: r.job_id, index: r.idx, sharedAt: r.shared_at };

export function openStore(DATA_DIR) {
  const sql = new Database(path.join(DATA_DIR, "ristretto.db"));
  sql.pragma("journal_mode = WAL");
  sql.pragma("foreign_keys = ON");
  if (sql.pragma("user_version", { simple: true }) === 0) {
    sql.transaction(() => { sql.exec(SCHEMA); sql.pragma("user_version = 1"); })();
  }

  const q = {
    userCount: sql.prepare("SELECT COUNT(*) n FROM users"),
    userById: sql.prepare("SELECT * FROM users WHERE id = ?"),
    userByEmail: sql.prepare("SELECT * FROM users WHERE email = ?"),
    userInsert: sql.prepare("INSERT INTO users (id, email, name, salt, hash, created_at) VALUES (@id, @email, @name, @salt, @hash, @createdAt)"),
    charList: sql.prepare("SELECT * FROM characters WHERE user_id = ? ORDER BY created_at"),
    charCount: sql.prepare("SELECT COUNT(*) n FROM characters WHERE user_id = ?"),
    charGet: sql.prepare("SELECT * FROM characters WHERE id = ? AND user_id = ?"),
    charInsert: sql.prepare("INSERT INTO characters (id, user_id, number, name, description, images, locked, created_at) VALUES (@id, @userId, @number, @name, @description, @images, @locked, @createdAt)"),
    charDelete: sql.prepare("DELETE FROM characters WHERE id = ? AND user_id = ?"),
    jobInsert: sql.prepare("INSERT INTO jobs (id, user_id, kind, spec, status, created_at, finished_at, input, outputs, error) VALUES (@id, @userId, @kind, @spec, @status, @createdAt, @finishedAt, @input, @outputs, @error)"),
    jobUpdate: sql.prepare("UPDATE jobs SET status = @status, finished_at = @finishedAt, outputs = @outputs, error = @error WHERE id = @id"),
    jobGet: sql.prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?"),
    jobHistory: sql.prepare("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"),
    jobDelete: sql.prepare("DELETE FROM jobs WHERE id = ? AND user_id = ?"),
    jobsStuck: sql.prepare("UPDATE jobs SET status = 'failed', error = 'Interrupted by a server restart', finished_at = ? WHERE status IN ('queued', 'running')"),
    shareForJob: sql.prepare("SELECT * FROM shares WHERE job_id = ?"),
    shareFind: sql.prepare("SELECT * FROM shares WHERE job_id = ? AND idx = ?"),
    shareInsert: sql.prepare("INSERT INTO shares (id, user_id, job_id, idx, shared_at) VALUES (@id, @userId, @jobId, @index, @sharedAt)"),
    shareDelete: sql.prepare("DELETE FROM shares WHERE id = ? AND user_id = ?"),
    feed: sql.prepare("SELECT s.id, s.idx, s.shared_at, j.kind, j.spec, j.input, j.outputs FROM shares s JOIN jobs j ON j.id = s.job_id ORDER BY s.shared_at DESC"),
  };
  const jobParams = (j) => ({ id: j.id, userId: j.userId, kind: j.kind, spec: j.spec, status: j.status, createdAt: j.createdAt, finishedAt: j.finishedAt ?? null, input: JSON.stringify(j.input), outputs: JSON.stringify(j.outputs || []), error: j.error ?? null });

  const store = {
    users: {
      count: () => q.userCount.get().n,
      byId: (id) => userRow(q.userById.get(id)),
      byEmail: (email) => userRow(q.userByEmail.get(String(email))),
      insert: (u) => q.userInsert.run(u),
    },
    characters: {
      list: (userId) => q.charList.all(userId).map(charRow),
      count: (userId) => q.charCount.get(userId).n,
      get: (id, userId) => charRow(q.charGet.get(id, userId)),
      insert: (c) => q.charInsert.run({ ...c, images: JSON.stringify(c.images), locked: c.locked ? 1 : 0 }),
      delete: (id, userId) => q.charDelete.run(id, userId),
    },
    jobs: {
      insert: (j) => q.jobInsert.run(jobParams(j)),
      update: (j) => q.jobUpdate.run(jobParams(j)),
      get: (id, userId) => jobRow(q.jobGet.get(id, userId)),
      history: (userId, limit) => q.jobHistory.all(userId, limit).map(jobRow),
      delete: (id, userId) => q.jobDelete.run(id, userId), // shares go with it (ON DELETE CASCADE)
    },
    shares: {
      forJob: (jobId) => q.shareForJob.all(jobId).map(shareRow),
      find: (jobId, index) => shareRow(q.shareFind.get(jobId, index)),
      insert: (s) => q.shareInsert.run(s),
      delete: (id, userId) => q.shareDelete.run(id, userId),
      feed: (limit) => {
        const items = [];
        for (const r of q.feed.iterate()) {
          const out = JSON.parse(r.outputs)[r.idx];
          if (!out) continue;
          items.push({ id: r.id, kind: r.kind, spec: r.spec, prompt: JSON.parse(r.input).prompt, ratio: JSON.parse(r.input).ratio, output: out, sharedAt: r.shared_at });
          if (items.length >= limit) break;
        }
        return items;
      },
    },
  };

  // Jobs run in-process, so any still queued/running when the server starts were cut off by a restart.
  q.jobsStuck.run(Date.now());
  importJsonOnce(sql, store, DATA_DIR);
  return store;
}

// One-time import of the old JSON store. Runs only into an empty database; db.json is then renamed, not deleted.
function importJsonOnce(sql, store, DATA_DIR) {
  const file = path.join(DATA_DIR, "db.json");
  if (!fs.existsSync(file) || store.users.count() > 0) return;
  const old = JSON.parse(fs.readFileSync(file, "utf8"));
  const users = new Set((old.users || []).map((u) => u.id));
  const jobs = new Set();
  sql.transaction(() => {
    for (const u of old.users || []) store.users.insert({ ...u, createdAt: u.createdAt || Date.now() });
    for (const c of old.characters || []) if (users.has(c.userId)) store.characters.insert({ ...c, description: c.description || "", createdAt: c.createdAt || Date.now() });
    for (const j of old.jobs || []) {
      if (!users.has(j.userId)) continue;
      const stuck = j.status === "queued" || j.status === "running";
      store.jobs.insert({ ...j, status: stuck ? "failed" : j.status, error: stuck ? "Interrupted by a server restart" : j.error });
      jobs.add(j.id);
    }
    for (const s of old.shares || []) if (jobs.has(s.jobId) && users.has(s.userId)) store.shares.insert(s);
  })();
  fs.renameSync(file, `${file}.imported`);
  console.log(`Imported ${old.users?.length || 0} users, ${old.characters?.length || 0} characters, ${old.jobs?.length || 0} jobs and ${old.shares?.length || 0} shares from db.json (kept as db.json.imported).`);
}
