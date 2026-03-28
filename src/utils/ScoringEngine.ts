import { JobListing, UserProfile, ScoredJob, StackMatch, SimilarityResult, ScoringWeights, LocationPreference, JobScoreBreakdown } from '../types';

export class ScoringEngine {
  constructor(
    private profile: UserProfile,
    private weights: ScoringWeights
  ) {}

  scoreRecency(job: JobListing): number {
    const now = new Date();
    const postingDate = new Date(job.postingDate);
    const hoursDifference = Math.floor((now.getTime() - postingDate.getTime()) / (1000 * 60 * 60));
    const daysDifference = Math.floor(hoursDifference / 24);

    // Granular time windows
    if (hoursDifference <= 24) {
      // Within hours (same day)
      return 20;
    } else if (daysDifference <= 1) {
      // Posted today
      return 15;
    } else if (daysDifference <= 7) {
      // Posted this week
      return 10;
    } else {
      // Older than a week
      return 5;
    }
  }

  scoreStackMatch(job: JobListing, stackMatch: StackMatch): number {
    const matchPercentage = stackMatch.matchPercentage;
    
    // Base score from match percentage
    let score = (matchPercentage / 100) * 25;

    // Bonus for primary technology match
    if (this.profile.primaryTechnology) {
      const hasPrimaryTech = job.techStack.some(tech => 
        tech.toLowerCase().includes(this.profile.primaryTechnology!.toLowerCase()) ||
        this.profile.primaryTechnology!.toLowerCase().includes(tech.toLowerCase())
      );
      
      if (hasPrimaryTech) {
        score = Math.min(score + 5, 25); // Bonus but cap at 25
      }
    }

    return Math.round(score * 100) / 100;
  }

  scoreExperienceFit(job: JobListing): number {
    const userExperience = this.profile.yearsExperience;
    const requiredMin = job.requiredExperience.min;
    const requiredMax = job.requiredExperience.max;

    // Perfect fit: user experience is within the required range
    if (userExperience >= requiredMin && userExperience <= requiredMax) {
      return 20;
    }

    // Calculate distance from the range
    let distance: number;
    if (userExperience < requiredMin) {
      distance = requiredMin - userExperience;
    } else {
      distance = userExperience - requiredMax;
    }

    // Penalize based on distance, but don't go below 0
    const penalty = distance * 3; // 3 points per year of mismatch
    const score = Math.max(0, 20 - penalty);

    return Math.round(score * 100) / 100;
  }

  scoreLocation(job: JobListing): number {
    const jobLocation = job.location.toLowerCase();
    const preference = this.profile.locationPreference;

    switch (preference) {
      case LocationPreference.Remote:
        if (jobLocation.includes('remote') || jobLocation.includes('anywhere')) {
          return 15; // Perfect match
        } else if (jobLocation.includes('hybrid')) {
          return 10; // Partial match
        } else {
          return 0; // No match
        }

      case LocationPreference.OnSite:
        if (jobLocation.includes('remote')) {
          return 0; // No match
        } else if (jobLocation.includes('hybrid')) {
          return 10; // Partial match
        } else {
          return 15; // Assume onsite
        }

      case LocationPreference.Hybrid:
        if (jobLocation.includes('hybrid')) {
          return 15; // Perfect match
        } else if (jobLocation.includes('remote') || !jobLocation.includes('remote')) {
          return 12; // Good match (flexible)
        } else {
          return 8; // Acceptable
        }

      case LocationPreference.Flexible:
        return 15; // Always perfect match for flexible users

      default:
        return 10; // Default score
    }
  }

  scoreJob(
    job: JobListing, 
    stackMatch: StackMatch,
    resumeSimilarity: SimilarityResult
  ): ScoredJob {
    const scores = {
      recency: this.scoreRecency(job),
      stackMatch: this.scoreStackMatch(job, stackMatch),
      experienceFit: this.scoreExperienceFit(job),
      location: this.scoreLocation(job),
      resumeSimilarity: resumeSimilarity.score
    };

    // Apply custom weights from Intent Engine
    const weightedScores = {
      recency: (scores.recency / 20) * this.weights.recency,
      stackMatch: (scores.stackMatch / 25) * this.weights.stackMatch,
      experienceFit: (scores.experienceFit / 20) * this.weights.experienceFit,
      location: (scores.location / 15) * this.weights.location,
      resumeSimilarity: (scores.resumeSimilarity / 25) * this.weights.resumeSimilarity
    };

    const totalScore = Object.values(weightedScores).reduce((sum, score) => sum + score, 0);
    const qualifies = totalScore >= 50; // Temporarily lowered from 75 for testing

    return {
      job,
      scores: {
        recency: Math.round(weightedScores.recency * 100) / 100,
        stackMatch: Math.round(weightedScores.stackMatch * 100) / 100,
        experienceFit: Math.round(weightedScores.experienceFit * 100) / 100,
        location: Math.round(weightedScores.location * 100) / 100,
        resumeSimilarity: Math.round(weightedScores.resumeSimilarity * 100) / 100
      },
      totalScore: Math.round(totalScore * 100) / 100,
      qualifies
    };
  }

