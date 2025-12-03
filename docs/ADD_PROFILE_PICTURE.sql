-- ============================================
-- Profile Picture Setup for House Hero
-- ============================================
-- This script sets up profile picture functionality:
-- 1. Adds profile_picture_url column to profiles table
-- 2. Creates a storage bucket for profile pictures
-- 3. Sets up storage policies for secure access
-- ============================================

-- Step 1: Add profile_picture_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Step 2: Create storage bucket for profile pictures
-- Note: This must be run in Supabase Dashboard > Storage
-- Or via the Supabase Management API
-- The bucket name will be: 'profile-pictures'

-- Step 3: Create storage policies for profile pictures bucket
-- These policies allow users to:
-- - Upload their own profile picture
-- - Read their own profile picture
-- - Update/delete their own profile picture
-- - Read other users' profile pictures (for displaying in app)

-- Policy: Allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to read any profile picture (for displaying in app)
CREATE POLICY "Users can read profile pictures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Policy: Allow users to update their own profile picture
CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own profile picture
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- IMPORTANT: Manual Steps Required
-- ============================================
-- After running this SQL script, you MUST manually create the storage bucket:
--
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to Storage
-- 3. Click "New bucket"
-- 4. Name it: profile-pictures
-- 5. Make it PUBLIC (or keep it private - the policies handle access)
-- 6. Click "Create bucket"
--
-- The bucket should be PUBLIC if you want profile pictures to be accessible
-- without authentication (for displaying in the app). If you keep it private,
-- users will need to be authenticated to see profile pictures.
-- ============================================

