-- Optional future Supabase/PostgreSQL schema. The runnable local starter currently uses JSON files.
create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  task_type text not null check (task_type in ('video','exam','remote','browse','message')),
  latency_ms double precision not null check (latency_ms >= 0),
  jitter_ms double precision not null check (jitter_ms >= 0),
  download_mbps double precision not null check (download_mbps >= 0),
  upload_mbps double precision not null check (upload_mbps >= 0),
  latitude double precision,
  longitude double precision,
  consent_to_share boolean not null default false,
  data_source text not null default 'LIVE_BROWSER_TEST',
  score integer not null check (score between 0 and 100)
);
create table if not exists community_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  area text not null,
  task_type text not null,
  network_type text not null,
  experience text not null check (experience in ('good','mixed','poor')),
  note text not null default '',
  data_source text not null default 'COMMUNITY_REPORT'
);
