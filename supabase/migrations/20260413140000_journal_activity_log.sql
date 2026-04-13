-- Immutable per-day log: deleting a journal row does not remove the day from streaks.
create table if not exists public.journal_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create index if not exists journal_activity_log_user_date_idx
  on public.journal_activity_log (user_id, activity_date desc);

alter table public.journal_activity_log enable row level security;

drop policy if exists "Users read own journal activity" on public.journal_activity_log;
create policy "Users read own journal activity"
  on public.journal_activity_log for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own journal activity" on public.journal_activity_log;
create policy "Users insert own journal activity"
  on public.journal_activity_log for insert
  with check (auth.uid() = user_id);

-- Backfill from existing entries (UTC date; new writes log the user’s local calendar day from the client)
insert into public.journal_activity_log (user_id, activity_date)
select distinct user_id, (created_at at time zone 'utc')::date
from public.journal_entries
where user_id is not null
on conflict (user_id, activity_date) do nothing;
