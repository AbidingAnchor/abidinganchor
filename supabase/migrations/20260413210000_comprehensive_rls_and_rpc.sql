-- Comprehensive RLS: users only access their own private rows; shared tables use RPC for cross-user counters.
-- Safe to re-run: policies are dropped before recreate.

-- ---------------------------------------------------------------------------
-- RPC: increment counters without granting blanket UPDATE on shared rows
-- ---------------------------------------------------------------------------
create or replace function public.increment_community_prayer_pray_count(p_prayer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.community_prayers
  set pray_count = coalesce(pray_count, 0) + 1
  where id = p_prayer_id;
$$;

revoke all on function public.increment_community_prayer_pray_count(uuid) from public;
grant execute on function public.increment_community_prayer_pray_count(uuid) to authenticated;

create or replace function public.increment_prayer_wall_praying_count(p_prayer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.prayer_wall
  set praying_count = coalesce(praying_count, 0) + 1
  where id = p_prayer_id;
$$;

revoke all on function public.increment_prayer_wall_praying_count(uuid) from public;
grant execute on function public.increment_prayer_wall_praying_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Helper: moderator role (profiles.role)
-- ---------------------------------------------------------------------------
create or replace function public.is_abidinganchor_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role::text, '')) in ('founder', 'admin', 'mod')
  );
$$;

revoke all on function public.is_abidinganchor_moderator() from public;
grant execute on function public.is_abidinganchor_moderator() to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_update_moderator" on public.profiles;
create policy "profiles_update_moderator"
  on public.profiles for update
  to authenticated
  using (public.is_abidinganchor_moderator())
  with check (true);

-- ---------------------------------------------------------------------------
-- journal_entries
-- ---------------------------------------------------------------------------
alter table public.journal_entries enable row level security;

drop policy if exists "journal_entries_select_own" on public.journal_entries;
create policy "journal_entries_select_own"
  on public.journal_entries for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "journal_entries_insert_own" on public.journal_entries;
create policy "journal_entries_insert_own"
  on public.journal_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "journal_entries_update_own" on public.journal_entries;
create policy "journal_entries_update_own"
  on public.journal_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "journal_entries_delete_own" on public.journal_entries;
create policy "journal_entries_delete_own"
  on public.journal_entries for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- personal_prayers (idempotent if already created in SQL editor)
-- ---------------------------------------------------------------------------
alter table public.personal_prayers enable row level security;

drop policy if exists "personal_prayers_select_own" on public.personal_prayers;
drop policy if exists "personal_prayers_insert_own" on public.personal_prayers;
drop policy if exists "personal_prayers_update_own" on public.personal_prayers;
drop policy if exists "personal_prayers_delete_own" on public.personal_prayers;

drop policy if exists "personal_prayers_select_own" on public.personal_prayers;
create policy "personal_prayers_select_own"
  on public.personal_prayers for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "personal_prayers_insert_own" on public.personal_prayers;
create policy "personal_prayers_insert_own"
  on public.personal_prayers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "personal_prayers_update_own" on public.personal_prayers;
create policy "personal_prayers_update_own"
  on public.personal_prayers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "personal_prayers_delete_own" on public.personal_prayers;
create policy "personal_prayers_delete_own"
  on public.personal_prayers for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- community_prayers (public read; no direct client UPDATE — use RPC)
-- ---------------------------------------------------------------------------
alter table public.community_prayers enable row level security;

drop policy if exists "Anyone can view community prayers" on public.community_prayers;
drop policy if exists "Users insert own community prayers" on public.community_prayers;
drop policy if exists "Users delete own community prayers" on public.community_prayers;
drop policy if exists "Users update own community prayers" on public.community_prayers;
drop policy if exists "Authenticated select community prayers" on public.community_prayers;

drop policy if exists "community_prayers_select_wall" on public.community_prayers;
create policy "community_prayers_select_wall"
  on public.community_prayers for select
  to authenticated
  using (true);

drop policy if exists "community_prayers_insert_own" on public.community_prayers;
create policy "community_prayers_insert_own"
  on public.community_prayers for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_prayers_delete_own" on public.community_prayers;
