import { JobListing, SearchStrategy } from '../types';
import axios from 'axios';
import { EventEmitter } from 'events';

export interface TinyFishClient extends EventEmitter {
  searchJobs(strategy: SearchStrategy): Promise<JobListing[]>;
  clickApplyButton(jobUrl: string): Promise<void>;
  uploadResume(file: Buffer): Promise<void>;
  fillFormField(fieldName: string, value: string): Promise<void>;
  submitForm(): Promise<void>;
}

export interface FormField {
  name: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'file';
  value?: string;
  required: boolean;
}

/**
 * Real TinyFish API Client Implementation with SSE Streaming
 */
export class RealTinyFishClient extends EventEmitter implements TinyFishClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.TINYFISH_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  TinyFish API key not found. Set TINYFISH_API_KEY in .env file.');
      console.warn('   Get your API key from: https://agent.tinyfish.ai/api-keys');
    }
  }

  async searchJobs(strategy: SearchStrategy): Promise<JobListing[]> {
    const jobs: JobListing[] = [];

    console.log(`🔍 Job boards to search:`, strategy.jobBoards);

    for (const jobBoard of strategy.jobBoards) {
      const boardLower = jobBoard.toLowerCase();

      if (boardLower.includes('linkedin')) {
        console.log(`🔍 Searching LinkedIn with SSE streaming...`);
        const linkedInJobs = await this.searchLinkedIn(strategy);
        jobs.push(...linkedInJobs);
      }
    }

    console.log(`📊 Total jobs found across all boards: ${jobs.length}`);
    return jobs;
  }

  private async searchLinkedIn(strategy: SearchStrategy): Promise<JobListing[]> {
    try {
      // Use only role + primary tech — too many keywords = 0 results
      const primaryKeywords = strategy.keywords.slice(0, 3).join(' ');
      const locations = strategy.filters.locations?.length
        ? strategy.filters.locations
        : ['India']; // fallback

      // f_TPR is in SECONDS: postingAgeWindow is in days → multiply by 86400
      const postedWithinSeconds = (strategy.filters.postedWithin || 7) * 86400;

      // LinkedIn supports multiple locations via repeated `location` params
      const baseParams = new URLSearchParams({
        keywords: primaryKeywords,
        f_TPR: `r${postedWithinSeconds}`,
        f_JT: this.mapJobType(strategy.filters.jobType),
        f_AL: 'true', // Easy Apply only
        sortBy: 'DD',  // Most recent first
      });

      // Append each location as a separate param
      for (const loc of locations) {
        baseParams.append('location', loc);
      }

      const linkedInUrl = `https://www.linkedin.com/jobs/search/?${baseParams.toString()}`;
      console.log(`🔍 Searching LinkedIn: ${linkedInUrl}`);

      // Run automation — streaming_url comes from the SSE STREAMING_URL event
      const goal = `You are an autonomous job application agent.

MISSION: Search for jobs on LinkedIn and APPLY to eligible positions.

STEP 1: Navigate and Search
- Go to: ${linkedInUrl}
- Wait for page to load completely
- Dismiss any sign-in modals or popups
- Verify you see job listings

STEP 2: For EACH job listing (process at least 5 jobs):

  A. Extract Job Information:
     - Job title
     - Company name
     - Location
     - Job type (full-time, part-time, contract, internship)
     - Posting date (convert "2 days ago" to actual date YYYY-MM-DD)
     - Required experience level
     - Tech stack/skills mentioned
     - Job description summary
     - Apply URL

  B. Check Eligibility:
     - Does it match tech stack: ${strategy.keywords.slice(0, 5).join(', ')}?
     - Is experience requirement 0-3 years?
     - Is location in: ${locations.join(', ')}?

  C. If ELIGIBLE:
     - Look ONLY for the "Easy Apply" button (LinkedIn's built-in apply)
     - If "Easy Apply" button exists:
         * Click it to open the Easy Apply modal
         * Fill all fields step by step
         * Use these defaults if fields are empty:
           Name: John Doe
           Email: john.doe@email.com
           Phone: +1-555-0123
         * Click Next on each step until you reach Submit
         * Submit the application
         * Record as "applied"
     - If only a regular "Apply" button exists (redirects externally):
         * DO NOT click it
         * Record as "skipped" with reason "no_easy_apply"
     - If no apply button found at all:
         * Record as "skipped" with reason "no_apply_button"

  D. If NOT ELIGIBLE:
     - Record as "skipped" with specific reason

  E. If ERROR occurs:
     - Record as "failed" with error message
     - Continue to next job

STEP 3: Handle Special Cases
- If login required → STOP and return what you have so far
- If captcha appears → Skip that job, continue to next
- If rate limited → STOP and return what you have

STEP 4: Return ONLY valid JSON in this exact format:
{
  "jobs": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "jobType": "string",
      "postingDate": "YYYY-MM-DD",
      "experience": "string",
      "skills": ["string"],
      "description": "string",
      "applyUrl": "string",
      "applicationStatus": "applied" | "skipped" | "failed",
      "applicationReason": "string"
    }
  ],
  "summary": {
    "total": number,
    "applied": number,
    "skipped": number,
    "failed": number
  }
}

IMPORTANT:
- Process at least 5 jobs
- Actually click apply buttons and submit forms where possible
- Return detailed status for each job`;

      console.log(`🤖 Starting TinyFish SSE automation with live browser stream...`);
      const result = await this.runTinyFishAutomationSSE(linkedInUrl, goal);
      console.log(`✅ TinyFish SSE API completed`);

      const jobs = this.parseLinkedInJobs(result);
      console.log(`📊 Successfully parsed ${jobs.length} jobs from LinkedIn`);
      return jobs;
    } catch (error) {
      console.error('❌ LinkedIn search error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      return [];
    }
  }

  private async runTinyFishAutomationSSE(url: string, goal: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('TinyFish API key is required. Set TINYFISH_API_KEY environment variable.');
    }

    try {
      console.log(`🤖 Running TinyFish SSE automation...`);
      console.log(`   URL: ${url}`);
      console.log(`   Goal: ${goal.substring(0, 100)}...`);

      const response = await axios.post(
        'https://agent.tinyfish.ai/v1/automation/run-sse',
        {
          url,
          goal,
          browser_profile: 'stealth'
        },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          responseType: 'stream',
          timeout: 600000 // 10 minutes
        }
      );

      let finalResult: any = null;
      const stream = response.data;

      return new Promise((resolve, reject) => {
        let buffer = '';

        stream.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.type === 'STARTED') {
                console.log(`🚀 TinyFish automation started`);
                this.emit('progress', { message: 'Automation started', purpose: eventData.purpose });
              }

              if (eventData.type === 'STREAMING_URL') {
                const streamingUrl = eventData.streaming_url;
                console.log(`📺 STREAMING_URL received: ${streamingUrl}`);
                this.emit('streamingUrl', streamingUrl);
              }

              if (eventData.type === 'PROGRESS') {
                console.log(`⏳ Progress: ${eventData.purpose}`);
                this.emit('progress', { message: eventData.purpose, purpose: eventData.purpose });
              }

              if (eventData.type === 'COMPLETE') {
                console.log(`✅ TinyFish automation completed`);
                finalResult = eventData.result;
              }

              if (eventData.type === 'ERROR') {
                console.error(`❌ TinyFish error: ${eventData.error}`);
                reject(new Error(eventData.error));
              }

            } catch (parseError) {
              console.warn('Failed to parse SSE event:', line);
            }
          }
        });

        stream.on('end', () => {
          console.log(`🏁 SSE stream ended`);
          resolve(finalResult);
        });

        stream.on('error', (error: Error) => {
          console.error('❌ SSE stream error:', error);
          reject(error);
        });
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ TinyFish SSE API error:', error.response?.data || error.message);
        console.error('   Status:', error.response?.status);
        if (error.response?.status === 401) {
          throw new Error('Invalid TinyFish API key. Check your TINYFISH_API_KEY environment variable.');
        }
      }
      throw error;
    }
  }

  private mapJobType(jobType?: string): string {
    const mapping: Record<string, string> = {
      'full-time': 'F',
      'part-time': 'P',
      'contract': 'C',
      'internship': 'I'
    };
    return mapping[jobType || 'full-time'] || 'F';
  }

  private parseLinkedInJobs(result: any): JobListing[] {
    console.log('🔍 Parsing LinkedIn jobs from result:', typeof result, result);

    if (!result) {
      console.warn('⚠️  Result is null or undefined');
      return [];
    }

    let jobsArray: any[] = [];

    if (Array.isArray(result)) {
      jobsArray = result;
    } else if (result.jobs && Array.isArray(result.jobs)) {
      jobsArray = result.jobs;
    } else if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        if (Array.isArray(parsed)) {
          jobsArray = parsed;
        } else if (parsed.jobs && Array.isArray(parsed.jobs)) {
          jobsArray = parsed.jobs;
        }
      } catch (e) {
        console.error('❌ Failed to parse result as JSON:', e);
      }
    }

    if (jobsArray.length === 0) {
      console.warn('⚠️  No jobs found in TinyFish result');
      console.warn('   Result structure:', Object.keys(result || {}));
      return [];
    }

    console.log(`📊 Found ${jobsArray.length} jobs to parse`);

    if (result.summary) {
      console.log(`📊 Application Summary:`, result.summary);
      console.log(`   ✅ Applied: ${result.summary.applied || 0}`);
      console.log(`   ⏭️  Skipped: ${result.summary.skipped || 0}`);
      console.log(`   ❌ Failed: ${result.summary.failed || 0}`);
    }

    return jobsArray.map((job: any, index: number) => {
      if (job.applicationStatus) {
        const statusEmoji = job.applicationStatus === 'applied' ? '✅' :
          job.applicationStatus === 'skipped' ? '⏭️' : '❌';
        console.log(`${statusEmoji} ${job.title} at ${job.company}: ${job.applicationStatus} - ${job.applicationReason || 'N/A'}`);
      }

      return {
        id: job.id || `linkedin-${Date.now()}-${index}`,
        title: job.title || 'Unknown Title',
        company: job.company || 'Unknown Company',
        postingDate: this.parseDate(job.postingDate),
        location: job.location || 'Unknown',
        jobType: this.normalizeJobType(job.jobType) as any,
        requiredExperience: this.parseExperience(job.experience),
        techStack: this.parseTechStack(job.skills),
        description: job.description || '',
        applyUrl: job.applyUrl || '',
        applicationStatus: job.applicationStatus,
        applicationReason: job.applicationReason
      };
    });
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    const daysAgoMatch = dateStr.match(/(\d+)\s+days?\s+ago/i);
    if (daysAgoMatch) {
      const days = parseInt(daysAgoMatch[1]);
      return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    const weeksAgoMatch = dateStr.match(/(\d+)\s+weeks?\s+ago/i);
    if (weeksAgoMatch) {
      const weeks = parseInt(weeksAgoMatch[1]);
      return new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
    }

    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private normalizeJobType(jobType: string): string {
    const normalized = jobType?.toLowerCase() || '';
    if (normalized.includes('full')) return 'full-time';
    if (normalized.includes('part')) return 'part-time';
    if (normalized.includes('contract')) return 'contract';
    if (normalized.includes('intern')) return 'internship';
    return 'full-time';
  }

  private parseExperience(expStr: string): { min: number; max: number } {
    if (!expStr) return { min: 0, max: 10 };

    const match = expStr.match(/(\d+)[\s-]+(\d+)/);
    if (match) {
      return { min: parseInt(match[1]), max: parseInt(match[2]) };
    }

    const singleMatch = expStr.match(/(\d+)/);
    if (singleMatch) {
      const years = parseInt(singleMatch[1]);
      return { min: years, max: years + 2 };
    }

    return { min: 0, max: 10 };
  }

  private parseTechStack(skills: string | string[]): string[] {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') {
      return skills.split(/[,;]/).map(s => s.trim()).filter(s => s);
    }
    return [];
  }

  async clickApplyButton(jobUrl: string): Promise<void> {
    // Application is handled entirely within searchLinkedIn goal
    console.log(`📝 Application handled during main search run for: ${jobUrl}`);
  }

  async uploadResume(file: Buffer): Promise<void> {
    console.log('📄 Resume upload handled during application process');
  }

  async fillFormField(fieldName: string, value: string): Promise<void> {
    console.log(`📝 Form field ${fieldName} handled during application process`);
  }

  async submitForm(): Promise<void> {
    console.log('✉️  Form submission handled during application process');
  }
}