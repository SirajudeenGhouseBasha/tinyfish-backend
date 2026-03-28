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

    if (this.shouldSimulateError && Math.random() < 0.3) {
      throw new Error('Mock search error: Rate limit exceeded');
    }

    // Generate mock job listings based on strategy
    const mockJobs: JobListing[] = [];
    const jobCount = Math.floor(Math.random() * 20) + 10; // 10-30 jobs

    for (let i = 0; i < jobCount; i++) {
      const job = this.generateMockJob(strategy, i);
      mockJobs.push(job);
    }

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

    console.log(`Mock: Clicked apply button for ${jobUrl}`);
  }

  async uploadResume(file: Buffer): Promise<void> {
    await this.delay(800);

    if (this.shouldSimulateError && Math.random() < 0.1) {
      throw new Error('File upload failed - please try again');
    }

    console.log(`Mock: Uploaded resume (${file.length} bytes)`);
  }

  async fillFormField(fieldName: string, value: string): Promise<void> {
    await this.delay(200);

    if (this.shouldSimulateError && Math.random() < 0.05) {
      throw new Error(`Failed to fill field: ${fieldName}`);
    }

    console.log(`Mock: Filled field '${fieldName}' with '${value.substring(0, 50)}${value.length > 50 ? '...' : ''}'`);
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

    console.log('Mock: Form submitted successfully');
  }

  private generateMockJob(strategy: SearchStrategy, index: number): JobListing {
    const companies = [
      'TechCorp', 'InnovateLabs', 'DataDriven Inc', 'CloudFirst', 'AgileWorks',
      'NextGen Solutions', 'DigitalEdge', 'SmartSystems', 'FutureTech', 'CodeCrafters'
    ];

    const roles = [
      'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
      'Data Scientist', 'DevOps Engineer', 'Product Manager', 'UI/UX Designer'
    ];

    const locations = [
      'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Remote',
      'Boston, MA', 'Chicago, IL', 'Los Angeles, CA', 'Denver, CO', 'Remote - US'
    ];

    const techStacks = [
      ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      ['Python', 'Django', 'PostgreSQL', 'Redis'],
      ['Java', 'Spring Boot', 'MySQL', 'Docker'],
      ['TypeScript', 'Angular', 'Express', 'AWS'],
      ['C#', '.NET Core', 'SQL Server', 'Azure'],
      ['Go', 'Kubernetes', 'PostgreSQL', 'Docker'],
      ['React', 'TypeScript', 'GraphQL', 'Node.js']
    ];

    // Use strategy keywords to influence job generation
    const relevantRole = strategy.keywords.find(k => roles.some(r => r.toLowerCase().includes(k.toLowerCase()))) 
      || roles[Math.floor(Math.random() * roles.length)];

    const relevantTech = techStacks[Math.floor(Math.random() * techStacks.length)];
    
    // Add some keywords from strategy to make jobs more relevant
    const enhancedTech = [...relevantTech];
    strategy.keywords.forEach(keyword => {
      if (Math.random() < 0.3 && !enhancedTech.includes(keyword)) {
        enhancedTech.push(keyword);
      }
    });

    // Generate posting date within the specified window
    const maxDaysAgo = strategy.filters.postedWithin || 7;
    const daysAgo = Math.floor(Math.random() * maxDaysAgo);
    const postingDate = new Date();
    postingDate.setDate(postingDate.getDate() - daysAgo);

    return {
      id: uuidv4(),
      title: relevantRole,
      company: companies[Math.floor(Math.random() * companies.length)],
      postingDate,
      location: locations[Math.floor(Math.random() * locations.length)],
      jobType: strategy.filters.jobType || JobType.FullTime,
      requiredExperience: {
        min: Math.floor(Math.random() * 3),
        max: Math.floor(Math.random() * 5) + 3
      },
      techStack: enhancedTech,
      description: this.generateJobDescription(relevantRole, enhancedTech),
      applyUrl: `https://mockjobboard.com/jobs/${uuidv4()}`
    };
  }

  private generateJobDescription(role: string, techStack: string[]): string {
    const descriptions = [
      `We are looking for a talented ${role} to join our growing team. You will work with ${techStack.slice(0, 3).join(', ')} and other modern technologies.`,
      `Join our innovative team as a ${role}! You'll be responsible for building scalable applications using ${techStack.slice(0, 2).join(' and ')}.`,
      `Exciting opportunity for a ${role} to work on cutting-edge projects. Experience with ${techStack.join(', ')} is required.`,
      `We're seeking a passionate ${role} to help us build the future of technology. Strong skills in ${techStack.slice(0, 3).join(', ')} needed.`
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