create policy "community_prayers_delete_own"
  on public.community_prayers for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- prayer_interactions
-- ---------------------------------------------------------------------------
alter table public.prayer_interactions enable row level security;

drop policy if exists "prayer_interactions_select_own" on public.prayer_interactions;
create policy "prayer_interactions_select_own"
  on public.prayer_interactions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "prayer_interactions_insert_own" on public.prayer_interactions;
create policy "prayer_interactions_insert_own"
  on public.prayer_interactions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "prayer_interactions_delete_own_or_prayer_owner" on public.prayer_interactions;
create policy "prayer_interactions_delete_own_or_prayer_owner"
  on public.prayer_interactions for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.community_prayers cp
      where cp.id = prayer_interactions.prayer_id
        and cp.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- prayer_wall
-- ---------------------------------------------------------------------------
alter table public.prayer_wall enable row level security;

drop policy if exists "Anyone can insert prayer" on public.prayer_wall;
drop policy if exists "Anyone can view prayers" on public.prayer_wall;
drop policy if exists "Owner can delete own prayer" on public.prayer_wall;
drop policy if exists "Anyone can update praying_count" on public.prayer_wall;

drop policy if exists "prayer_wall_select_authenticated" on public.prayer_wall;
create policy "prayer_wall_select_authenticated"
  on public.prayer_wall for select
  to authenticated
  using (true);

drop policy if exists "prayer_wall_insert_own" on public.prayer_wall;
create policy "prayer_wall_insert_own"
  on public.prayer_wall for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "prayer_wall_delete_own_or_mod" on public.prayer_wall;
create policy "prayer_wall_delete_own_or_mod"
  on public.prayer_wall for delete
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_abidinganchor_moderator()
  );

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------
alter table public.friendships enable row level security;

drop policy if exists "friendships_select_participants" on public.friendships;
create policy "friendships_select_participants"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_insert_requester" on public.friendships;
create policy "friendships_insert_requester"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists "friendships_update_participants" on public.friendships;
create policy "friendships_update_participants"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendships_delete_participants" on public.friendships;
create policy "friendships_delete_participants"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---------------------------------------------------------------------------
-- profile_reports (optional — table may not exist on all projects)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public'
    and table_name = 'profile_reports'
  ) then
    execute 'alter table public.profile_reports enable row level security';
    execute 'drop policy if exists "profile_reports_insert_own" on public.profile_reports';
    execute 'create policy "profile_reports_insert_own" on public.profile_reports for insert to authenticated with check (auth.uid() = reporter_id)';
    execute 'drop policy if exists "profile_reports_select_own" on public.profile_reports';
    execute 'create policy "profile_reports_select_own" on public.profile_reports for select to authenticated using (auth.uid() = reporter_id)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- reports (Prayer Wall + elsewhere)
-- ---------------------------------------------------------------------------
alter table public.reports enable row level security;

drop policy if exists "Users can insert reports" on public.reports;
drop policy if exists "Admins can view reports" on public.reports;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reported_by);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using (auth.uid() = reported_by);

-- ---------------------------------------------------------------------------
-- Legacy prayers table (if present)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'prayers'
  ) then
    execute 'alter table public.prayers enable row level security';

    execute 'drop policy if exists "prayers_select_own" on public.prayers';
    execute 'create policy "prayers_select_own" on public.prayers for select to authenticated using (auth.uid() = user_id)';

    execute 'drop policy if exists "prayers_insert_own" on public.prayers';
    execute 'create policy "prayers_insert_own" on public.prayers for insert to authenticated with check (auth.uid() = user_id)';

    execute 'drop policy if exists "prayers_update_own" on public.prayers';
    execute 'create policy "prayers_update_own" on public.prayers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)';

    execute 'drop policy if exists "prayers_delete_own" on public.prayers';
    execute 'create policy "prayers_delete_own" on public.prayers for delete to authenticated using (auth.uid() = user_id)';
  end if;
end $$;
