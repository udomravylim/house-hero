-- Fix negative points: Set all negative point values to 0
-- This ensures no user has negative points

UPDATE user_points
SET total_points = 0
WHERE total_points < 0;

-- Verify the fix
SELECT user_email, total_points 
FROM user_points 
ORDER BY total_points ASC;

