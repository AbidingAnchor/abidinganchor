-- Verse highlighting + notes for BibleReader
-- Tables:
-- - verse_highlights (per-verse highlighting)
-- - verse_notes      (per-verse notes)

create table if not exists public.verse_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book text not null,
  chapter integer not null,
  verse integer not null,
  color text not null default 'gold',
  created_at timestamptz not null default now()
);

create unique index if not exists verse_highlights_unique_verse
  on public.verse_highlights (user_id, book, chapter, verse);

create index if not exists verse_highlights_lookup
  on public.verse_highlights (user_id, book, chapter);

alter table public.verse_highlights enable row level security;

drop policy if exists "verse_highlights_select_own" on public.verse_highlights;
create policy "verse_highlights_select_own"
  on public.verse_highlights
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "verse_highlights_insert_own" on public.verse_highlights;
create policy "verse_highlights_insert_own"
  on public.verse_highlights
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "verse_highlights_update_own" on public.verse_highlights;
create policy "verse_highlights_update_own"
  on public.verse_highlights
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "verse_highlights_delete_own" on public.verse_highlights;
create policy "verse_highlights_delete_own"
  on public.verse_highlights
  for delete
  to authenticated
  using (auth.uid() = user_id);


create table if not exists public.verse_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book text not null,
  chapter integer not null,
  verse integer not null,
  note_text text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists verse_notes_unique_verse
  on public.verse_notes (user_id, book, chapter, verse);

create index if not exists verse_notes_lookup
  on public.verse_notes (user_id, book, chapter);

alter table public.verse_notes enable row level security;

drop policy if exists "verse_notes_select_own" on public.verse_notes;
create policy "verse_notes_select_own"
  on public.verse_notes
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "verse_notes_insert_own" on public.verse_notes;
create policy "verse_notes_insert_own"
  on public.verse_notes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "verse_notes_update_own" on public.verse_notes;
create policy "verse_notes_update_own"
  on public.verse_notes
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "verse_notes_delete_own" on public.verse_notes;
create policy "verse_notes_delete_own"
  on public.verse_notes
  for delete
  to authenticated
  using (auth.uid() = user_id);

