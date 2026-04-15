-- One free username change tracked by integer counter (default 0).
alter table public.profiles
  add column if not exists username_changes integer not null default 0;
