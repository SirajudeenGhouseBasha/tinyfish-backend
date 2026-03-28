import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import { userProfileInputSchema } from '../schemas';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = userProfileInputSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
        return;
      }

      // Check for resume file
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Resume file is required'
        });
        return;
      }

      const profile = await this.profileService.createProfile(value, req.file);

      res.status(201).json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Profile creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const rawSessionId = req.params.sessionId;

      if (!rawSessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
        return;
      }

      const sessionId = Array.isArray(rawSessionId)
        ? rawSessionId[0]
        : rawSessionId;
      const profile = await this.profileService.getProfile(sessionId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Profile retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}