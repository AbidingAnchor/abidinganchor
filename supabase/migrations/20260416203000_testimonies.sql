-- Testimony Wall: public feed for authenticated users; reactions one per user per testimony.

create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  constraint testimonies_content_len check (
    char_length(trim(content)) > 0
    and char_length(content) <= 300
  )
);

create index if not exists testimonies_created_at_idx on public.testimonies (created_at desc);
create index if not exists testimonies_user_id_idx on public.testimonies (user_id);

create table if not exists public.testimony_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  testimony_id uuid not null references public.testimonies (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint testimony_reactions_emoji_allowed check (emoji in ('amen', 'love', 'fire', 'cross')),
  constraint testimony_reactions_one_per_user unique (user_id, testimony_id)
);

create index if not exists testimony_reactions_testimony_id_idx on public.testimony_reactions (testimony_id);

alter table public.testimonies enable row level security;
alter table public.testimony_reactions enable row level security;

drop policy if exists "testimonies_select_authenticated" on public.testimonies;
create policy "testimonies_select_authenticated"
  on public.testimonies for select
  to authenticated
  using (true);

drop policy if exists "testimonies_insert_own" on public.testimonies;
create policy "testimonies_insert_own"
  on public.testimonies for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "testimonies_update_own" on public.testimonies;
create policy "testimonies_update_own"
  on public.testimonies for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "testimonies_delete_own" on public.testimonies;
create policy "testimonies_delete_own"
  on public.testimonies for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "testimony_reactions_select_authenticated" on public.testimony_reactions;
create policy "testimony_reactions_select_authenticated"
  on public.testimony_reactions for select
  to authenticated
  using (true);

drop policy if exists "testimony_reactions_insert_own" on public.testimony_reactions;
create policy "testimony_reactions_insert_own"
  on public.testimony_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "testimony_reactions_update_own" on public.testimony_reactions;
create policy "testimony_reactions_update_own"
  on public.testimony_reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "testimony_reactions_delete_own" on public.testimony_reactions;
create policy "testimony_reactions_delete_own"
  on public.testimony_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.testimonies to authenticated;
grant select, insert, update, delete on public.testimony_reactions to authenticated;
