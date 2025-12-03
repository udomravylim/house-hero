-- Add difficulty column to tasks table
-- This migration adds support for task difficulty levels (easy, medium, hard)
-- which are used in the point calculation system

-- Step 1: Add the difficulty column with a default value
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'hard' 
CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- Step 2: Update existing tasks to have 'hard' as default difficulty
-- (This is already handled by the DEFAULT value, but we'll do it explicitly for safety)
UPDATE tasks 
SET difficulty = 'hard' 
WHERE difficulty IS NULL;

-- Step 3: Make the column NOT NULL after setting defaults
-- (Optional - you can keep it nullable if you prefer)
-- ALTER TABLE tasks ALTER COLUMN difficulty SET NOT NULL;

-- Step 4: Create an index for faster queries on difficulty
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty);

-- Step 5: Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'difficulty';

