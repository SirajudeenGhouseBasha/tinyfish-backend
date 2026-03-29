import { UserProfile, SearchStrategy, SearchFilters, JobType, LocationPreference } from '../types';

export class SearchPlanner {
  planStrategy(profile: UserProfile): SearchStrategy {
    const keywords = this.generateKeywords(profile);
    const jobBoards = this.selectJobBoards(profile);
    const filters = this.configureFilters(profile);

    return {
      jobBoards,
      keywords,
      filters
    };
  }

  private generateKeywords(profile: UserProfile): string[] {
    const keywords: string[] = [];

    // Role first
    keywords.push(profile.role);

    // Primary technology only (not the whole stack — too many = 0 results)
    if (profile.primaryTechnology) {
      keywords.push(profile.primaryTechnology);
    }

    // Experience level keywords
    const experienceKeywords = this.getExperienceKeywords(profile.yearsExperience);
    keywords.push(...experienceKeywords);

    return [...new Set(keywords)];
  }

  private getRoleVariations(role: string): string[] {
    const roleLower = role.toLowerCase();
    const variations: string[] = [];

    // Common role variations
    const roleMap: { [key: string]: string[] } = {
      'software engineer': ['developer', 'programmer', 'software developer', 'engineer'],
      'frontend developer': ['front-end developer', 'ui developer', 'web developer'],
      'backend developer': ['back-end developer', 'server developer', 'api developer'],
      'fullstack developer': ['full-stack developer', 'full stack engineer'],
      'data scientist': ['data analyst', 'machine learning engineer', 'ai engineer'],
      'devops engineer': ['site reliability engineer', 'infrastructure engineer', 'cloud engineer'],
      'product manager': ['product owner', 'pm', 'product lead'],
      'designer': ['ui designer', 'ux designer', 'product designer']
    };

    // Find matching variations
    for (const [key, values] of Object.entries(roleMap)) {
      if (roleLower.includes(key) || key.includes(roleLower)) {
        variations.push(...values);
      }
    }

    return variations;
  }

  private getExperienceKeywords(yearsExperience: number): string[] {
    if (yearsExperience <= 2) {
      return ['junior', 'entry level', 'associate', 'graduate'];
    } else if (yearsExperience <= 5) {
      return ['mid level', 'intermediate', 'experienced'];
    } else {
      return ['senior', 'lead', 'principal', 'staff'];
    }
  }

  private selectJobBoards(profile: UserProfile): string[] {
    const jobBoards: string[] = [];

    // Always include Internshala as primary job board (no 2FA required)
    jobBoards.push('internshala.com');

    // Add other major job boards
    jobBoards.push('indeed.com', 'glassdoor.com');

    // Add tech-specific boards
    const techBoards = ['stackoverflow.com/jobs', 'github.com/jobs', 'angel.co'];
    jobBoards.push(...techBoards);

    // Add remote-specific boards if user prefers remote
    if (profile.locationPreference === LocationPreference.Remote) {
      const remoteBoards = ['remote.co', 'weworkremotely.com', 'remoteok.io', 'flexjobs.com'];
      jobBoards.push(...remoteBoards);
    }

    // Add role-specific boards
    const roleSpecificBoards = this.getRoleSpecificBoards(profile.role);
    jobBoards.push(...roleSpecificBoards);

    return [...new Set(jobBoards)]; // Remove duplicates
  }

  private getRoleSpecificBoards(role: string): string[] {
    const roleLower = role.toLowerCase();
    const boards: string[] = [];

    if (roleLower.includes('designer')) {
      boards.push('dribbble.com/jobs', 'behance.net/jobboard');
    }

    if (roleLower.includes('data') || roleLower.includes('scientist') || roleLower.includes('analyst')) {
      boards.push('kaggle.com/jobs', 'towardsdatascience.com/jobs');
    }

    if (roleLower.includes('devops') || roleLower.includes('cloud')) {
      boards.push('devopsjobs.com', 'cloudjobs.com');
    }

    if (roleLower.includes('product')) {
      boards.push('productmanagerjobs.com', 'mindtheproduct.com/jobs');
    }

    return boards;
  }

  private configureFilters(profile: UserProfile): SearchFilters {
    const filters: SearchFilters = {
      jobType: profile.jobType,
      postedWithin: profile.postingAgeWindow
    };

    // If user provided specific locations, use them; otherwise fall back to preference
    if (profile.locations?.length) {
      filters.locations = profile.locations;
    } else {
      switch (profile.locationPreference) {
        case LocationPreference.Remote:
          filters.locations = ['Remote'];
          break;
        case LocationPreference.Hybrid:
          filters.locations = ['Hybrid'];
          break;
        case LocationPreference.OnSite:
        case LocationPreference.Flexible:
          // No location filter — open to anything
          break;
      }
    }

    filters.experienceLevel = this.getExperienceLevelFilter(profile.yearsExperience);

    return filters;
  }

  private getExperienceLevelFilter(yearsExperience: number): string {
    // For Internshala, always use entry-level for 0-3 years to access fresher job categories
    if (yearsExperience <= 3) {
      return 'entry-level';
    } else if (yearsExperience <= 5) {
      return 'mid-level';
    } else {
      return 'senior-level';
    }
  }
}