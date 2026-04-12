-- Personal prayers: answered flag + when God answered (Prayer page).
-- Run in Supabase SQL Editor if columns are missing.

ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS is_answered boolean NOT NULL DEFAULT false;
ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS answered_at timestamptz;

-- If an older migration created "answered" instead of "is_answered", sync once.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prayers' AND column_name = 'answered'
  ) THEN
    UPDATE public.prayers SET is_answered = COALESCE(answered, false);
  END IF;
END $$;

COMMENT ON COLUMN public.prayers.answered_at IS 'When the user marked this prayer as answered; null if not answered.';
