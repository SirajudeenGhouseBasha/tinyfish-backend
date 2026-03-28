import Joi from 'joi';
import { LocationPreference, JobType } from '../types';

export const userProfileSchema = Joi.object({
  role: Joi.string().required().min(1).max(100),
  techStack: Joi.array().items(Joi.string()).min(1).required(),
  primaryTechnology: Joi.string().optional(),
  yearsExperience: Joi.number().min(0).max(50).required(), // Allow decimal numbers
  locationPreference: Joi.string().valid(...Object.values(LocationPreference)).required(),
  locations: Joi.array().items(Joi.string()).optional(), // array of cities
  jobType: Joi.string().valid(...Object.values(JobType)).required(),
  resume: Joi.any().required(),
  postingAgeWindow: Joi.number().integer().min(1).max(30).optional().default(7),
});

export const userProfileInputSchema = Joi.object({
  role: Joi.string().required().min(1).max(100),
  techStack: Joi.array().items(Joi.string()).min(1).required(),
  primaryTechnology: Joi.string().optional().allow(''),
  yearsExperience: Joi.number().min(0).max(50).required(), // Allow decimal numbers
  locationPreference: Joi.string().valid(...Object.values(LocationPreference)).required(),
  locations: Joi.array().items(Joi.string()).optional(), // array of cities
  jobType: Joi.string().valid(...Object.values(JobType)).required(),
  postingAgeWindow: Joi.number().integer().min(1).max(30).optional(),
  // Contact information (optional)
  firstName: Joi.string().optional().allow(''),
  lastName: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow(''),
});