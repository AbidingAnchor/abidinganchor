-- Add supporter tier fields to profiles.
-- Admin/staff can mark users in Supabase dashboard by updating these columns directly.

alter table public.profiles
  add column if not exists is_supporter boolean not null default false,
  add column if not exists supporter_since timestamptz;

