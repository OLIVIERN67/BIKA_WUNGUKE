import { Router } from 'express';
import * as savingsController from '../controllers/savings.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createSavingsSchema,
  listSavingsQuerySchema,
  updateSavingsSchema,
} from '../validators/savings.validator';
import { createGoalSchema, updateGoalSchema } from '../validators/goal.validator';
import { ApiError } from '../utils/api-error';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  (req, _res, next) => {
    const parsed = listSavingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(ApiError.badRequest('Invalid query parameters', parsed.error.errors));
      return;
    }
    req.query = parsed.data as never;
    next();
  },
  asyncHandler(savingsController.list),
);

router.get('/summary', asyncHandler(savingsController.summary));

// Savings goals
router.get('/goals', asyncHandler(savingsController.listGoals));
router.get('/goals/:id', asyncHandler(savingsController.getGoal));
router.post('/goals', validateBody(createGoalSchema), asyncHandler(savingsController.createGoal));
router.put(
  '/goals/:id',
  validateBody(updateGoalSchema),
  asyncHandler(savingsController.updateGoal),
);
router.delete('/goals/:id', asyncHandler(savingsController.removeGoal));

// Savings records
router.post('/', validateBody(createSavingsSchema), asyncHandler(savingsController.create));
router.put('/:id', validateBody(updateSavingsSchema), asyncHandler(savingsController.update));
router.delete('/:id', asyncHandler(savingsController.remove));

export default router;
