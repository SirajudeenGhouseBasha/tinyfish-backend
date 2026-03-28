import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

async function seedSampleData() {
  try {
    console.log('Seeding sample data...');

    // Sample user profile
    const sessionId = uuidv4();
    
    const profileQuery = `
      INSERT INTO user_profiles (
        session_id, role, tech_stack, primary_technology, years_experience,
        location_preference, job_type, resume_path, posting_age_window
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (session_id) DO NOTHING
    `;

    await pool.query(profileQuery, [
      sessionId,
      'Software Engineer',
      JSON.stringify(['JavaScript', 'TypeScript', 'React', 'Node.js']),
      'React',
      3,
      'remote',
      'full-time',
      'uploads/resumes/sample_resume.pdf',
      7
    ]);

    console.log('✓ Sample user profile created');

    // Sample job search session
    const sessionQuery = `
      INSERT INTO job_search_sessions (session_id, status, started_at, completed_at)
      VALUES ($1, $2, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes')
      ON CONFLICT (session_id) DO NOTHING
    `;

    await pool.query(sessionQuery, [sessionId, 'completed']);

    console.log('✓ Sample job search session created');

    console.log('Sample data seeding completed!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedSampleData();