-- Public-facing label for Wall of Honor and similar; UI falls back to full_name when null.
alter table public.profiles
  add column if not exists display_name text;
