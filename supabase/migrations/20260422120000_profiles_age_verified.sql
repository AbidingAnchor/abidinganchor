-- COPPA-style age gate: UI collects DOB only to verify 13+; we persist a boolean, not the birth date.
alter table public.profiles
  add column if not exists age_verified boolean not null default false;
