import { UserProfile, IntentAnalysis, ScoringWeights, LocationPreference } from '../types';

export class IntentEngine {
  analyzeIntent(profile: UserProfile): IntentAnalysis {
    const experienceLevel = this.inferExperienceLevel(profile.yearsExperience);
    const mobilityConstraints = this.inferMobilityConstraints(profile.locationPreference);
    const primaryGoals = this.inferPrimaryGoals(profile, experienceLevel);
    const scoringWeights = this.calculateScoringWeights(profile, experienceLevel);
    const reasoning = this.generateReasoning(profile, experienceLevel, mobilityConstraints, primaryGoals);

    return {
      reasoning,
      userContext: {
        experienceLevel,
        mobilityConstraints,
        primaryGoals
      },
      scoringWeights
    };
  }

  private inferExperienceLevel(yearsExperience: number): 'junior' | 'mid' | 'senior' {
    if (yearsExperience <= 2) {
      return 'junior';
    } else if (yearsExperience <= 5) {
      return 'mid';
    } else {
      return 'senior';
    }
  }

  private inferMobilityConstraints(locationPreference: LocationPreference): string {
    switch (locationPreference) {
      case LocationPreference.Remote:
        return 'Cannot relocate, requires fully remote work';
      case LocationPreference.OnSite:
        return 'Prefers in-person work environment';
      case LocationPreference.Hybrid:
        return 'Flexible with mix of remote and office work';
      case LocationPreference.Flexible:
        return 'Open to various work arrangements';
      default:
        return 'No specific mobility constraints identified';
    }
  }

  private inferPrimaryGoals(profile: UserProfile, experienceLevel: 'junior' | 'mid' | 'senior'): string[] {
    const goals: string[] = [];

    // Experience-based goals
    switch (experienceLevel) {
      case 'junior':
        goals.push('Gain experience and learn new skills');
        goals.push('Find mentorship opportunities');
        break;
      case 'mid':
        goals.push('Advance career and take on more responsibility');
        goals.push('Work with modern technologies');
        break;
      case 'senior':
        goals.push('Lead technical initiatives');
        goals.push('Mentor junior developers');
        break;
    }

    // Location-based goals
    if (profile.locationPreference === LocationPreference.Remote) {
      goals.push('Maintain work-life balance with remote work');
    }

    // Tech stack goals
    if (profile.primaryTechnology) {
      goals.push(`Specialize in ${profile.primaryTechnology} development`);
    }

    return goals;
  }

  private calculateScoringWeights(profile: UserProfile, experienceLevel: 'junior' | 'mid' | 'senior'): ScoringWeights {
    // Define concrete weight presets for different user profiles
    const presets = this.getWeightPresets();
    
    // Select preset based on experience level and location preference
    let selectedPreset: ScoringWeights;
    
    if (experienceLevel === 'junior' && profile.locationPreference === LocationPreference.Remote) {
      selectedPreset = presets.juniorRemote;
    } else if (experienceLevel === 'senior' && profile.locationPreference === LocationPreference.OnSite) {
      selectedPreset = presets.seniorOnsite;
    } else if (experienceLevel === 'junior') {
      selectedPreset = presets.juniorRemote; // Default junior to remote-friendly weights
    } else if (experienceLevel === 'senior') {
      selectedPreset = presets.seniorOnsite; // Default senior to experience-focused weights
    } else {
      // Mid-level gets balanced weights
      selectedPreset = presets.balanced;
    }

    return selectedPreset;
  }

  /**
   * Concrete weight presets that make the Intent Engine genuinely smart
   * These presets capture real human job-seeking behavior patterns
   */
  private getWeightPresets(): {
    juniorRemote: ScoringWeights;
    seniorOnsite: ScoringWeights;
    balanced: ScoringWeights;
  } {
    return {
      // Junior Remote: Prioritizes fresh opportunities and tech stack match
      // "I need to apply fast to entry-level remote roles before they fill up"
      juniorRemote: {
        recency: 18,        // 35% - Apply to fresh roles first
        stackMatch: 15,     // 30% - Tech stack alignment crucial for juniors
        experienceFit: 10,  // 20% - Less emphasis since they're flexible
        location: 8,        // 15% - Remote is important but not everything
        resumeSimilarity: 0 // Disabled for juniors (less relevant)
      },

      // Senior Onsite: Prioritizes experience match and resume fit
      // "I want roles that match my expertise and leadership experience"
      seniorOnsite: {
        recency: 10,        // 20% - Less urgency, quality over speed
        stackMatch: 20,     // 40% - Deep technical expertise match
        experienceFit: 15,  // 30% - Experience level crucial
        location: 5,        // 10% - Location less critical for seniors
        resumeSimilarity: 0 // Disabled for now (would be 25% in full implementation)
      },

      // Balanced: For mid-level or mixed preferences
      balanced: {
        recency: 15,        // 25%
        stackMatch: 18,     // 30%
        experienceFit: 12,  // 20%
        location: 10,       // 15%
        resumeSimilarity: 0 // 10% (reduced for now)
      }
    };
  }

  private generateReasoning(
    profile: UserProfile, 
    experienceLevel: 'junior' | 'mid' | 'senior',
    mobilityConstraints: string,
    primaryGoals: string[]
  ): string {
    const techStackStr = profile.techStack.join(', ');
    const primaryTech = profile.primaryTechnology || profile.techStack[0];

    let reasoning = `I see you have ${profile.yearsExperience} ${profile.yearsExperience === 1 ? 'year' : 'years'} of experience with ${techStackStr}, which makes you a ${experienceLevel}-level developer. `;

    // Add location reasoning
    switch (profile.locationPreference) {
      case LocationPreference.Remote:
        reasoning += `Since you prefer remote work, I'm prioritizing jobs posted in the last 6 hours and filtering out roles that require onsite presence. `;
        break;
      case LocationPreference.OnSite:
        reasoning += `Since you prefer onsite work, I'm focusing on local opportunities and filtering out fully remote positions. `;
        break;
      case LocationPreference.Hybrid:
        reasoning += `Since you're open to hybrid work, I'm including both remote and onsite opportunities. `;
        break;
    }

    // Add experience-level reasoning
    switch (experienceLevel) {
      case 'junior':
        reasoning += `As a junior developer, I'm prioritizing roles that match your ${primaryTech} skills and filtering out positions requiring 3+ years of experience. `;
        break;
      case 'mid':
        reasoning += `With your mid-level experience, I'm looking for roles that offer growth opportunities while matching your technical background. `;
        break;
      case 'senior':
        reasoning += `As a senior developer, I'm focusing on leadership roles and positions that leverage your extensive experience. `;
        break;
    }

    reasoning += `I'll weight the scoring to emphasize ${this.getTopPriorities(profile, experienceLevel).join(' and ')}.`;

    return reasoning;
  }

  private getTopPriorities(profile: UserProfile, experienceLevel: 'junior' | 'mid' | 'senior'): string[] {
    const priorities: string[] = [];

    if (profile.locationPreference === LocationPreference.Remote) {
      priorities.push('remote-friendly positions');
    }

    switch (experienceLevel) {
      case 'junior':
        priorities.push('technology stack alignment');
        break;
      case 'senior':
        priorities.push('resume similarity and experience match');
        break;
      default:
        priorities.push('overall job fit');
    }

    return priorities;
  }
}