import { JobListing as IJobListing, JobType, ExperienceRange } from '../types';

export class JobListing implements IJobListing {
  id: string;
  title: string;
  company: string;
  postingDate: Date;
  location: string;
  jobType: JobType;
  requiredExperience: ExperienceRange;
  techStack: string[];
  description: string;
  applyUrl: string;

  constructor(data: IJobListing) {
    this.id = data.id;
    this.title = data.title;
    this.company = data.company;
    this.postingDate = new Date(data.postingDate);
    this.location = data.location;
    this.jobType = data.jobType;
    this.requiredExperience = data.requiredExperience;
    this.techStack = data.techStack;
    this.description = data.description;
    this.applyUrl = data.applyUrl;
  }

  static fromJSON(json: string): JobListing {
    const data = JSON.parse(json);
    return new JobListing(data);
  }

  toJSON(): string {
    return JSON.stringify({
      id: this.id,
      title: this.title,
      company: this.company,
      postingDate: this.postingDate.toISOString(),
      location: this.location,
      jobType: this.jobType,
      requiredExperience: this.requiredExperience,
      techStack: this.techStack,
      description: this.description,
      applyUrl: this.applyUrl,
    });
  }
}