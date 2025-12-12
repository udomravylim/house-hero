-- Fix Signup 500 Error
-- This script creates a trigger to automatically create a profile entry when a user signs up
-- This is likely the cause of the 500 error during signup

-- Step 1: Ensure the profiles table exists (from SUPABASE_SETUP.md)
-- Note: Only creates if it doesn't exist, won't modify existing table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT,
  household_name TEXT,
  household_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 1b: Add profile_picture_url column if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'profile_picture_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_picture_url TEXT;
  END IF;
END $$;

-- Step 2: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create or replace the function to handle new user creation
-- This function is more robust and handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_display_name TEXT;
BEGIN
  -- Get display name from metadata or use email
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Insert profile, ignoring if it already exists (idempotent)
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, user_display_name)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 5: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Ensure RLS policies allow the trigger to work
-- The trigger uses SECURITY DEFINER, so it can bypass RLS
-- But we still need policies for regular access

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create policies
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 7: Grant necessary permissions
-- Note: These grants are safe to run multiple times
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Step 8: Ensure the function has proper permissions
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Verification query (run this to check if everything is set up correctly)
-- SELECT 
--   'Trigger exists' as check_type,
--   CASE 
--     WHEN EXISTS (
--       SELECT 1 FROM pg_trigger 
--       WHERE tgname = 'on_auth_user_created'
--     ) THEN '✅ Trigger is set up'
--     ELSE '❌ Trigger is missing'
--   END as status
-- UNION ALL
-- SELECT 
--   'Function exists' as check_type,
--   CASE 
--     WHEN EXISTS (
--       SELECT 1 FROM pg_proc 
--       WHERE proname = 'handle_new_user'
--     ) THEN '✅ Function is set up'
--     ELSE '❌ Function is missing'
--   END as status
-- UNION ALL
-- SELECT 
--   'Profiles table exists' as check_type,
--   CASE 
--     WHEN EXISTS (
--       SELECT 1 FROM information_schema.tables 
--       WHERE table_schema = 'public' AND table_name = 'profiles'
--     ) THEN '✅ Profiles table exists'
--     ELSE '❌ Profiles table is missing'
--   END as status;

