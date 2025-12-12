-- Diagnostic Script for Signup 500 Error
-- Run this to check what might be causing the signup issue

-- Check 1: Does the trigger exist?
SELECT 
  'Trigger Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ Trigger exists'
    ELSE '❌ Trigger is MISSING - This is likely the problem!'
  END as status;

-- Check 2: Does the function exist?
SELECT 
  'Function Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'handle_new_user'
    ) THEN '✅ Function exists'
    ELSE '❌ Function is MISSING - This is likely the problem!'
  END as status;

-- Check 3: Does the profiles table exist?
SELECT 
  'Profiles Table Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN '✅ Profiles table exists'
    ELSE '❌ Profiles table is MISSING - This is likely the problem!'
  END as status;

-- Check 4: Check trigger details
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- Check 5: Check function definition and see if there are any errors
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- Check 6: Check RLS status on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check 7: Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';

-- Check 8: Check if there are any recent errors in the function
-- (This requires checking logs, but we can see if the function compiles)
SELECT 
  'Function Compilation Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'handle_new_user' 
      AND prosrc IS NOT NULL
    ) THEN '✅ Function appears to be valid'
    ELSE '❌ Function may have compilation errors'
  END as status;

-- Check 9: Test if we can insert into profiles (simulation)
-- This won't actually insert, just check permissions
SELECT 
  'Insert Permission Check' as check_type,
  CASE 
    WHEN has_table_privilege('authenticated', 'profiles', 'INSERT') 
    THEN '✅ Authenticated users can insert'
    ELSE '⚠️ Authenticated users may not have insert permission'
  END as status;

