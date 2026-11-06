-- Run once in the SQL Editor of YOUR Supabase project.
-- No public policies: ToxicBook accesses this via service_role on the server ONLY.
create table if not exists public.toxicbook_state (
    id text primary key,
    payload jsonb not null,
    updated_at timestamptz not null default now()
);
alter table public.toxicbook_state enable row level security;
-- Existing tables can retain their own policies. Do not add public read/write policies.
