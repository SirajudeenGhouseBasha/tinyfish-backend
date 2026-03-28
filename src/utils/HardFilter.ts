import { JobListing, UserProfile, FilterResult } from '../types';

export class HardFilter {
  constructor(private profile: UserProfile) {}

  filterByAge(job: JobListing): FilterResult {
    const now = new Date();
    const postingDate = new Date(job.postingDate);
    const daysDifference = Math.floor((now.getTime() - postingDate.getTime()) / (1000 * 60 * 60 * 24));

    // Allow 2x the posting age window to be more lenient
    const maxDays = this.profile.postingAgeWindow * 2;
    
    if (daysDifference > maxDays) {
      return {
        passed: false,
        reason: `Job posted ${daysDifference} days ago, exceeds ${maxDays} day limit`
      };
    }

    return { passed: true };
  }

  filterByJobType(job: JobListing): FilterResult {
    if (job.jobType !== this.profile.jobType) {
      return {
        passed: false,
        reason: `Job type '${job.jobType}' does not match preference '${this.profile.jobType}'`
      };
    }

    return { passed: true };
  }

  filterByLocation(job: JobListing): FilterResult {
    const jobLocation = job.location.toLowerCase();
    const preference = this.profile.locationPreference.toLowerCase();

    // Check location compatibility
    switch (preference) {
      case 'remote':
        if (!jobLocation.includes('remote') && !jobLocation.includes('anywhere')) {
          return {
            passed: false,
            reason: `Job location '${job.location}' is not remote, but user prefers remote work`
          };
        }
        break;
      
      case 'onsite':
        if (jobLocation.includes('remote')) {
          return {
            passed: false,
            reason: `Job is remote but user prefers onsite work`
          };
        }
        break;
      
      case 'hybrid':
        // Hybrid is flexible, accept both remote and onsite
        break;
      
      case 'flexible':
        // Flexible accepts anything
        break;
      
      default:
        // If no clear preference, pass through
        break;
    }

    return { passed: true };
  }

  applyFilters(jobs: JobListing[]): {
    passed: JobListing[];
    eliminated: Array<{ job: JobListing; reason: string }>;
  } {
    const passed: JobListing[] = [];
    const eliminated: Array<{ job: JobListing; reason: string }> = [];

    for (const job of jobs) {
      // Apply age filter
      const ageResult = this.filterByAge(job);
      if (!ageResult.passed) {
        eliminated.push({ job, reason: ageResult.reason! });
        this.logElimination(job, ageResult.reason!);
        continue;
      }

      // Apply job type filter
      const jobTypeResult = this.filterByJobType(job);
      if (!jobTypeResult.passed) {
        eliminated.push({ job, reason: jobTypeResult.reason! });
        this.logElimination(job, jobTypeResult.reason!);
        continue;
      }

      // Apply location filter
      const locationResult = this.filterByLocation(job);
      if (!locationResult.passed) {
        eliminated.push({ job, reason: locationResult.reason! });
        this.logElimination(job, locationResult.reason!);
        continue;
      }

      // Job passed all filters
      passed.push(job);
    }

    // RECENCY-FIRST PRE-SORT: Sort by posting date (newest first) before scoring
    // This mimics how real job seekers prioritize fresh opportunities
    const sortedPassed = this.sortByRecency(passed);

    return { passed: sortedPassed, eliminated };
  }

  /**
   * Sort jobs by recency (newest first) - the key human-like behavior
   * Real job seekers apply to fresh roles first before they fill up
   */
  private sortByRecency(jobs: JobListing[]): JobListing[] {
    return jobs.sort((a, b) => {
      const dateA = new Date(a.postingDate).getTime();
      const dateB = new Date(b.postingDate).getTime();
      return dateB - dateA; // Newest first (descending)
    });
  }

  private logElimination(job: JobListing, reason: string): void {
    console.log(`[HardFilter] Eliminated job ${job.id} (${job.title} at ${job.company}): ${reason}`);
  }
}