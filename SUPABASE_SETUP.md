# Supabase Database Setup Instructions

## Overview
This document contains the SQL schema needed to set up the households and user household relationships in your Supabase project.

## Quick Fix for RLS Policy Error

If you're getting a "new row violates row-level security policy" error, run this SQL to fix it:

```sql
-- First, disable RLS temporarily to check if it's a policy issue
-- ALTER TABLE households DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on these tables
DROP POLICY IF EXISTS "Users can create households" ON households;
DROP POLICY IF EXISTS "Users can read households they are members of" ON households;
DROP POLICY IF EXISTS "Users can update households" ON households;
DROP POLICY IF EXISTS "Users can delete households" ON households;

DROP POLICY IF EXISTS "Users can join households" ON household_members;
DROP POLICY IF EXISTS "Users can read their own memberships" ON household_members;
DROP POLICY IF EXISTS "Admins can add members to their household" ON household_members;

-- Recreate simple INSERT policy for households (most permissive to test)
CREATE POLICY "Allow users to create households"
ON households FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to read households they created or are members of
CREATE POLICY "Allow users to read their households"
ON households FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() OR
  id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert themselves into households
CREATE POLICY "Allow users to join households"
ON household_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own memberships
CREATE POLICY "Allow users to read memberships"
ON household_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

## Database Schema

### 1. Create `households` Table

Run the following SQL in your Supabase SQL Editor:

```sql
-- Create households table
CREATE TABLE IF NOT EXISTS households (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_households_name_code ON households(name, code);
CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);
```

### 2. Create `household_members` Table

Run the following SQL to create the table that links users to households:

```sql
-- Create household_members table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- If table already exists, add user_name column
ALTER TABLE household_members ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_email ON household_members(user_email);
```

### 3. Enable Row Level Security (RLS)

To ensure users can only access their own household data, enable RLS on both tables:

```sql
-- Enable RLS on households
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Enable RLS on household_members
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
```

### 4. Create RLS Policies

#### For `households` table:

```sql
-- Allow users to read households they are members of
CREATE POLICY "Users can read households they are members of"
ON households FOR SELECT
USING (
  id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to create new households
-- User must be authenticated and the created_by must match their ID
CREATE POLICY "Users can create households"
ON households FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);
```

#### For `household_members` table:

```sql
-- Allow users to read their own memberships
CREATE POLICY "Users can read their own memberships"
ON household_members FOR SELECT
USING (user_id = auth.uid());

-- Allow users to insert themselves into households
-- (They can only join if they're not already in another household)
CREATE POLICY "Users can join households"
ON household_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow admins to add other users to their household
CREATE POLICY "Admins can add members to their household"
ON household_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members hm
    WHERE hm.household_id = household_members.household_id
    AND hm.user_id = auth.uid()
    AND hm.is_admin = true
  )
);
```

### 5. Add `household_id` to Existing `tasks` Table

If you already have a `tasks` table, you need to add a `household_id` column to it and update the RLS policies:

```sql
-- Add household_id column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_household_id ON tasks(household_id);

-- Update RLS policy for tasks to filter by household (users can see ALL tasks in their household)
DROP POLICY IF EXISTS "Users can only see tasks in their household" ON tasks;
CREATE POLICY "Users can see all tasks in their household"
ON tasks FOR SELECT
TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Update insert policy
DROP POLICY IF EXISTS "Users can create tasks in their household" ON tasks;
CREATE POLICY "Users can create tasks in their household"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Update policy for task updates (allows any member to update any task in household)
DROP POLICY IF EXISTS "Users can update tasks in their household" ON tasks;
CREATE POLICY "Users can update tasks in their household"
ON tasks FOR UPDATE
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

-- Update policy for task deletion
DROP POLICY IF EXISTS "Users can delete tasks in their household" ON tasks;
CREATE POLICY "Users can delete tasks in their household"
ON tasks FOR DELETE
TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);
```

### 6. Optional: Add a Trigger to Update `updated_at`

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for households table
CREATE TRIGGER update_households_updated_at
BEFORE UPDATE ON households
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Testing the Setup

After running these SQL commands, you can test the setup:

1. Navigate to your app at `/join-household`
2. Try creating a household at `/create-household`
3. Try joining the created household at `/join-household`

## Notes

- The `user_id` in `household_members` uses `auth.uid()` from Supabase Auth to identify users
- The `is_admin` flag allows for future features where admins can manage household members
- Both tables use UUIDs as primary keys for better security and scalability
- The `joined_at` timestamp tracks when each user joined the household
- Foreign key constraints with `ON DELETE CASCADE` ensure data integrity

