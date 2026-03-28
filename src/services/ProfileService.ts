import { UserProfile } from '../models';
import { UserProfileInput } from '../types';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class ProfileService {
  async createProfile(profileData: UserProfileInput, resumeFile: Express.Multer.File): Promise<{ sessionId: string; profile: UserProfile }> {
    const sessionId = uuidv4();
    
    console.log('ProfileService - received profileData:', profileData);
    console.log('ProfileService - techStack type:', typeof profileData.techStack);
    console.log('ProfileService - techStack value:', profileData.techStack);
    
    // Save resume file
    const resumeFileName = `${sessionId}_${resumeFile.originalname}`;
    const resumePath = path.join('uploads', 'resumes', resumeFileName);
    
    // Ensure uploads directory exists
    await fs.mkdir(path.dirname(resumePath), { recursive: true });
    await fs.writeFile(resumePath, resumeFile.buffer);

    // Create UserProfile object
    const profile = new UserProfile({
      ...profileData,
      resumePath,
      postingAgeWindow: profileData.postingAgeWindow || 7
    });

    console.log('ProfileService - profile.techStack:', profile.techStack);

    // Store in database
    const query = `
      INSERT INTO user_profiles (
        session_id, role, tech_stack, primary_technology, years_experience,
        location_preference, location, job_type, resume_path, posting_age_window, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `;

    const techStackJson = JSON.stringify(profile.techStack);
    console.log('ProfileService - techStackJson:', techStackJson);

    const values = [
      sessionId,
      profile.role,
      techStackJson,
      profile.primaryTechnology,
      profile.yearsExperience,
      profile.locationPreference,
      profile.location || null,
      profile.jobType,
      profile.resumePath,
      profile.postingAgeWindow
    ];

    await pool.query(query, values);

    return { sessionId, profile };
  }

  async getProfile(sessionId: string): Promise<UserProfile | null> {
    const query = `
      SELECT * FROM user_profiles WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    console.log('getProfile - row.tech_stack type:', typeof row.tech_stack);
    console.log('getProfile - row.tech_stack value:', row.tech_stack);
    
    // PostgreSQL JSONB returns as object, not string, so no need to parse
    const techStack = Array.isArray(row.tech_stack) ? row.tech_stack : JSON.parse(row.tech_stack);
    
    return new UserProfile({
      role: row.role,
      techStack: techStack,
      primaryTechnology: row.primary_technology,
      yearsExperience: row.years_experience,
      locationPreference: row.location_preference,
      location: row.location || undefined,
      jobType: row.job_type,
      resumePath: row.resume_path,
      postingAgeWindow: row.posting_age_window
    });
  }
}