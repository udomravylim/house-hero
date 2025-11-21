-- Create user_points table to track points earned by users
-- This table tracks total points earned by each user in each household

-- Step 1: Create user_points table
CREATE TABLE IF NOT EXISTS user_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Step 2: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_points_household_id ON user_points(household_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user_email ON user_points(user_email);
CREATE INDEX IF NOT EXISTS idx_user_points_total_points ON user_points(total_points DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- Allow users to read points for all members in their household
CREATE POLICY "Users can read points in their household"
ON user_points FOR SELECT
TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow system to update points (we'll use a function for this)
CREATE POLICY "Users can update points in their household"
ON user_points FOR UPDATE
TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow system to insert points (we'll use a function for this)
CREATE POLICY "Users can insert points in their household"
ON user_points FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Step 5: Create function to add points to a user
CREATE OR REPLACE FUNCTION add_user_points(
  p_household_id UUID,
  p_user_email TEXT,
  p_points INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from email (assuming it's stored in household_members)
  SELECT user_id INTO v_user_id
  FROM household_members
  WHERE household_id = p_household_id
    AND user_email = p_user_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert or update user points
  INSERT INTO user_points (household_id, user_id, user_email, total_points)
  VALUES (p_household_id, v_user_id, p_user_email, p_points)
  ON CONFLICT (household_id, user_id)
  DO UPDATE SET
    total_points = user_points.total_points + p_points,
    updated_at = NOW();
END;
$$;

-- Step 6: Create function to get user points
CREATE OR REPLACE FUNCTION get_user_points(
  p_household_id UUID,
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_email TEXT,
  user_name TEXT,
  total_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_email,
    COALESCE(hm.user_name, up.user_email) as user_name,
    up.total_points
  FROM user_points up
  LEFT JOIN household_members hm ON up.household_id = hm.household_id 
    AND up.user_id = hm.user_id
  WHERE up.household_id = p_household_id
    AND (p_user_email IS NULL OR up.user_email = p_user_email)
  ORDER BY up.total_points DESC;
END;
$$;

-- Step 7: Create trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_user_points_updated_at ON user_points;
CREATE TRIGGER update_user_points_updated_at
BEFORE UPDATE ON user_points
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Verify the table was created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_points'
ORDER BY ordinal_position;

