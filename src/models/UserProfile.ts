import { UserProfile as IUserProfile, LocationPreference, JobType } from '../types';

export class UserProfile implements IUserProfile {
  role: string;
  techStack: string[];
  primaryTechnology?: string;
  yearsExperience: number;
  locationPreference: LocationPreference;
  locations?: string[];
  jobType: JobType;
  resumePath: string;
  postingAgeWindow: number;

  constructor(data: IUserProfile) {
    this.role = data.role;
    this.techStack = data.techStack;
    this.primaryTechnology = data.primaryTechnology;
    this.yearsExperience = data.yearsExperience;
    this.locationPreference = data.locationPreference;
    this.locations = data.locations;
    this.jobType = data.jobType;
    this.resumePath = data.resumePath;
    this.postingAgeWindow = data.postingAgeWindow || 7;
  }

  static fromJSON(json: string): UserProfile {
    const data = JSON.parse(json);
    return new UserProfile(data);
  }

  toJSON(): string {
    return JSON.stringify({
      role: this.role,
      techStack: this.techStack,
      primaryTechnology: this.primaryTechnology,
      yearsExperience: this.yearsExperience,
      locationPreference: this.locationPreference,
      jobType: this.jobType,
      resumePath: this.resumePath,
      postingAgeWindow: this.postingAgeWindow,
    });
  }
}