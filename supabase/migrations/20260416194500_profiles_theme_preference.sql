-- User-selected app theme (BackgroundManager + body.theme-*). Time-based when 'automatic'.
alter table public.profiles
  add column if not exists theme_preference text default 'automatic';
