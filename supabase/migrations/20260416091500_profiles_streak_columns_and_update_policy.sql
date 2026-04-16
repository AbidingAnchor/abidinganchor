-- Ensure streak updates on profiles cannot fail due to missing columns/RLS drift.
-- Idempotent migration: safe to re-run.

alter table public.profiles
  add column if not exists reading_streak integer not null default 0,
  add column if not exists last_active_date date,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists streak_start_date date,
  add column if not exists weekly_active_days text[] default '{}'::text[];

alter table public.profiles enable row level security;

grant select, update on table public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
