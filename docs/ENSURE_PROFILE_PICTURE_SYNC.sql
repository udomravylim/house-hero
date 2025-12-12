-- ============================================
-- Ensure Profile Picture Sync to Household Members
-- ============================================
-- This script ensures that profile pictures from the profiles table
-- are automatically synced to household_members so all members can see
-- each other's profile pictures.
-- ============================================

-- Step 1: Ensure the profile_picture_url column exists in household_members
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Step 2: Create or replace the sync function
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the profile update
    RAISE WARNING 'Error syncing profile picture to household_members for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop and recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS sync_profile_picture_trigger ON profiles;
CREATE TRIGGER sync_profile_picture_trigger
AFTER INSERT OR UPDATE OF profile_picture_url ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_picture_to_household_members();

-- Step 4: Sync all existing profile pictures from profiles to household_members
-- This ensures any existing pictures are synced
UPDATE household_members hm
SET profile_picture_url = p.profile_picture_url
FROM profiles p
WHERE hm.user_id = p.id 
  AND p.profile_picture_url IS NOT NULL
  AND (hm.profile_picture_url IS NULL OR hm.profile_picture_url != p.profile_picture_url);

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_members_profile_picture_url 
ON household_members(profile_picture_url) 
WHERE profile_picture_url IS NOT NULL;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if trigger exists
SELECT 
  'Trigger Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'sync_profile_picture_trigger'
    ) THEN '✅ Trigger exists and is active'
    ELSE '❌ Trigger is missing'
  END as status;

-- Check if function exists
SELECT 
  'Function Status' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'sync_profile_picture_to_household_members'
    ) THEN '✅ Function exists'
    ELSE '❌ Function is missing'
  END as status;

-- Check sync status of profile pictures
SELECT 
  'Sync Status' as check_type,
  COUNT(*) FILTER (WHERE hm.profile_picture_url IS NOT NULL AND p.profile_picture_url IS NOT NULL AND hm.profile_picture_url = p.profile_picture_url) as synced_count,
  COUNT(*) FILTER (WHERE p.profile_picture_url IS NOT NULL AND hm.profile_picture_url IS NULL) as missing_in_household_members,
  COUNT(*) FILTER (WHERE hm.profile_picture_url IS NOT NULL AND p.profile_picture_url IS NULL) as orphaned_in_household_members
FROM household_members hm
LEFT JOIN profiles p ON hm.user_id = p.id;

-- Show detailed sync status for each user
SELECT 
  hm.user_email,
  CASE 
    WHEN hm.profile_picture_url IS NOT NULL AND p.profile_picture_url IS NOT NULL 
      AND hm.profile_picture_url = p.profile_picture_url 
    THEN '✅ Synced'
    WHEN p.profile_picture_url IS NOT NULL AND hm.profile_picture_url IS NULL 
    THEN '⚠️ Profile has pic but household_members does not'
    WHEN hm.profile_picture_url IS NOT NULL AND p.profile_picture_url IS NULL 
    THEN '⚠️ household_members has pic but profile does not'
    ELSE '❌ No picture'
  END as sync_status,
  hm.profile_picture_url as household_members_pic,
  p.profile_picture_url as profiles_pic
FROM household_members hm
LEFT JOIN profiles p ON hm.user_id = p.id
ORDER BY sync_status, hm.user_email;

