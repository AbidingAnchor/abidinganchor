-- Personal prayers (Prayer page). App selects: id, user_id, content, answered, created_at only.
-- Run in Supabase SQL if the table is missing or 400s refer to unknown columns.

CREATE TABLE IF NOT EXISTS public.prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  answered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prayers_user_id_created_at_idx
  ON public.prayers (user_id, created_at DESC);

-- Legacy tables: add any missing columns
ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS answered boolean NOT NULL DEFAULT false;
ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS is_answered boolean NOT NULL DEFAULT false;
ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS answered_at timestamptz;
ALTER TABLE public.prayers ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
