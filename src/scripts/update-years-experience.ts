import pool from '../config/database';

async function updateYearsExperience() {
  try {
    console.log('Updating years_experience column to support decimal values...');

    // Update the column type to DECIMAL
    await pool.query(`
      ALTER TABLE user_profiles 
      ALTER COLUMN years_experience TYPE DECIMAL(4,2)
    `);
    console.log('✓ Updated years_experience column type to DECIMAL(4,2)');

    // Drop the old check constraint
    await pool.query(`
      ALTER TABLE user_profiles 
      DROP CONSTRAINT IF EXISTS user_profiles_years_experience_check
    `);
    console.log('✓ Dropped old check constraint');

    // Add new check constraint for decimal values
    await pool.query(`
      ALTER TABLE user_profiles 
      ADD CONSTRAINT user_profiles_years_experience_check 
      CHECK (years_experience >= 0 AND years_experience <= 50)
    `);
    console.log('✓ Added new check constraint for decimal values');

    console.log('Database update completed successfully!');
  } catch (error) {
    console.error('Database update failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateYearsExperience();