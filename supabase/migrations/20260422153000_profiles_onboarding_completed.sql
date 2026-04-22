-- Ensure onboarding completion has a dedicated column with default false.
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Backfill from legacy onboarding_complete if present.
update public.profiles
set onboarding_completed = true
where onboarding_complete = true
  and onboarding_completed = false;
