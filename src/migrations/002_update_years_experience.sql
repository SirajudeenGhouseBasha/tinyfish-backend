-- Update years_experience column to allow decimal values
ALTER TABLE user_profiles 
ALTER COLUMN years_experience TYPE DECIMAL(4,2);

-- Update the check constraint to allow decimal values
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_years_experience_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_years_experience_check 
CHECK (years_experience >= 0 AND years_experience <= 50);