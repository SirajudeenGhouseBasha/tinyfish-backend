import pool from '../config/database';

async function run() {
  await pool.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
  console.log('✓ location column added');
  await pool.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
