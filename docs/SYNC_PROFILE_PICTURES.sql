-- ============================================
-- Sync Profile Pictures from profiles to household_members
-- ============================================
-- This script syncs all existing profile pictures from the profiles table
-- to the household_members table. Run this if profile pictures aren't showing
-- for some users even though they've uploaded them.
-- ============================================

-- Step 1: Update all household_members with profile pictures from profiles table
UPDATE household_members hm
SET profile_picture_url = p.profile_picture_url
FROM profiles p
WHERE hm.user_id = p.id 
  AND p.profile_picture_url IS NOT NULL
  AND (hm.profile_picture_url IS NULL OR hm.profile_picture_url != p.profile_picture_url);

-- Step 2: Verify the sync worked
-- Run this query to see which users have profile pictures synced:
SELECT 
  hm.user_email,
  hm.profile_picture_url as household_members_pic,
  p.profile_picture_url as profiles_pic,
  CASE 
    WHEN hm.profile_picture_url IS NOT NULL AND p.profile_picture_url IS NOT NULL 
      AND hm.profile_picture_url = p.profile_picture_url 
    THEN '✅ Synced'
    WHEN p.profile_picture_url IS NOT NULL AND hm.profile_picture_url IS NULL 
    THEN '⚠️ Profile has pic but household_members does not'
    WHEN hm.profile_picture_url IS NOT NULL AND p.profile_picture_url IS NULL 
    THEN '⚠️ household_members has pic but profile does not'
    ELSE '❌ No picture'
  END as sync_status
FROM household_members hm
LEFT JOIN profiles p ON hm.user_id = p.id
ORDER BY sync_status, hm.user_email;

-- ============================================
-- If the trigger isn't working, check:
-- ============================================
-- 1. Verify the trigger exists:
--    SELECT tgname FROM pg_trigger WHERE tgname = 'sync_profile_picture_trigger';
--
-- 2. Verify the function exists:
--    SELECT proname FROM pg_proc WHERE proname = 'sync_profile_picture_to_household_members';
--
-- 3. If the trigger doesn't exist, run ADD_PROFILE_PICTURE_TO_HOUSEHOLD_MEMBERS.sql
-- ============================================

