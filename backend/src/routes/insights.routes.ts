import { Router } from 'express';
import * as insightsController from '../controllers/insights.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';
import { ApiError } from '../utils/api-error';
import { insightsQuerySchema } from '../validators/insights.validator';

const router = Router();

router.use(requireAuth);

const validateDateQuery = (req: any, _res: any, next: any) => {
  const parsed = insightsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(ApiError.badRequest('Invalid date range', parsed.error.errors));
    return;
  }
  req.query = parsed.data as never;
  next();
};

router.get('/summary', validateDateQuery, asyncHandler(insightsController.summary));
router.get('/expenses', validateDateQuery, asyncHandler(insightsController.expenses));
router.get('/savings', asyncHandler(insightsController.savings));
router.get('/loan-readiness', validateDateQuery, asyncHandler(insightsController.loanReadiness));

export default router;
