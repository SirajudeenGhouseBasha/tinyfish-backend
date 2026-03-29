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

export class RealTinyFishClient extends EventEmitter implements TinyFishClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.TINYFISH_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️  TinyFish API key not found. Set TINYFISH_API_KEY in .env');
    }
  }

  async searchJobs(strategy: SearchStrategy): Promise<JobListing[]> {
    const jobs: JobListing[] = [];
    console.log(`🔍 Job boards:`, strategy.jobBoards);

    for (const jobBoard of strategy.jobBoards) {
      if (jobBoard.toLowerCase().includes('internshala')) {
        const internshalaJobs = await this.searchInternshala(strategy);
        jobs.push(...internshalaJobs);
      }
    }

    console.log(`📊 Total jobs found: ${jobs.length}`);
    return jobs;
  }

  /**
   * Build the correct Internshala URL based on role, tech stack, experience, location
   * Internshala URL patterns:
   *   /jobs/{category}/                        — all jobs in category
   *   /jobs/{category}/work-from-home/         — WFH only
   *   /fresher-jobs/{category}/                — fresher jobs in category
   *   /fresher-jobs/{category}/work-from-home/ — fresher + WFH
   */
  private buildInternshalaUrl(strategy: SearchStrategy): string {
    const role = (strategy.keywords[0] || '').toLowerCase();
    const tech = (strategy.keywords[1] || '').toLowerCase();
    const isFresher = strategy.filters.experienceLevel === 'entry-level';
    const isWFH = ['remote', 'work from home', 'wfh'].some(w =>
      strategy.filters.locations?.some(loc => loc.toLowerCase().includes(w)) || false
    );

    // Expanded Internshala category mapping for better fresher job coverage
    const categoryMap: [string[], string][] = [
      // Web Development (most common for freshers)
      [['react', 'vue', 'angular', 'frontend', 'front end', 'web developer', 'web development', 'html', 'css', 'javascript', 'js'], 'web-development-jobs'],
      
      // Computer Science (broad category for software roles)
      [['python', 'django', 'flask', 'node', 'backend', 'full stack', 'fullstack', 'java', 'spring', 'software', 'developer', 'engineer', 'programming', 'coding', 'computer science', 'cs', 'it'], 'computer-science-jobs'],
      
      // Mobile Development
      [['android', 'ios', 'mobile', 'app development', 'flutter', 'react native'], 'mobile-app-development-jobs'],
      
      // Data Science & Analytics
      [['data science', 'machine learning', 'ml', 'ai', 'deep learning', 'nlp', 'analytics', 'data analyst'], 'data-science-jobs'],
      
      // Digital Marketing (good for freshers)
      [['digital marketing', 'seo', 'sem', 'social media marketing', 'marketing', 'content marketing'], 'digital-marketing-jobs'],
      
      // Design
      [['graphic design', 'ui ux', 'ui/ux', 'figma', 'design', 'designer', 'photoshop'], 'graphic-design-jobs'],
      
      // Content & Writing
      [['content writing', 'copywriting', 'content', 'writing', 'blogger'], 'content-writing-jobs'],
      
      // Business & Finance
      [['finance', 'accounting', 'ca', 'chartered', 'mba finance', 'business analyst'], 'finance-jobs'],
      
      // HR & Operations
      [['hr', 'human resource', 'recruitment', 'talent', 'operations'], 'hr-jobs'],
      
      // Sales & Business Development
      [['sales', 'business development', 'bd', 'account manager'], 'sales-jobs'],
    ];

    // Find best matching category (prioritize exact matches)
    let category = 'computer-science-jobs'; // safe default for tech roles
    let bestMatch = 0;
    
    for (const [keywords, slug] of categoryMap) {
      const matches = keywords.filter(k => 
        role.includes(k) || tech.includes(k) || 
        k.includes(role) || k.includes(tech)
      ).length;
      
      if (matches > bestMatch) {
        bestMatch = matches;
        category = slug;
      }
    }

    // Always use fresher-jobs for entry-level to get maximum coverage
    const base = isFresher || strategy.filters.experienceLevel === 'entry-level'
      ? `https://internshala.com/fresher-jobs/${category}/`
      : `https://internshala.com/jobs/${category}/`;

    return isWFH ? `${base}work-from-home/` : base;
  }

  private async searchInternshala(strategy: SearchStrategy): Promise<JobListing[]> {
    try {
      const internshalaUrl = this.buildInternshalaUrl(strategy);
      console.log(`🔍 Internshala target URL: ${internshalaUrl}`);

      const techStack = strategy.keywords.slice(0, 5).join(', ');
      const location = strategy.filters.locations?.join(', ') || 'any';
      const hasLogin = !!(process.env.INTERNSHALA_EMAIL && process.env.INTERNSHALA_PASSWORD);

      // Create a broader tech keywords list for better matching
      const broadTechKeywords = [
        ...strategy.keywords,
        'web development', 'programming', 'software', 'coding', 'developer', 'engineer',
        'IT', 'computer science', 'frontend', 'backend', 'fullstack', 'javascript',
        'html', 'css', 'react', 'node', 'python', 'java', 'php', 'mysql', 'database'
      ].join(', ');

      const goal = `You are an autonomous job application agent on Internshala, India's top fresher job portal.

MISSION: Act like a human user, login naturally, then apply to jobs seamlessly.

STEP 1: Warm-up Navigation (CRITICAL - Makes bot look human)
- First visit homepage: https://internshala.com
- Wait 3-4 seconds for page to load completely
- Scroll down slightly (200-300 pixels) to mimic human browsing
- Wait another 2 seconds
- This warm-up reduces captcha triggers significantly

STEP 2: Human-Like Login Strategy
${hasLogin ? `- Navigate to login page: https://internshala.com/login
- Wait 3-5 seconds after page loads (don't rush)
- Click email field (don't type immediately)
- Type email slowly like a human: ${process.env.INTERNSHALA_EMAIL}
  * Type character by character with small delays (100-200ms between characters)
- Wait 1-2 seconds after finishing email
- Click password field
- Type password slowly like a human: ${process.env.INTERNSHALA_PASSWORD}
  * Again, character by character with small delays
- Wait 2 seconds before clicking login (humans pause to review)
- Click Login button (do NOT click instantly after typing)

LOGIN SUCCESS DETECTION (Proper Detection):
- Check if URL still contains "/login" - if yes, login failed
- Look for these SUCCESS indicators:
  * "My Applications" text/link
  * Profile dropdown menu
  * "Logout" option
  * User name displayed
- If URL redirected away from login page AND success indicators present = SUCCESS
- If still on login page after 10 seconds = FAILED

SMART CAPTCHA HANDLING:
- If "Captcha error. Please try again." dialog appears:
  1. Click "Close" button to dismiss dialog
  2. Wait 10 seconds (let system cool down)
  3. Try clicking Login button ONCE more (do NOT retry multiple times)
  4. If captcha appears again: SKIP login completely
  5. Continue to job browsing without login

- If reCAPTCHA checkbox appears: click it and wait for verification
- If image captcha appears: try to solve if simple, otherwise skip login

- Do NOT retry login more than ONCE total
- If login fails: continue anyway with job browsing only` : `- Skip login step since no credentials provided`}

STEP 3: Navigate to job listings (after login attempt)
- Go to: ${internshalaUrl}
- Wait for job listings to load (JavaScript heavy - wait 3-5 seconds)
- You should see job cards with titles, companies, locations, salaries
- If login was successful: applications will be seamless without captcha
- If login failed: you can still browse and try applications (some might work)

STEP 4: Process jobs efficiently (target 10+ jobs):

  A. Read each job card quickly:
     - Job title (clickable heading)
     - Company name
     - Location ("Work from home" or city name)
     - Salary (₹ X - Y /year)
     - Experience ("No experience required", "Fresher Job", "X year(s)")
     - Skills/technologies mentioned
     - Posting date ("Today", "X days ago")

  B. Check eligibility (BE LENIENT):
     - Tech match: ANY of these keywords: ${broadTechKeywords}
     - Experience: 0-3 years, fresher-friendly roles
     - Location: ${location}, remote, or any location

  C. If ELIGIBLE - Apply:
     - Click job title to open details
     - Click "Apply Now" button
     - If logged in successfully: form should open directly WITHOUT login prompt
     - If login prompt appears (not logged in): 
       * Try entering credentials once
       * If captcha appears: skip this job, continue to next
     - Fill application form:
       * Cover letter: "I am a motivated fresher eager to contribute with my technical skills."
       * Fill other required fields with reasonable defaults
       * Click Submit/Apply
       * Record as "applied"
     - If external redirect: record "skipped" with "external_application"
     - Navigate back to job list

  D. If NOT eligible: record "skipped" with specific reason

  E. On any error: record "failed", continue to next job

STEP 5: Handle edge cases efficiently
- Modal blocking page? Close it and continue
- Rate limited? Stop and return results
- Max 45 seconds per job (don't get stuck)
- If too many captcha errors: stop and return results

STEP 6: Return ONLY this JSON (no markdown):
{
  "jobs": [
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "jobType": "full-time",
      "postingDate": "YYYY-MM-DD",
      "experience": "string",
      "skills": ["string"],
      "salary": "string",
      "description": "string",
      "applyUrl": "string",
      "applicationStatus": "applied" | "skipped" | "failed",
      "applicationReason": "string"
    }
  ],
  "summary": { "total": 0, "applied": 0, "skipped": 0, "failed": 0 }
}`;

      const result = await this.runTinyFishAutomationSSE(internshalaUrl, goal);
      return this.parseJobs(result, 'internshala');

    } catch (error) {
      console.error('❌ Internshala search error:', error);
      return [];
    }
  }

  private async runTinyFishAutomationSSE(url: string, goal: string): Promise<any> {
    if (!this.apiKey) throw new Error('TinyFish API key required.');

    console.log(`🤖 Running TinyFish SSE automation...`);
    console.log(`   URL: ${url}`);
    console.log(`   Goal preview: ${goal.substring(0, 100)}...`);

    const response = await axios.post(
      'https://agent.tinyfish.ai/v1/automation/run-sse',
      { url, goal, browser_profile: 'stealth' },
      {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream',
        timeout: 600000
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
            const event = JSON.parse(line.slice(6));

            if (event.type === 'STARTED') {
              console.log(`🚀 Automation started`);
              this.emit('progress', { message: 'Agent started on Internshala' });
            }

            if (event.type === 'STREAMING_URL') {
              // SSE streaming URL — the correct live browser view
              console.log(`📺 Live browser stream: ${event.streaming_url}`);
              this.emit('streamingUrl', event.streaming_url);
            }

            if (event.type === 'PROGRESS') {
              console.log(`⏳ ${event.purpose}`);
              this.emit('progress', { message: event.purpose, purpose: event.purpose });
            }

            if (event.type === 'COMPLETE') {
              console.log(`✅ Automation complete`);
              finalResult = event.result;
            }

            if (event.type === 'ERROR') {
              console.error(`❌ TinyFish error: ${event.error}`);
              reject(new Error(event.error));
            }

          } catch {
            // Heartbeat or non-JSON lines — ignore
          }
        }
      });

      stream.on('end', () => {
        console.log(`🏁 SSE stream ended`);
        resolve(finalResult);
      });

      stream.on('error', (err: Error) => {
        console.error('❌ SSE stream error:', err);
        reject(err);
      });
    });
  }

  private parseJobs(result: any, source: string): JobListing[] {
    if (!result) { console.warn('⚠️  No result returned'); return []; }

    let jobsArray: any[] = [];
    if (Array.isArray(result)) {
      jobsArray = result;
    } else if (result.jobs && Array.isArray(result.jobs)) {
      jobsArray = result.jobs;
    } else if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        jobsArray = Array.isArray(parsed) ? parsed : (parsed.jobs || []);
      } catch { console.error('❌ JSON parse failed'); }
    }

    if (!jobsArray.length) { console.warn('⚠️  Zero jobs parsed'); return []; }

    console.log(`📊 Parsing ${jobsArray.length} jobs from ${source}`);
    if (result.summary) {
      console.log(`📊 Applied: ${result.summary.applied || 0} | Skipped: ${result.summary.skipped || 0} | Failed: ${result.summary.failed || 0}`);
    }

    return jobsArray.map((job: any, i: number) => {
      const emoji = job.applicationStatus === 'applied' ? '✅' :
                    job.applicationStatus === 'skipped' ? '⏭️' : '❌';
      console.log(`${emoji} ${job.title} @ ${job.company}: ${job.applicationStatus} — ${job.applicationReason || ''}`);

      return {
        id: `${source}-${Date.now()}-${i}`,
        title: job.title || 'Unknown',
        company: job.company || 'Unknown',
        postingDate: this.parseDate(job.postingDate),
        location: job.location || 'Unknown',
        jobType: this.normalizeJobType(job.jobType) as any,
        requiredExperience: this.parseExperience(job.experience),
        techStack: this.parseTechStack(job.skills),
        description: job.description || job.salary || '',
        applyUrl: job.applyUrl || '',
        applicationStatus: job.applicationStatus,
        applicationReason: job.applicationReason
      };
    });
  }

  private parseDate(s: string): Date {
    if (!s) return new Date();
    if (/today/i.test(s)) return new Date();
    const d = s.match(/(\d+)\s+days?\s+ago/i);
    if (d) return new Date(Date.now() - +d[1] * 86400000);
    const w = s.match(/(\d+)\s+weeks?\s+ago/i);
    if (w) return new Date(Date.now() - +w[1] * 7 * 86400000);
    const p = new Date(s);
    return isNaN(p.getTime()) ? new Date() : p;
  }

  private normalizeJobType(t: string): string {
    const s = t?.toLowerCase() || '';
    if (s.includes('full')) return 'full-time';
    if (s.includes('part')) return 'part-time';
    if (s.includes('contract')) return 'contract';
    if (s.includes('intern')) return 'internship';
    return 'full-time';
  }

  private parseExperience(s: string): { min: number; max: number } {
    if (!s) return { min: 0, max: 5 };
    if (/no experience|fresher|0 year/i.test(s)) return { min: 0, max: 1 };
    const r = s.match(/(\d+)[\s-]+(\d+)/);
    if (r) return { min: +r[1], max: +r[2] };
    const n = s.match(/(\d+)/);
    if (n) return { min: +n[1], max: +n[1] + 1 };
    return { min: 0, max: 5 };
  }

  private parseTechStack(skills: string | string[]): string[] {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    return [];
  }

  async clickApplyButton(jobUrl: string): Promise<void> {
    console.log(`📝 Application handled in main run: ${jobUrl}`);
  }
  async uploadResume(_file: Buffer): Promise<void> {
    console.log('📄 Resume handled in main run');
  }
  async fillFormField(fieldName: string, _value: string): Promise<void> {
    console.log(`📝 Field ${fieldName} handled in main run`);
  }
  async submitForm(): Promise<void> {
    console.log('✉️  Submission handled in main run');
  }
}