create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  description text,
  features text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

alter table public.app_updates enable row level security;

drop policy if exists "app_updates_select_public" on public.app_updates;
create policy "app_updates_select_public"
  on public.app_updates for select
  to public
  using (true);

drop policy if exists "app_updates_insert_admin_only" on public.app_updates;
create policy "app_updates_insert_admin_only"
  on public.app_updates for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role::text, '')) in ('founder', 'admin')
    )
  );

insert into public.app_updates (version, title, description, features)
values (
  '1.2.0',
  'Major Update',
  'Major feature release across Bible study, profiles, and supporter tools.',
  array[
    'Verse Highlighting',
    'Verse Notes',
    'Cross References',
    'Ministry Supporter Badge',
    'Public Profiles',
    'Faith Badges'
  ]::text[]
)
on conflict do nothing;
