-- Streak columns for dailyAppStreak, Home, and presence (profiles.reading_streak, last_active_date, etc.).
-- last_active_date may already exist from 20260412120000_profiles_weekly_active_days.sql.

alter table public.profiles
  add column if not exists reading_streak integer not null default 0,
  add column if not exists last_active_date date,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists streak_start_date date;
