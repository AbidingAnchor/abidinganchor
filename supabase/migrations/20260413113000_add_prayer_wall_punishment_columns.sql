alter table public.profiles
add column if not exists is_banned boolean not null default false;

alter table public.profiles
add column if not exists muted_until timestamptz null;
