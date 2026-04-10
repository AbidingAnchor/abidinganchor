-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS prayer_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS prayer_total_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS journal_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_book TEXT DEFAULT 'GEN',
ADD COLUMN IF NOT EXISTS last_chapter TEXT DEFAULT 'GEN.1',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- Add mood column to journal_entries table
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS mood TEXT;
