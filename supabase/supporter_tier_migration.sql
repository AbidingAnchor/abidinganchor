-- Supporter Tier Migration
-- Run this in your Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS supporter_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS name_color text DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS profile_border text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS is_founding_member boolean DEFAULT false;

-- Migrate existing is_supporter=true users to 'monthly' tier
UPDATE profiles
  SET supporter_tier = 'monthly'
  WHERE is_supporter = true AND (supporter_tier IS NULL OR supporter_tier = 'free');
