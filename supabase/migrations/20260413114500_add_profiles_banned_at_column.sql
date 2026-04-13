alter table public.profiles
add column if not exists banned_at timestamptz null;
