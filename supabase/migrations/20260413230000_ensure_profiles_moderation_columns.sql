-- Prayer Wall + Auth: ban/mute metadata on profiles.
-- Idempotent (IF NOT EXISTS). Safe if earlier migrations already added these.

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

alter table public.profiles
  add column if not exists muted_until timestamptz null;

alter table public.profiles
  add column if not exists banned_at timestamptz null;
