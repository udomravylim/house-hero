-- ============================================
-- Add Profile Picture to Household Members
-- ============================================
-- This script adds profile_picture_url to household_members table
-- and creates a trigger to sync it from profiles table
-- so all household members can see each other's profile pictures
-- ============================================

-- Step 1: Add profile_picture_url column to household_members table
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_members_profile_picture_url 
ON household_members(profile_picture_url) 
WHERE profile_picture_url IS NOT NULL;

-- Step 3: Create function to sync profile picture from profiles to household_members
CREATE OR REPLACE FUNCTION sync_profile_picture_to_household_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile_picture_url in household_members when profiles.profile_picture_url changes
  IF TG_OP = 'UPDATE' AND (OLD.profile_picture_url IS DISTINCT FROM NEW.profile_picture_url) THEN
    UPDATE household_members
    SET profile_picture_url = NEW.profile_picture_url
    WHERE user_id = NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    -- When a new profile is created, update household_members if the user is already a member
    UPDATE household_members
    SET profile_picture_url = NEW.profile_picture_url
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically sync profile pictures
DROP TRIGGER IF EXISTS sync_profile_picture_trigger ON profiles;
CREATE TRIGGER sync_profile_picture_trigger
AFTER INSERT OR UPDATE OF profile_picture_url ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_picture_to_household_members();

-- Step 5: Backfill existing profile pictures to household_members
-- This updates all existing household_members records with profile pictures from profiles
UPDATE household_members hm
SET profile_picture_url = p.profile_picture_url
FROM profiles p
WHERE hm.user_id = p.id 
  AND p.profile_picture_url IS NOT NULL
  AND (hm.profile_picture_url IS NULL OR hm.profile_picture_url != p.profile_picture_url);

-- Step 6: Update RLS policy to allow household members to read profile pictures
-- (The existing policy already allows reading household_members in the same household,
-- so no changes needed to RLS policies)

-- ============================================
-- Verification
-- ============================================
-- After running this script, verify:
-- 1. Check that the column was added:
--    SELECT column_name, data_type 
--    FROM information_schema.columns 
--    WHERE table_name = 'household_members' AND column_name = 'profile_picture_url';
--
-- 2. Check that existing profile pictures were synced:
--    SELECT hm.user_email, hm.profile_picture_url, p.profile_picture_url as profile_pic
--    FROM household_members hm
--    LEFT JOIN profiles p ON hm.user_id = p.id
--    WHERE p.profile_picture_url IS NOT NULL;
-- ============================================

