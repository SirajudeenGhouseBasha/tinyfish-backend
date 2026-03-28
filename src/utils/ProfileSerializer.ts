import { UserProfile, Result, ParseError } from '../types';

export class ProfileSerializer {
  toJSON(profile: UserProfile): string {
    try {
      return JSON.stringify({
        role: profile.role,
        techStack: profile.techStack,
        primaryTechnology: profile.primaryTechnology,
        yearsExperience: profile.yearsExperience,
        locationPreference: profile.locationPreference,
        jobType: profile.jobType,
        resumePath: profile.resumePath,
        postingAgeWindow: profile.postingAgeWindow
      });
    } catch (error) {
      throw new Error(`Failed to serialize UserProfile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  fromJSON(json: string): Result<UserProfile, ParseError> {
    try {
      const data = JSON.parse(json);
      
      // Validate required fields
      const requiredFields = ['role', 'techStack', 'yearsExperience', 'locationPreference', 'jobType', 'resumePath', 'postingAgeWindow'];
      
      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null) {
          return {
            success: false,
            error: {
              field,
              message: `Missing required field: ${field}`
            }
          };
        }
      }

      // Type validations
      if (typeof data.role !== 'string') {
        return {
          success: false,
          error: { field: 'role', message: 'Role must be a string' }
        };
      }

      if (!Array.isArray(data.techStack)) {
        return {
          success: false,
          error: { field: 'techStack', message: 'Tech stack must be an array' }
        };
      }

      if (typeof data.yearsExperience !== 'number') {
        return {
          success: false,
          error: { field: 'yearsExperience', message: 'Years of experience must be a number' }
        };
      }

      const profile: UserProfile = {
        role: data.role,
        techStack: data.techStack,
        primaryTechnology: data.primaryTechnology,
        yearsExperience: data.yearsExperience,
        locationPreference: data.locationPreference,
        jobType: data.jobType,
        resumePath: data.resumePath,
        postingAgeWindow: data.postingAgeWindow
      };

      return {
        success: true,
        value: profile
      };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'json',
          message: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }
}