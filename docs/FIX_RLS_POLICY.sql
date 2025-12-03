-- Fix infinite recursion in RLS policy for household_members
-- The issue is that the policy tries to read from household_members to check membership,
-- which creates a circular dependency.

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Users can read memberships in their household" ON household_members;

-- Step 2: Create a security definer function that can bypass RLS to check household membership
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_household_id UUID;
BEGIN
  SELECT household_id INTO user_household_id
  FROM household_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_household_id;
END;
$$;

-- Step 3: Create the policy using the function (avoids recursion)
CREATE POLICY "Users can read memberships in their household"
ON household_members FOR SELECT
TO authenticated
USING (
  household_id = get_user_household_id()
);

-- Step 4: Verify the policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'household_members'
ORDER BY policyname;
