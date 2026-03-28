import { JobListing, Result, ParseError, JobType, ExperienceRange } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class JobParser {
  parseHTML(html: string): Result<JobListing, ParseError> {
    try {
      // This is a simplified parser - in real implementation, you'd use a proper HTML parser
      // For now, we'll simulate parsing by extracting data from structured HTML
      
      const job = this.extractJobData(html);
      
      if (!job) {
        return {
          success: false,
          error: {
            field: 'html',
            message: 'Unable to extract job data from HTML'
          }
        };
      }

      // Validate required fields
      const validationError = this.validateJobData(job);
      if (validationError) {
        return {
          success: false,
          error: validationError
        };
      }

      return {
        success: true,
        value: job
      };
    } catch (error) {
      return {
        success: false,
        error: {
          field: 'html',
          message: `HTML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  private extractJobData(html: string): JobListing | null {
    try {
      // Simulate HTML parsing - in real implementation, use cheerio or similar
      // This is a mock implementation that looks for specific patterns
      
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const companyMatch = html.match(/company[^>]*>([^<]+)</i);
      const locationMatch = html.match(/location[^>]*>([^<]+)</i);
      const descriptionMatch = html.match(/description[^>]*>([^<]+)</i);
      const applyUrlMatch = html.match(/apply-url[^>]*>([^<]+)</i);
      
      // If we can't find basic required fields, return null
      if (!titleMatch || !companyMatch) {
        return null;
      }

      // Extract tech stack from description or dedicated field
      const techStack = this.extractTechStack(html);
      
      // Extract experience requirements
      const experienceRange = this.extractExperienceRange(html);

      const job: JobListing = {
        id: uuidv4(),
        title: titleMatch[1].trim(),
        company: companyMatch[1].trim(),
        postingDate: new Date(), // In real implementation, extract from HTML
        location: locationMatch ? locationMatch[1].trim() : 'Not specified',
        jobType: this.extractJobType(html),
        requiredExperience: experienceRange,
        techStack: techStack,
        description: descriptionMatch ? descriptionMatch[1].trim() : '',
        applyUrl: applyUrlMatch ? applyUrlMatch[1].trim() : ''
      };

      return job;
    } catch (error) {
      return null;
    }
  }

  private extractTechStack(html: string): string[] {
    const techKeywords = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
      'Angular', 'Vue.js', 'Express', 'Django', 'Spring', 'Laravel', 'MongoDB',
      'PostgreSQL', 'MySQL', 'Redis', 'AWS', 'Docker', 'Kubernetes', 'Git'
    ];

    const foundTech: string[] = [];
    const lowerHtml = html.toLowerCase();

    for (const tech of techKeywords) {
      if (lowerHtml.includes(tech.toLowerCase())) {
        foundTech.push(tech);
      }
    }

    return foundTech;
  }

  private extractExperienceRange(html: string): ExperienceRange {
    // Look for patterns like "2-5 years", "3+ years", "entry level", etc.
    const experiencePatterns = [
      /(\d+)-(\d+)\s*years?/i,
      /(\d+)\+\s*years?/i,
      /(\d+)\s*years?/i
    ];

    for (const pattern of experiencePatterns) {
      const match = html.match(pattern);
      if (match) {
        if (match[2]) {
          // Range pattern (e.g., "2-5 years")
          return {
            min: parseInt(match[1]),
            max: parseInt(match[2])
          };
        } else {
          // Single number or plus pattern
          const years = parseInt(match[1]);
          return {
            min: years,
            max: years + 2 // Assume +2 years for flexibility
          };
        }
      }
    }

    // Default range if no experience mentioned
    return { min: 0, max: 10 };
  }

  private extractJobType(html: string): JobType {
    const lowerHtml = html.toLowerCase();
    
    if (lowerHtml.includes('full-time') || lowerHtml.includes('full time')) {
      return JobType.FullTime;
    } else if (lowerHtml.includes('part-time') || lowerHtml.includes('part time')) {
      return JobType.PartTime;
    } else if (lowerHtml.includes('contract') || lowerHtml.includes('contractor')) {
      return JobType.Contract;
    } else if (lowerHtml.includes('intern') || lowerHtml.includes('internship')) {
      return JobType.Internship;
    }
    
    // Default to full-time
    return JobType.FullTime;
  }

  private validateJobData(job: JobListing): ParseError | null {
    if (!job.title || job.title.trim().length === 0) {
      return { field: 'title', message: 'Job title is required' };
    }

    if (!job.company || job.company.trim().length === 0) {
      return { field: 'company', message: 'Company name is required' };
    }

    if (!job.id || job.id.trim().length === 0) {
      return { field: 'id', message: 'Job ID is required' };
    }

    return null;
  }
}