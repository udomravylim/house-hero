-- ============================================
-- Rollback Script: Undo Points and Profile Changes
-- ============================================
-- This script removes the points system and profile picture changes
-- Run this if you want to start fresh or undo recent changes
-- ============================================

-- WARNING: This will delete all points data!
-- Make sure you want to do this before running.

-- Step 1: Remove the trigger for syncing profile pictures
DROP TRIGGER IF EXISTS sync_profile_picture_trigger ON profiles;
DROP FUNCTION IF EXISTS sync_profile_picture_to_household_members();

-- Step 2: Remove profile_picture_url column from household_members
ALTER TABLE household_members 
DROP COLUMN IF EXISTS profile_picture_url;

-- Step 3: Remove the RPC functions for points
DROP FUNCTION IF EXISTS add_user_points(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_user_points(UUID, TEXT);

-- Step 4: Drop RLS policies on user_points (if they exist)
DROP POLICY IF EXISTS "Users can read points in their household" ON user_points;
DROP POLICY IF EXISTS "Users can update points in their household" ON user_points;
DROP POLICY IF EXISTS "Users can insert points in their household" ON user_points;

-- Step 5: Drop the user_points table (THIS DELETES ALL POINTS DATA!)
-- Uncomment the line below if you want to completely remove the table
-- DROP TABLE IF EXISTS user_points CASCADE;

-- OR if you just want to keep the table but clear the data:
-- TRUNCATE TABLE user_points;

-- Step 6: Remove indexes related to user_points
DROP INDEX IF EXISTS idx_user_points_household_id;
DROP INDEX IF EXISTS idx_user_points_user_id;
DROP INDEX IF EXISTS idx_user_points_user_email;
DROP INDEX IF EXISTS idx_user_points_total_points;
DROP INDEX IF EXISTS idx_household_members_profile_picture_url;

-- ============================================
-- Verification
-- ============================================
-- After running this script, verify:

-- Check if user_points table still exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_points')
    THEN '⚠️ user_points table still exists (commented out DROP TABLE)'
    ELSE '✅ user_points table removed'
  END as table_status;

-- Check if functions were removed
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'add_user_points'
    )
    THEN '⚠️ add_user_points function still exists'
    ELSE '✅ add_user_points function removed'
  END as function_status;

-- Check if profile_picture_url column was removed
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'household_members' 
      AND column_name = 'profile_picture_url'
    )
    THEN '⚠️ profile_picture_url column still exists'
    ELSE '✅ profile_picture_url column removed'
  END as column_status;

-- ============================================
-- Note: This does NOT remove:
-- - profile_picture_url from profiles table (that's fine to keep)
-- - Any other tables or core functionality
-- ============================================

