import { Request, Response } from 'express';
import { JobSearchService } from '../services/JobSearchService';

export class JobSearchController {
  private jobSearchService: JobSearchService;

  constructor(wsService?: any) {
    this.jobSearchService = new JobSearchService(wsService);
  }

  async startJobSearch(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
        return;
      }

      const result = await this.jobSearchService.startJobSearch(sessionId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Job search error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getJobSearchStatus(req: Request, res: Response): Promise<void> {
    try {
      const rawSessionId = req.params.sessionId;

      const sessionId = Array.isArray(rawSessionId)
        ? rawSessionId[0]
        : rawSessionId;
      const status = await this.jobSearchService.getJobSearchStatus(sessionId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Job search session not found'
        });
        return;
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Job search status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const rawSessionId = req.params.sessionId;
      const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

      const reportData = await this.jobSearchService.generateReport(sessionId);

      if (!reportData) {
        res.status(404).json({
          success: false,
          error: 'Report not found for this session'
        });
        return;
      }

      // Set headers for file download
      res.setHeader('Content-Type', reportData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${reportData.filename}"`);
      
      // Send the file buffer
      res.send(reportData.buffer);
    } catch (error) {
      console.error('Report download error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}