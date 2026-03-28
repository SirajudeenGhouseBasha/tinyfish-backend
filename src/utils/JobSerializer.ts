import { JobListing, Result, ParseError } from '../types';

export class JobSerializer {
  toJSON(job: JobListing): string {
    try {
      return JSON.stringify({
        id: job.id,
        title: job.title,
        company: job.company,
        postingDate: job.postingDate.toISOString(),
        location: job.location,
        jobType: job.jobType,
        requiredExperience: job.requiredExperience,
        techStack: job.techStack,
        description: job.description,
        applyUrl: job.applyUrl
      });
    } catch (error) {
      throw new Error(`Failed to serialize JobListing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  fromJSON(json: string): Result<JobListing, ParseError> {
    try {
      const data = JSON.parse(json);
      
      // Validate required fields
      const requiredFields = ['id', 'title', 'company', 'postingDate', 'location', 'jobType', 'requiredExperience', 'techStack', 'description', 'applyUrl'];
      
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
      if (typeof data.id !== 'string') {
        return {
          success: false,
          error: { field: 'id', message: 'ID must be a string' }
        };
      }

      if (typeof data.title !== 'string') {
        return {
          success: false,
          error: { field: 'title', message: 'Title must be a string' }
        };
      }

      if (typeof data.company !== 'string') {
        return {
          success: false,
          error: { field: 'company', message: 'Company must be a string' }
        };
      }

      if (!Array.isArray(data.techStack)) {
        return {
          success: false,
          error: { field: 'techStack', message: 'Tech stack must be an array' }
        };
      }

      // Validate experience range
      if (!data.requiredExperience || typeof data.requiredExperience !== 'object') {
        return {
          success: false,
          error: { field: 'requiredExperience', message: 'Required experience must be an object' }
        };
      }

      if (typeof data.requiredExperience.min !== 'number' || typeof data.requiredExperience.max !== 'number') {
        return {
          success: false,
          error: { field: 'requiredExperience', message: 'Experience min and max must be numbers' }
        };
      }

      // Parse date
      let postingDate: Date;
      try {
        postingDate = new Date(data.postingDate);
        if (isNaN(postingDate.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (error) {
        return {
          success: false,
          error: { field: 'postingDate', message: 'Invalid posting date format' }
        };
      }

      const job: JobListing = {
        id: data.id,
        title: data.title,
        company: data.company,
        postingDate: postingDate,
        location: data.location,
        jobType: data.jobType,
        requiredExperience: {
          min: data.requiredExperience.min,
          max: data.requiredExperience.max
        },
        techStack: data.techStack,
        description: data.description,
        applyUrl: data.applyUrl
      };

      return {
        success: true,
        value: job
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