  /**
   * Generate detailed score breakdown for UI display (Demo Wow Moment)
   * Shows exactly why each job scored what it did
   */
  generateScoreBreakdown(scoredJob: ScoredJob, stackMatch: StackMatch): JobScoreBreakdown {
    const job = scoredJob.job;
    const scores = scoredJob.scores;
    
    // Calculate percentages for visual display
    const breakdown = {
      tech: {
        score: scores.stackMatch,
        max: this.weights.stackMatch,
        percentage: Math.round((scores.stackMatch / this.weights.stackMatch) * 100)
      },
      recency: {
        score: scores.recency,
        max: this.weights.recency,
        percentage: Math.round((scores.recency / this.weights.recency) * 100)
      },
      experience: {
        score: scores.experienceFit,
        max: this.weights.experienceFit,
        percentage: Math.round((scores.experienceFit / this.weights.experienceFit) * 100)
      },
      location: {
        score: scores.location,
        max: this.weights.location,
        percentage: Math.round((scores.location / this.weights.location) * 100)
      },
      resumeFit: {
        score: scores.resumeSimilarity,
        max: this.weights.resumeSimilarity,
        percentage: Math.round((scores.resumeSimilarity / this.weights.resumeSimilarity) * 100)
      }
    };

    // Generate human-readable reasoning
    const reasoning = this.generateScoreReasoning(job, scores, stackMatch);

    return {
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      totalScore: scoredJob.totalScore,
      qualifies: scoredJob.qualifies,
      breakdown,
      reasoning
    };
  }

  private generateScoreReasoning(job: JobListing, scores: any, stackMatch: StackMatch): string {
    const reasons: string[] = [];

    // Recency reasoning
    const hoursAgo = Math.floor((new Date().getTime() - new Date(job.postingDate).getTime()) / (1000 * 60 * 60));
    if (hoursAgo < 24) {
      reasons.push(`Posted ${hoursAgo}h ago (fresh opportunity)`);
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      reasons.push(`Posted ${daysAgo}d ago`);
    }

    // Tech stack reasoning
    if (stackMatch.matchPercentage > 80) {
      reasons.push(`Strong tech match (${Math.round(stackMatch.matchPercentage)}%)`);
    } else if (stackMatch.matchPercentage > 50) {
      reasons.push(`Good tech match (${Math.round(stackMatch.matchPercentage)}%)`);
    } else {
      reasons.push(`Limited tech match (${Math.round(stackMatch.matchPercentage)}%)`);
    }

    // Experience reasoning
    const userExp = this.profile.yearsExperience;
    const reqMin = job.requiredExperience.min;
    const reqMax = job.requiredExperience.max;
    
    if (userExp >= reqMin && userExp <= reqMax) {
      reasons.push(`Perfect experience fit (${userExp}y in ${reqMin}-${reqMax}y range)`);
    } else if (userExp < reqMin) {
      reasons.push(`Below experience requirement (${userExp}y < ${reqMin}y)`);
    } else {
      reasons.push(`Above experience requirement (${userExp}y > ${reqMax}y)`);
    }

    return reasons.join(' • ');
  }

  scoreJobs(
    stackMatches: StackMatch[],
    resumeSimilarities: Map<string, SimilarityResult>
  ): ScoredJob[] {
    const scoredJobs: ScoredJob[] = [];

    for (const stackMatch of stackMatches) {
      const resumeSimilarity = resumeSimilarities.get(stackMatch.job.id) || {
        score: 0,
        similarity: 0
      };

      const scoredJob = this.scoreJob(stackMatch.job, stackMatch, resumeSimilarity);
      scoredJobs.push(scoredJob);
    }

    // Sort by total score (descending)
    return scoredJobs.sort((a, b) => b.totalScore - a.totalScore);
  }
}