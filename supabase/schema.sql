-- Ristretto schema. Run once in the Supabase SQL editor (or `npm run db:setup` with DATABASE_URL set).
-- Safe to re-run. The server connects with the database password / service role, so RLS is enabled
-- with no policies: the public anon key can read nothing.

create table if not exists users (
  id text primary key,
  email text not null,
  name text not null,
  salt text not null,
  hash text not null,
  created_at bigint not null
);
create unique index if not exists users_email on users (lower(email));

create table if not exists characters (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  number text not null,
  name text not null,
  description text not null default '',
  images jsonb not null,
  locked boolean not null default true,
  created_at bigint not null
);
create index if not exists characters_user on characters (user_id, created_at);

create table if not exists jobs (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null,
  spec text not null,
  status text not null,              -- queued | running | done | failed
  created_at bigint not null,
  finished_at bigint,
  input jsonb not null,
  outputs jsonb not null default '[]',
  provider jsonb,                    -- provider queue handle (fal status/response urls)
  phase text,                        -- 'saving' while outputs are copied into storage
  phase_at bigint,
  error text
);
create index if not exists jobs_user on jobs (user_id, created_at desc);

create table if not exists shares (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  job_id text not null references jobs(id) on delete cascade,
  idx integer not null,
  shared_at bigint not null,
  unique (job_id, idx)
);
create index if not exists shares_time on shares (shared_at desc);

create table if not exists login_attempts (
  ip text primary key,
  n integer not null default 0,
  until bigint not null default 0
);

alter table users enable row level security;
alter table characters enable row level security;
alter table jobs enable row level security;
alter table shares enable row level security;
alter table login_attempts enable row level security;

-- Supabase Storage bucket for uploads and renders (public read by unguessable name, 50 MB per file).
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('ristretto', 'ristretto', true, 52428800)
    on conflict (id) do nothing;
  end if;
end $$;
