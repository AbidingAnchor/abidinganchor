-- Add prayer and gratitude columns to journal_entries table for guided journal entries
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS prayer TEXT,
ADD COLUMN IF NOT EXISTS gratitude TEXT,
ADD COLUMN IF NOT EXISTS verse TEXT;
