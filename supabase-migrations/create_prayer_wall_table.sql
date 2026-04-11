-- Create prayer_wall table
CREATE TABLE IF NOT EXISTS prayer_wall (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  praying_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE prayer_wall ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can INSERT (submit a prayer)
CREATE POLICY "Anyone can insert prayer"
ON prayer_wall
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Anyone authenticated can SELECT (view all prayers)
CREATE POLICY "Anyone can view prayers"
ON prayer_wall
FOR SELECT
TO authenticated
USING (true);

-- Policy: Only the owner can DELETE their own prayer
CREATE POLICY "Owner can delete own prayer"
ON prayer_wall
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Anyone authenticated can UPDATE praying_count (for the "I'm praying" tap)
CREATE POLICY "Anyone can update praying_count"
ON prayer_wall
FOR UPDATE
TO authenticated
WITH CHECK (true);
