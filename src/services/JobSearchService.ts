import { ProfileService } from './ProfileService';
import { JobAgentOrchestrator } from '../utils/JobAgentOrchestrator';
import { ExcelReportGenerator } from '../utils/ExcelReportGenerator';
import { WebSocketService } from './WebSocketService';
import pool from '../config/database';

export class JobSearchService {
  private profileService: ProfileService;
  private orchestrator: JobAgentOrchestrator;
  private reportGenerator: ExcelReportGenerator;
  private wsService?: WebSocketService;

  constructor(wsService?: WebSocketService) {
    this.profileService = new ProfileService();
    this.orchestrator = new JobAgentOrchestrator();
    this.reportGenerator = new ExcelReportGenerator();
    this.wsService = wsService;
  }

  async startJobSearch(sessionId: string): Promise<{ sessionId: string; status: string }> {
    console.log('JobSearchService - startJobSearch called with sessionId:', sessionId);

    // Get user profile
    const profile = await this.profileService.getProfile(sessionId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    console.log('JobSearchService - profile retrieved:', profile.role);

    // Create job search session record
    const query = `
      INSERT INTO job_search_sessions (session_id, status, started_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (session_id) 
      DO UPDATE SET status = $2, started_at = NOW()
    `;

    await pool.query(query, [sessionId, 'running']);
    console.log('JobSearchService - session record created');

    // Register orchestrator with WebSocket service for real-time updates
    if (this.wsService) {
      console.log('JobSearchService - registering orchestrator with WebSocket');
      this.wsService.registerOrchestrator(sessionId, this.orchestrator);
    } else {
      console.warn('JobSearchService - WebSocket service not available');
    }

    // Start job search asynchronously
    console.log('JobSearchService - starting orchestrator.executeJobSearch');
    await this.orchestrator.executeJobSearch(profile, sessionId);

    console.log('JobSearchService - returning response');
    return { sessionId, status: 'running' };
  }

  async getJobSearchStatus(sessionId: string): Promise<any> {
    const query = `
      SELECT * FROM job_search_sessions WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async generateReport(sessionId: string): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  } | null> {
    try {
      // Check if session exists and is completed
      const sessionStatus = await this.getJobSearchStatus(sessionId);
      if (!sessionStatus) {
        return null;
      }

      // Get the application tracker from the orchestrator
      const applicationTracker = this.orchestrator.getApplicationTracker();
      const sessionReport = applicationTracker.generateReport();

      // Generate Excel report
      const buffer = await this.reportGenerator.generateExcelReport(sessionReport, sessionId);
      const filename = this.reportGenerator.getReportFilename(sessionId);
      const mimeType = this.reportGenerator.getReportMimeType();

      return {
        buffer,
        filename,
        mimeType
      };
    } catch (error) {
      console.error('Report generation error:', error);
      return null;
    }
  }
}