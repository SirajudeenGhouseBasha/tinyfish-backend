import { Router } from 'express';
import profileRoutes from './profileRoutes';
import jobSearchRoutes from './jobSearchRoutes';

const router = Router();

router.use('/profile', profileRoutes);
router.use('/job-search', jobSearchRoutes);

export default router;