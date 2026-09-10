-- Provisioning SQL for the dedicated Margaryan Distribution Supabase project.
-- Apply through the Supabase SQL tool when the project is created, then store the
-- service-role key only in server-side Vercel environment variables.

create table if not exists public.distribution_runtime_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

alter table public.distribution_runtime_state enable row level security;

revoke all on table public.distribution_runtime_state from anon, authenticated;
grant select, insert, update, delete on table public.distribution_runtime_state to service_role;

comment on table public.distribution_runtime_state is
  'Versioned server-only checkpoint for Margaryan Distribution orchestration state.';
