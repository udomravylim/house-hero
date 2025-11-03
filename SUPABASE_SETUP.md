# Supabase Database Setup Instructions

## Overview
This document contains the complete SQL schema needed to set up the House Hero application database in your Supabase project. Follow these steps in order to set up all required tables, policies, and triggers.

## Prerequisites
- A Supabase project created at [supabase.com](https://supabase.com)
- Authentication enabled in your Supabase project
- SQL Editor access in your Supabase dashboard

---

## 1. Create `households` Table

This table stores household information (family groups, roommates, etc.).

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_households_name_code ON households(name, code);
CREATE INDEX IF NOT EXISTS idx_households_created_by ON households(created_by);
```

---

## 2. Create `household_members` Table

This table links users to households, tracking who belongs to which household.

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_email ON household_members(user_email);
```

---

## 3. Create `tasks` Table

This table stores all household tasks/chores with assignments, priorities, and due dates.

```sql
-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  assignee_email TEXT,
  assignee_name TEXT,
  assignee_initial TEXT,
  created_by TEXT NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_household_id ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_email ON tasks(assignee_email);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
```

---

## 4. Create `profiles` Table

This table stores user profile information separate from Supabase Auth.

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  username TEXT,
  household_name TEXT,
  household_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Enable Row Level Security (RLS)

Enable RLS on all tables to ensure users can only access data they're authorized to see.

```sql
-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## 6. Create RLS Policies

### Policies for `households` table:

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
CREATE POLICY "Users can create households"
ON households FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);
```

### Policies for `household_members` table:

```sql
-- Allow users to read their own memberships
CREATE POLICY "Users can read their own memberships"
ON household_members FOR SELECT
USING (user_id = auth.uid());

-- Allow users to read memberships for households they belong to
CREATE POLICY "Users can read memberships in their household"
ON household_members FOR SELECT
USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow users to insert themselves into households (join)
CREATE POLICY "Users can join households"
ON household_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

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

-- Allow users to delete their own membership (leave household)
CREATE POLICY "Users can delete their own membership"
ON household_members FOR DELETE
USING (user_id = auth.uid());
```

### Policies for `tasks` table:

```sql
-- Allow users to see all tasks in their household
CREATE POLICY "Users can see all tasks in their household"
ON tasks FOR SELECT
TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow users to create tasks in their household
CREATE POLICY "Users can create tasks in their household"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
  household_id IN (
    SELECT household_id FROM household_members
    WHERE user_id = auth.uid()
  )
);

-- Allow users to update tasks in their household
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

-- Allow users to delete tasks in their household
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

### Policies for `profiles` table:

```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can create their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## 7. Create Triggers for `updated_at` Timestamps

Automatically update the `updated_at` column when records are modified.

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
DROP TRIGGER IF EXISTS update_households_updated_at ON households;
CREATE TRIGGER update_households_updated_at
BEFORE UPDATE ON households
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tasks table
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 8. Testing the Setup

After running all the SQL commands above, test your setup:

1. **Sign up a new user** at your app's sign-up page
2. **Create a household** at `/create-household`:
   - Enter a household name (e.g., "Smith Family")
   - Enter a code (e.g., "HOME123")
   - You should be automatically added as an admin member
3. **Join a household** (with a different user) at `/join-household`:
   - Enter the same household name and code
   - You should be added as a member
4. **Create a task** at `/tasks`:
   - Click the + button
   - Fill in task details and assign it
5. **View your profile** at `/profile`:
   - Update your username and display name

---

## Troubleshooting

### Error: "new row violates row-level security policy"

If you get this error, check that:
1. RLS is enabled on all tables
2. All policies are created correctly
3. The user is authenticated (`auth.uid()` is not null)
4. The user is a member of the household they're trying to access

### Error: "permission denied for table"

Make sure:
1. All CREATE POLICY statements ran successfully
2. The user is authenticated
3. The policies allow the operation you're trying to perform

### Tasks not showing up

Verify:
1. The `household_id` column exists in the `tasks` table
2. Tasks are being created with a valid `household_id`
3. The user is a member of the household
4. RLS policies for tasks are correct

---

## Database Schema Summary

### Tables:
- **households**: Stores household information (name, code, creator)
- **household_members**: Links users to households (many-to-many relationship)
- **tasks**: Stores household tasks with assignments, priorities, and due dates
- **profiles**: Stores user profile information separate from Supabase Auth

### Key Relationships:
- `household_members.household_id` → `households.id` (CASCADE DELETE)
- `tasks.household_id` → `households.id` (CASCADE DELETE)
- `profiles.id` → `auth.users.id` (CASCADE DELETE)

### Important Notes:
- Users must be authenticated to perform any operations
- Users can only access data for households they belong to
- When a household is deleted, all related tasks and members are automatically deleted
- Task priorities are constrained to: 'low', 'medium', 'high'
- Each user can only be in one household at a time (enforced by application logic)

---

## Quick Setup Script

To set up everything at once, you can run all the SQL above in sequence, or save this entire document and run it section by section in your Supabase SQL Editor.

**Note**: Make sure to run these in order, as some statements depend on previous ones (e.g., tables must exist before creating policies).
