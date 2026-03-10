-- Migration: Rename price_per_day to monthly_salary
-- This script updates the user_settings table structure

-- Step 1: Add the new monthly_salary column
ALTER TABLE user_settings 
ADD COLUMN monthly_salary integer DEFAULT 40000;

-- Step 2: Copy data from price_per_day to monthly_salary (convert to integer)
UPDATE user_settings 
SET monthly_salary = CAST(ROUND(price_per_day * 26 * 10) AS integer)
WHERE price_per_day IS NOT NULL;

-- Step 3: Drop the old price_per_day column
ALTER TABLE user_settings 
DROP COLUMN price_per_day;

-- Step 4: Make monthly_salary NOT NULL
ALTER TABLE user_settings 
ALTER COLUMN monthly_salary SET NOT NULL;

-- Verify the migration
SELECT * FROM user_settings LIMIT 1;
