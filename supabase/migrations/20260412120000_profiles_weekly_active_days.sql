-- Weekly day-name tracker (Mon–Sun short names). last_active_date may already exist for daily streak.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_date date,
  ADD COLUMN IF NOT EXISTS weekly_active_days text[] DEFAULT '{}'::text[];
