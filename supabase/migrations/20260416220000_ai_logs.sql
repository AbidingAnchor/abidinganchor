-- AI Companion usage metrics (one row per successful assistant reply, logged from the client).
create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_logs_created_at_idx on public.ai_logs (created_at desc);
create index if not exists ai_logs_user_id_idx on public.ai_logs (user_id);

alter table public.ai_logs enable row level security;

drop policy if exists "ai_logs_select_authenticated" on public.ai_logs;
create policy "ai_logs_select_authenticated"
  on public.ai_logs for select
  to authenticated
  using (true);

drop policy if exists "ai_logs_insert_own" on public.ai_logs;
create policy "ai_logs_insert_own"
  on public.ai_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.ai_logs to authenticated;
