import { JobListing, UserProfile, StackMatch } from '../types';

export class StackSorter {
  constructor(private profile: UserProfile) {}

  calculateMatchPercentage(job: JobListing): number {
    if (this.profile.techStack.length === 0) {
      return 0;
    }

    const userTechLower = this.profile.techStack.map(tech => tech.toLowerCase());
    const jobTechLower = job.techStack.map(tech => tech.toLowerCase());

    // Count matching technologies
    const matchingTech = userTechLower.filter(tech => 
      jobTechLower.some(jobTech => 
        jobTech.includes(tech) || tech.includes(jobTech)
      )
    );

    // Calculate percentage based on user's tech stack
    const matchPercentage = (matchingTech.length / this.profile.techStack.length) * 100;
    
    return Math.round(matchPercentage * 100) / 100; // Round to 2 decimal places
  }

  sortByStackRelevance(jobs: JobListing[]): StackMatch[] {
    const stackMatches: StackMatch[] = jobs.map(job => {
      const matchPercentage = this.calculateMatchPercentage(job);
      const matchingTechnologies = this.getMatchingTechnologies(job);

      return {
        job,
        matchPercentage,
        matchingTechnologies
      };
    });

    // Sort by match percentage (descending) with primary technology boost
    return stackMatches.sort((a, b) => {
      // First, check if either job contains the primary technology
      const aPrimaryMatch = this.hasPrimaryTechnology(a.job);
      const bPrimaryMatch = this.hasPrimaryTechnology(b.job);

      if (aPrimaryMatch && !bPrimaryMatch) {
        return -1; // a comes first
      } else if (!aPrimaryMatch && bPrimaryMatch) {
        return 1; // b comes first
      }

      // If both or neither have primary tech, sort by match percentage
      return b.matchPercentage - a.matchPercentage;
    });
  }

  private getMatchingTechnologies(job: JobListing): string[] {
    const userTechLower = this.profile.techStack.map(tech => tech.toLowerCase());
    const jobTechLower = job.techStack.map(tech => tech.toLowerCase());
    const matching: string[] = [];

    for (const userTech of this.profile.techStack) {
      const userTechLower = userTech.toLowerCase();
      
      for (const jobTech of job.techStack) {
        const jobTechLower = jobTech.toLowerCase();
        
        if (jobTechLower.includes(userTechLower) || userTechLower.includes(jobTechLower)) {
          // Use the original case from user's profile
          if (!matching.includes(userTech)) {
            matching.push(userTech);
          }
          break;
        }
      }
    }

    return matching;
  }

  private hasPrimaryTechnology(job: JobListing): boolean {
    if (!this.profile.primaryTechnology) {
      return false;
    }

    const primaryTechLower = this.profile.primaryTechnology.toLowerCase();
    
    return job.techStack.some(tech => 
      tech.toLowerCase().includes(primaryTechLower) || 
      primaryTechLower.includes(tech.toLowerCase())
    );
  }
}