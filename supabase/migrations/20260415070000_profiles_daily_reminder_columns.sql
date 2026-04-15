-- Daily reminder settings for cross-platform notification persistence.

alter table public.profiles
  add column if not exists daily_reminder_enabled boolean not null default true,
  add column if not exists daily_reminder_time text not null default '08:00';
