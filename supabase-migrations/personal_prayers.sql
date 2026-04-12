-- Private personal prayers (Prayer page → "My Prayers" tab)
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.personal_prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  prayer_text text NOT NULL DEFAULT '',
  answered boolean NOT NULL DEFAULT false,
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_prayers_user_created_idx
  ON public.personal_prayers (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS personal_prayers_user_answered_idx
  ON public.personal_prayers (user_id, answered);

ALTER TABLE public.personal_prayers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personal_prayers_select_own"
  ON public.personal_prayers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "personal_prayers_insert_own"
  ON public.personal_prayers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_prayers_update_own"
  ON public.personal_prayers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_prayers_delete_own"
  ON public.personal_prayers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
