-- Add anonymous posting flag for testimonies (no-op if column already exists from fresh install).
alter table public.testimonies
  add column if not exists is_anonymous boolean not null default false;
