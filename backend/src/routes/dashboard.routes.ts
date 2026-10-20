import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(requireAuth);

router.get('/summary', asyncHandler(dashboardController.summary));
router.get('/trend', asyncHandler(dashboardController.trend));
router.get('/monthly', asyncHandler(dashboardController.monthly));
router.get('/categories', asyncHandler(dashboardController.categoryBreakdown));
router.get('/recent', asyncHandler(dashboardController.recent));
router.get('/savings-goals', asyncHandler(dashboardController.savingsGoals));
router.get('/period-summary', asyncHandler(dashboardController.periodSummary));
router.get('/observations', asyncHandler(dashboardController.observations));

export default router;
