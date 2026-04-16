-- Public profile content fields
alter table public.profiles
  add column if not exists bio text,
  add column if not exists favorite_verse text;
