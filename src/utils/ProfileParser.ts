import { UserProfile, UserProfileInput, ValidationError, Result } from '../types';
import { userProfileInputSchema } from '../schemas';

export class ProfileParser {
  parseFormData(data: UserProfileInput): Result<UserProfile, ValidationError[]> {
    // Validate using Joi schema
    const { error, value } = userProfileInputSchema.validate(data);
    
    if (error) {
      const validationErrors: ValidationError[] = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return {
        success: false,
        error: validationErrors
      };
    }

    // Create UserProfile object
    const profile: UserProfile = {
      role: value.role,
      techStack: value.techStack,
      primaryTechnology: value.techStack[0], // Set first tech as primary if not specified
      yearsExperience: value.yearsExperience,
      locationPreference: value.locationPreference,
      jobType: value.jobType,
      resumePath: '', // Will be set after file upload
      postingAgeWindow: value.postingAgeWindow || 7
    };

    return {
      success: true,
      value: profile
    };
  }

  validate(profile: UserProfile): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required field validations
    if (!profile.role || profile.role.trim().length === 0) {
      errors.push({ field: 'role', message: 'Role is required' });
    }

    if (!profile.techStack || profile.techStack.length === 0) {
      errors.push({ field: 'techStack', message: 'At least one technology is required' });
    }

    if (profile.yearsExperience < 0 || profile.yearsExperience > 50) {
      errors.push({ field: 'yearsExperience', message: 'Years of experience must be between 0 and 50' });
    }

    if (!profile.locationPreference) {
      errors.push({ field: 'locationPreference', message: 'Location preference is required' });
    }

    if (!profile.jobType) {
      errors.push({ field: 'jobType', message: 'Job type is required' });
    }

    if (!profile.resumePath || profile.resumePath.trim().length === 0) {
      errors.push({ field: 'resumePath', message: 'Resume file is required' });
    }

    if (profile.postingAgeWindow <= 0 || profile.postingAgeWindow > 30) {
      errors.push({ field: 'postingAgeWindow', message: 'Posting age window must be between 1 and 30 days' });
    }

    return errors;
  }
}