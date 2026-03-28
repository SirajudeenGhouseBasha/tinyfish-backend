import { Router } from 'express';
import { JobSearchController } from '../controllers';
import { WebSocketService } from '../services/WebSocketService';

export function createJobSearchRoutes(wsService: WebSocketService): Router {
  const router = Router();
  const jobSearchController = new JobSearchController(wsService);

  // POST /api/job-search - Start job search
  router.post('/', (req, res) => {
    jobSearchController.startJobSearch(req, res);
  });

  // GET /api/job-search/report/:sessionId - Download Excel report (must be before /:sessionId)
  router.get('/report/:sessionId', (req, res) => {
    jobSearchController.downloadReport(req, res);
  });

  // GET /api/job-search/:sessionId - Get job search status
  router.get('/:sessionId', (req, res) => {
    jobSearchController.getJobSearchStatus(req, res);
  });

  return router;
}

export default createJobSearchRoutes;