import { ApplicationRecord, ApplicationStatus, SessionReport } from '../types';

export class ApplicationTracker {
  private applications: Map<string, ApplicationRecord> = new Map();
  private maxRetries = 3;

  recordApplication(record: ApplicationRecord): void {
    this.applications.set(record.jobId, record);
  }

  shouldRetry(jobId: string, error: string): boolean {
    const record = this.applications.get(jobId);
    if (!record) {
      return false;
    }

    // Don't retry if already at max attempts
    if (record.attempts >= this.maxRetries) {
      return false;
    }

    // Don't retry permanent errors
    if (this.isPermanentError(error)) {
      return false;
    }

    // Retry transient errors
    return this.isTransientError(error);
  }

  private isPermanentError(error: string): boolean {
    const permanentErrorPatterns = [
      'job no longer available',
      'position closed',
      'application deadline passed',
      'invalid credentials',
      'account suspended',
      'unauthorized access',
      'forbidden',
      'not found',
      '404',
      '403',
      '401'
    ];

    const errorLower = error.toLowerCase();
    return permanentErrorPatterns.some(pattern => errorLower.includes(pattern));
  }

  private isTransientError(error: string): boolean {
    const transientErrorPatterns = [
      'network error',
      'timeout',
      'connection refused',
      'server error',
      'service unavailable',
      'rate limit',
      'too many requests',
      'temporary failure',
      '500',
      '502',
      '503',
      '504',
      '429'
    ];

    const errorLower = error.toLowerCase();
    return transientErrorPatterns.some(pattern => errorLower.includes(pattern));
  }

  incrementAttempts(jobId: string): void {
    const record = this.applications.get(jobId);
    if (record) {
      record.attempts += 1;
      record.timestamp = new Date();
      this.applications.set(jobId, record);
    }
  }

  updateStatus(jobId: string, status: ApplicationStatus, error?: string): void {
    const record = this.applications.get(jobId);
    if (record) {
      record.status = status;
      record.timestamp = new Date();
      if (error) {
        record.error = error;
      }
      this.applications.set(jobId, record);
    }
  }

  getFailedApplications(): ApplicationRecord[] {
    return Array.from(this.applications.values())
      .filter(record => record.status === ApplicationStatus.Failed);
  }

  getSuccessfulApplications(): ApplicationRecord[] {
    return Array.from(this.applications.values())
      .filter(record => record.status === ApplicationStatus.Success);
  }

  getAllApplications(): ApplicationRecord[] {
    return Array.from(this.applications.values());
  }

  generateReport(): SessionReport {
    const applications = this.getAllApplications();
    const successful = this.getSuccessfulApplications();
    const failed = this.getFailedApplications();

    // Calculate summary statistics
    const totalScanned = applications.length;
    const applied = successful.length;
    const failedCount = failed.length;
    
    // For this implementation, we'll assume all applications were scored
    // In the full pipeline, this would come from the orchestrator
    const scored = totalScanned;
    const eliminated = 0; // This would be calculated from the filtering stages

    return {
      summary: {
        totalScanned,
        eliminated,
        scored,
        applied,
        failed: failedCount
      },
      applications
    };
  }

  getApplicationsByStatus(status: ApplicationStatus): ApplicationRecord[] {
    return Array.from(this.applications.values())
      .filter(record => record.status === status);
  }

  getApplicationAttempts(jobId: string): number {
    const record = this.applications.get(jobId);
    return record ? record.attempts : 0;
  }

  hasApplication(jobId: string): boolean {
    return this.applications.has(jobId);
  }

  clear(): void {
    this.applications.clear();
  }

  getStats() {
    const applications = this.getAllApplications();
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<ApplicationStatus, number>);

    return {
      total: applications.length,
      byStatus: statusCounts,
      averageAttempts: applications.length > 0 
        ? applications.reduce((sum, app) => sum + app.attempts, 0) / applications.length 
        : 0
    };
  }
}