/**
 * Shared type definitions for the Intelligent Job Agent
 * This file contains all core data models, enums, and interfaces used across the application
 */

// ============================================================================
// Enums
// ============================================================================

export enum LocationPreference {
  Remote = 'remote',
  Hybrid = 'hybrid',
  OnSite = 'onsite',
  Flexible = 'flexible'
}

export enum JobType {
  FullTime = 'full-time',
  PartTime = 'part-time',
  Contract = 'contract',
  Internship = 'internship'
}

export enum ApplicationStatus {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
  Retrying = 'retrying'
}

export enum PipelineStage {
  SearchPlanning = 'search-planning',
  Scraping = 'scraping',
  HardFilter = 'hard-filter',
  StackSorting = 'stack-sorting',
  Scoring = 'scoring',
  Application = 'application',
  Retry = 'retry',
  ReportGeneration = 'report-generation'
}

export enum LogLevel {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error'
}

// ============================================================================
// Core Data Models
// ============================================================================

export interface UserProfile {
  role: string;
  techStack: string[];
  primaryTechnology?: string;
  yearsExperience: number;
  locationPreference: LocationPreference;
  locations?: string[]; // e.g. ["Hyderabad", "Bangalore", "Remote"]
  jobType: JobType;
  resumePath: string;
  postingAgeWindow: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface ExperienceRange {
  min: number;
  max: number;
}

export interface JobListing {
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
}

// ============================================================================
// Result Types
// ============================================================================

export type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

export interface ParseError {
  field: string;
  message: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface FilterResult {
  passed: boolean;
  reason?: string;
}

export interface StackMatch {
  job: JobListing;
  matchPercentage: number;
  matchingTechnologies: string[];
}

export interface ScoredJob {
  job: JobListing;
  scores: {
    recency: number;      // 0-20
    stackMatch: number;   // 0-25
    experienceFit: number; // 0-20
    location: number;     // 0-15
    resumeSimilarity: number; // 0-25
  };
  totalScore: number;     // 0-105
  qualifies: boolean;     // totalScore >= 50
}

// ============================================================================
// Application Types
// ============================================================================

export interface ApplicationResult {
  jobId: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export interface ApplicationRecord {
  jobId: string;
  jobTitle: string;
  company: string;
  score: number;
  status: ApplicationStatus;
  attempts: number;
  timestamp: Date;
  error?: string;
}

// ============================================================================
// Logging and Stats Types
// ============================================================================

export interface LogEntry {
  timestamp: Date;
  stage: PipelineStage;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
}

export interface PipelineStats {
  totalScanned: number;
  eliminatedStage1: number;
  eliminatedByReason: Record<string, number>;
  rankedStage2: number;
  scoredStage3: number;
  qualified: number;
  applied: number;
  failed: number;
}

// ============================================================================
// Report Types
// ============================================================================

export interface SessionReport {
  summary: {
    totalScanned: number;
    eliminated: number;
    scored: number;
    applied: number;
    failed: number;
  };
  applications: ApplicationRecord[];
}

// ============================================================================
// Search Strategy Types
// ============================================================================

export interface SearchFilters {
  locations?: string[]; // array of locations for LinkedIn multi-location search
  jobType?: JobType;
  experienceLevel?: string;
  postedWithin?: number; // days
}

export interface SearchStrategy {
  jobBoards: string[];  
  keywords: string[];
  filters: SearchFilters;
}

// ============================================================================
// Frontend Input Types
// ============================================================================

export interface UserProfileInput {
  role: string;
  techStack: string[];
  primaryTechnology?: string;
  yearsExperience: number;
  locationPreference: LocationPreference;
  locations?: string[]; // e.g. ["Hyderabad", "Bangalore", "Remote"]
  jobType: JobType;
  postingAgeWindow?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}


// ============================================================================
// Intent Analysis Types
// ============================================================================

export interface IntentAnalysis {
  reasoning: string; // Natural language explanation of inferred intent
  userContext: {
    experienceLevel: 'junior' | 'mid' | 'senior';
    mobilityConstraints: string;
    primaryGoals: string[];
  };
  scoringWeights: ScoringWeights;
}

export interface ScoringWeights {
  recency: number;      // 0-20
  stackMatch: number;   // 0-25
  experienceFit: number; // 0-20
  location: number;     // 0-15
  resumeSimilarity: number; // 0-25
}

// ============================================================================
// Resume Similarity Types
// ============================================================================

export interface SimilarityResult {
  score: number; // 0-25 points
  similarity: number; // 0-1 raw cosine similarity
}

// ============================================================================
// UI Score Breakdown Types (Demo Wow Moment)
// ============================================================================

export interface JobScoreBreakdown {
  jobId: string;
  jobTitle: string;
  company: string;
  totalScore: number;
  qualifies: boolean;
  breakdown: {
    tech: { score: number; max: number; percentage: number };
    recency: { score: number; max: number; percentage: number };
    experience: { score: number; max: number; percentage: number };
    location: { score: number; max: number; percentage: number };
    resumeFit: { score: number; max: number; percentage: number };
  };
  reasoning: string; // Why this job scored what it did
}

// ============================================================================
// TinyFish SSE API Types
// ============================================================================

export interface TinyFishEvent {
  type: 'STARTED' | 'STREAMING_URL' | 'PROGRESS' | 'COMPLETE' | 'HEARTBEAT' | 'ERROR';
  run_id?: string;
  streaming_url?: string;
  purpose?: string;
  status?: 'COMPLETED' | 'FAILED' | string;
  result?: ApplicationSummary;
  timestamp?: string;
  error?: string;
}

export interface AppliedJob {
  title: string;
  company: string;
  url?: string;
  timestamp?: string;
}

export interface SkippedJob {
  title: string;
  company: string;
  reason: string;
}

export interface FailedJob {
  title: string;
  company: string;
  error: string;
}

export interface ApplicationSummary {
  applied: AppliedJob[];
  skipped: SkippedJob[];
  failed: FailedJob[];
}

export interface ProgressEntry {
  purpose: string;
  timestamp: string;
}
