import { UserProfile, JobListing, ApplicationResult } from '../types';

export class ApplicationExecutor {
  constructor(private tinyFishClient: any) {
    // TinyFishClient is kept for interface compatibility but not used
    // Applications are handled by TinyFish during the search phase
  }

  async applyToJob(job: JobListing, profile: UserProfile): Promise<ApplicationResult> {
    console.log(`📝 Recording application for ${job.title} at ${job.company}`);
    
    // Note: TinyFish already attempted to apply during searchJobs() via SSE
    // The job object contains applicationStatus and applicationReason from TinyFish
    const applicationStatus = (job as any).applicationStatus;
    const applicationReason = (job as any).applicationReason;

    console.log(`   Application status from TinyFish: ${applicationStatus}`);
    console.log(`   Reason: ${applicationReason || 'N/A'}`);

    if (applicationStatus === 'applied') {
      console.log(`✅ Application was successful`);
      return {
        jobId: job.id,
        success: true,
        timestamp: new Date()
      };
    } else {
      console.log(`❌ Application failed or was skipped`);
      return {
        jobId: job.id,
        success: false,
        timestamp: new Date(),
        error: applicationReason || 'Application failed during TinyFish automation'
      };
    }
  }
}