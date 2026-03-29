import { TinyFishClient } from './TinyFishClient';
import { JobListing, SearchStrategy, JobType, LocationPreference } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export class MockTinyFishClient extends EventEmitter implements TinyFishClient {
  private shouldSimulateError: boolean = false;
  private errorType: 'transient' | 'permanent' = 'transient';

  constructor(options?: { simulateError?: boolean; errorType?: 'transient' | 'permanent' }) {
    super();
    this.shouldSimulateError = options?.simulateError || false;
    this.errorType = options?.errorType || 'transient';
  }

  async searchJobs(strategy: SearchStrategy): Promise<JobListing[]> {
    // Simulate API delay
    await this.delay(1000);

    // Emit streaming URL for frontend (simulate Internshala browser)
    console.log('📺 Mock: Emitting streaming URL for Internshala');
    this.emit('streamingUrl', 'https://internshala.com/jobs/');

    if (this.shouldSimulateError && Math.random() < 0.3) {
      throw new Error('Mock search error: Rate limit exceeded');
    }

    // Generate mock job listings based on strategy
    const mockJobs: JobListing[] = [];
    const jobCount = Math.floor(Math.random() * 15) + 8; // 8-23 jobs

    console.log(`🔍 Mock: Searching Internshala for ${strategy.keywords.join(', ')}`);
    console.log(`📍 Mock: Location filter: ${strategy.filters.locations?.join(', ') || 'Any'}`);

    for (let i = 0; i < jobCount; i++) {
      const job = this.generateMockInternshalaJob(strategy, i);
      mockJobs.push(job);
    }

    console.log(`📊 Mock: Found ${mockJobs.length} jobs on Internshala`);
    return mockJobs;
  }

  async clickApplyButton(jobUrl: string): Promise<void> {
    await this.delay(500);

    if (this.shouldSimulateError && Math.random() < 0.2) {
      if (this.errorType === 'permanent') {
        throw new Error('Job no longer available');
      } else {
        throw new Error('Network timeout - please try again');
      }
    }

    console.log(`Mock: Clicked "Apply Now" button on Internshala for ${jobUrl}`);
  }

  async uploadResume(file: Buffer): Promise<void> {
    await this.delay(800);

    if (this.shouldSimulateError && Math.random() < 0.1) {
      throw new Error('File upload failed - please try again');
    }

    console.log(`Mock: Uploaded resume to Internshala (${file.length} bytes)`);
  }

  async fillFormField(fieldName: string, value: string): Promise<void> {
    await this.delay(200);

    if (this.shouldSimulateError && Math.random() < 0.05) {
      throw new Error(`Failed to fill field: ${fieldName}`);
    }

    console.log(`Mock: Filled Internshala form field '${fieldName}' with '${value.substring(0, 50)}${value.length > 50 ? '...' : ''}'`);
  }

  async submitForm(): Promise<void> {
    await this.delay(1000);

    if (this.shouldSimulateError && Math.random() < 0.15) {
      if (this.errorType === 'permanent') {
        throw new Error('Application form has expired');
      } else {
        throw new Error('Submission failed - server error');
      }
    }

    console.log('Mock: Successfully submitted application on Internshala!');
  }

  private generateMockInternshalaJob(strategy: SearchStrategy, index: number): JobListing {
    // Internshala-specific companies (mix of Indian and international)
    const companies = [
      'Wipro', 'TCS', 'Infosys', 'HCL Technologies', 'Tech Mahindra',
      'Accenture India', 'IBM India', 'Microsoft India', 'Google India', 'Amazon India',
      'Flipkart', 'Paytm', 'Zomato', 'Swiggy', 'BYJU\'S', 'Unacademy'
    ];

    const roles = [
      'Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'Data Analyst', 'Business Analyst', 'Digital Marketing Intern', 'Content Writer',
      'UI/UX Designer', 'Mobile App Developer', 'Python Developer', 'Java Developer'
    ];

    // Indian locations (Internshala focus)
    const locations = [
      'Bangalore', 'Hyderabad', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Gurgaon',
      'Noida', 'Kolkata', 'Ahmedabad', 'Remote', 'Work from Home'
    ];

    const techStacks = [
      ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      ['Python', 'Django', 'Flask', 'PostgreSQL'],
      ['Java', 'Spring Boot', 'MySQL', 'Hibernate'],
      ['PHP', 'Laravel', 'CodeIgniter', 'MySQL'],
      ['React Native', 'Flutter', 'Android', 'iOS'],
      ['HTML', 'CSS', 'Bootstrap', 'jQuery'],
      ['Angular', 'TypeScript', 'Express', 'MongoDB']
    ];

    // Use strategy keywords to influence job generation
    const relevantRole = strategy.keywords.find(k => roles.some(r => r.toLowerCase().includes(k.toLowerCase()))) 
      || roles[Math.floor(Math.random() * roles.length)];

    const relevantTech = techStacks[Math.floor(Math.random() * techStacks.length)];
    
    // Add some keywords from strategy to make jobs more relevant
    const enhancedTech = [...relevantTech];
    strategy.keywords.forEach(keyword => {
      if (Math.random() < 0.4 && !enhancedTech.includes(keyword)) {
        enhancedTech.push(keyword);
      }
    });

    // Generate posting date within the specified window
    const maxDaysAgo = strategy.filters.postedWithin || 7;
    const daysAgo = Math.floor(Math.random() * maxDaysAgo);
    const postingDate = new Date();
    postingDate.setDate(postingDate.getDate() - daysAgo);

    // Prefer user's location if specified
    let jobLocation = locations[Math.floor(Math.random() * locations.length)];
    if (strategy.filters.locations?.length) {
      // 70% chance to use user's preferred location
      if (Math.random() < 0.7) {
        jobLocation = strategy.filters.locations[Math.floor(Math.random() * strategy.filters.locations.length)];
      }
    }

    return {
      id: `internshala-${uuidv4()}`,
      title: relevantRole,
      company: companies[Math.floor(Math.random() * companies.length)],
      postingDate,
      location: jobLocation,
      jobType: strategy.filters.jobType || JobType.FullTime,
      requiredExperience: {
        min: Math.floor(Math.random() * 2), // Internshala often has entry-level jobs
        max: Math.floor(Math.random() * 3) + 2
      },
      techStack: enhancedTech,
      description: this.generateInternshalaJobDescription(relevantRole, enhancedTech),
      applyUrl: `https://internshala.com/internship/detail/${uuidv4()}`
    };
  }

  private generateInternshalaJobDescription(role: string, techStack: string[]): string {
    const descriptions = [
      `Exciting opportunity for a ${role} at our company! Work with ${techStack.slice(0, 3).join(', ')} in a dynamic environment. Perfect for freshers and experienced professionals.`,
      `Join our team as a ${role}! You'll be working on innovative projects using ${techStack.slice(0, 2).join(' and ')}. Great learning opportunities and mentorship provided.`,
      `We're hiring a talented ${role} to work on cutting-edge projects. Strong knowledge of ${techStack.join(', ')} required. Competitive salary and benefits.`,
      `Looking for a passionate ${role} to join our growing team. Experience with ${techStack.slice(0, 3).join(', ')} preferred. Excellent growth opportunities and work-life balance.`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper methods for testing
  setErrorSimulation(enabled: boolean, type: 'transient' | 'permanent' = 'transient'): void {
    this.shouldSimulateError = enabled;
    this.errorType = type;
  }
}