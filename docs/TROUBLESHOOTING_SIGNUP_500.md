# Troubleshooting Signup 500 Error

## Problem
You're getting a 500 Internal Server Error when trying to create a new account:
```
jtrkcauzkxllqcfuxuzc.supabase.co/auth/v1/signup:1 Failed to load resource: the server responded with a status of 500
```

## Root Cause
This error typically occurs when:
1. **Broken or missing database trigger** - A trigger that should automatically create a profile entry when a user signs up is missing, broken, or failing
2. **RLS policy issues** - Row Level Security policies are preventing the trigger from working
3. **Schema changes** - Recent changes to the profiles table structure may have broken the trigger
4. **Function errors** - The trigger function may have an error that's causing it to fail silently

**Note:** If signup was working before, the trigger likely exists but is now failing due to a recent change.

## Solution

### Step 1: Diagnose the Issue (Recommended First)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `docs/DIAGNOSE_SIGNUP_ISSUE.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the script
6. Review the results to see what's missing or broken

### Step 2: Run the Fix Script
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `docs/FIX_SIGNUP_TRIGGER.sql`
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the script

This script will:
- Ensure the `profiles` table exists (won't modify if it already exists)
- **Replace** the trigger function with a more robust version that handles errors gracefully
- Recreate the trigger if it's missing or broken
- Set up proper RLS policies
- Grant necessary permissions

**Important:** This script uses `CREATE OR REPLACE` so it's safe to run even if the trigger already exists. It will fix any issues with the existing trigger.

### Step 3: Verify the Setup
After running the script, verify everything is set up correctly:

1. **Check if the trigger exists:**
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   Should return one row.

2. **Check if the function exists:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
   ```
   Should return one row.

3. **Check if the profiles table exists:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'profiles';
   ```
   Should return one row.

### Step 4: Test Signup
1. Try creating a new account again
2. If it still fails, check the browser console for more detailed error messages
3. Check the Supabase Dashboard > Logs for any database errors

## Alternative: Manual Profile Creation

If the trigger approach doesn't work, you can manually create profiles after signup. However, this is not recommended as it requires modifying your application code.

## Additional Checks

### Check Environment Variables
Make sure your `.env` file (or environment variables) has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=https://jtrkcauzkxllqcfuxuzc.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Check Supabase Project Status
1. Go to your Supabase Dashboard
2. Check if your project is active (not paused)
3. Check if there are any service issues in the Supabase status page

### Check Database Logs
1. Go to Supabase Dashboard > Logs
2. Look for any errors related to:
   - `handle_new_user` function
   - `on_auth_user_created` trigger
   - `profiles` table inserts

## Still Having Issues?

If the problem persists after running the fix script:

1. **Check Supabase Dashboard > Database > Tables**
   - Verify the `profiles` table exists
   - Check its structure matches the expected schema

2. **Check Supabase Dashboard > Authentication > Policies**
   - Verify RLS is enabled on the `profiles` table
   - Check that policies allow authenticated users to insert

3. **Check Browser Console**
   - Look for more detailed error messages
   - Check the Network tab to see the exact error response

4. **Contact Support**
   - If you're still stuck, the issue might be with your Supabase project configuration
   - Check Supabase documentation or support forums

## Prevention

To prevent this issue in the future:
- Always run the complete database setup script (`SUPABASE_SETUP.md`) when setting up a new project
- Test signup functionality after any database schema changes
- Keep your database triggers and functions up to date

