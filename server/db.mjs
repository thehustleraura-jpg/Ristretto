// Postgres store (Supabase in production, any Postgres locally). Schema: supabase/schema.sql.
// Rows are mapped to the same plain objects the routes have always used.
import postgres from "postgres";

const userRow = (r) => r && { id: r.id, email: r.email, name: r.name, salt: r.salt, hash: r.hash, createdAt: r.created_at };
const charRow = (r) => r && { id: r.id, userId: r.user_id, number: r.number, name: r.name, description: r.description, images: r.images, locked: r.locked, createdAt: r.created_at };
const jobRow = (r) => r && { id: r.id, userId: r.user_id, kind: r.kind, spec: r.spec, status: r.status, createdAt: r.created_at, finishedAt: r.finished_at ?? undefined, input: r.input, outputs: r.outputs, provider: r.provider, phase: r.phase, phaseAt: r.phase_at, error: r.error };
const shareRow = (r) => r && { id: r.id, userId: r.user_id, jobId: r.job_id, index: r.idx, sharedAt: r.shared_at };

export function openDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set. Point it at your Supabase database (Project settings > Database > Connection string).");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const sql = postgres(url, {
    ssl: local ? false : "require",
    prepare: false, // required by Supabase's transaction pooler (port 6543)
    max: Number(process.env.DB_POOL_MAX || 3),
    idle_timeout: 20,
    onnotice: () => {},
    types: { bigint: { to: 20, from: [20], serialize: (x) => String(x), parse: (x) => Number(x) } }, // timestamps are ms numbers
  });
  const one = async (q) => (await q)[0];

  return {
    sql,
    users: {
      count: async () => (await one(sql`select count(*)::int n from users`)).n,
      byId: async (id) => userRow(await one(sql`select * from users where id = ${id}`)),
      byEmail: async (email) => userRow(await one(sql`select * from users where lower(email) = lower(${String(email)})`)),
      insert: (u) => sql`insert into users (id, email, name, salt, hash, created_at) values (${u.id}, ${u.email}, ${u.name}, ${u.salt}, ${u.hash}, ${u.createdAt})`,
    },
    characters: {
      list: async (userId) => (await sql`select * from characters where user_id = ${userId} order by created_at`).map(charRow),
      count: async (userId) => (await one(sql`select count(*)::int n from characters where user_id = ${userId}`)).n,
      get: async (id, userId) => charRow(await one(sql`select * from characters where id = ${id} and user_id = ${userId}`)),
      insert: (c) => sql`insert into characters (id, user_id, number, name, description, images, locked, created_at)
        values (${c.id}, ${c.userId}, ${c.number}, ${c.name}, ${c.description}, ${sql.json(c.images)}, ${c.locked}, ${c.createdAt})`,
      delete: (id, userId) => sql`delete from characters where id = ${id} and user_id = ${userId}`,
    },
    jobs: {
      insert: (j) => sql`insert into jobs (id, user_id, kind, spec, status, created_at, input, outputs, error)
        values (${j.id}, ${j.userId}, ${j.kind}, ${j.spec}, ${j.status}, ${j.createdAt}, ${sql.json(j.input)}, ${sql.json(j.outputs || [])}, ${j.error ?? null})`,
      update: (j) => sql`update jobs set status = ${j.status}, finished_at = ${j.finishedAt ?? null}, outputs = ${sql.json(j.outputs || [])},
        provider = ${j.provider ? sql.json(j.provider) : null}, phase = ${j.phase ?? null}, phase_at = ${j.phaseAt ?? null}, error = ${j.error ?? null}
        where id = ${j.id}`,
      get: async (id, userId) => jobRow(await one(sql`select * from jobs where id = ${id} and user_id = ${userId}`)),
      history: async (userId, limit) => (await sql`select * from jobs where user_id = ${userId} order by created_at desc limit ${limit}`).map(jobRow),
      delete: (id, userId) => sql`delete from jobs where id = ${id} and user_id = ${userId}`, // shares cascade
      // Only one request copies a finished job's outputs into storage; a stale claim (crashed copy) can be retaken.
      claimSaving: async (id, staleBefore) =>
        (await sql`update jobs set phase = 'saving', phase_at = ${Date.now()}
          where id = ${id} and status = 'running' and (phase is null or (phase = 'saving' and phase_at < ${staleBefore})) returning id`).length === 1,
    },
    shares: {
      forJobs: async (jobIds) => (jobIds.length ? (await sql`select * from shares where job_id in ${sql(jobIds)}`).map(shareRow) : []),
      find: async (jobId, index) => shareRow(await one(sql`select * from shares where job_id = ${jobId} and idx = ${index}`)),
      insert: (s) => sql`insert into shares (id, user_id, job_id, idx, shared_at) values (${s.id}, ${s.userId}, ${s.jobId}, ${s.index}, ${s.sharedAt})
        on conflict (job_id, idx) do nothing`,
      delete: (id, userId) => sql`delete from shares where id = ${id} and user_id = ${userId}`,
      // Public feed: only output, prompt, model and ratio. No user, character or input-image details.
      feed: async (limit) => (await sql`select s.id, s.shared_at, j.kind, j.spec, j.input->>'prompt' as prompt, j.input->>'ratio' as ratio, j.outputs->s.idx as output
        from shares s join jobs j on j.id = s.job_id where j.outputs->s.idx is not null order by s.shared_at desc limit ${limit}`)
        .map((r) => ({ id: r.id, kind: r.kind, spec: r.spec, prompt: r.prompt || "", ratio: r.ratio || "1:1", output: r.output, sharedAt: r.shared_at })),
    },
    attempts: {
      get: async (ip) => (await one(sql`select n, until from login_attempts where ip = ${ip}`)) || { n: 0, until: 0 },
      set: (ip, n, until) => sql`insert into login_attempts (ip, n, until) values (${ip}, ${n}, ${until})
        on conflict (ip) do update set n = excluded.n, until = excluded.until`,
      clear: (ip) => sql`delete from login_attempts where ip = ${ip}`,
    },
  };
}
