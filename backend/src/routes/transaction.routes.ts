import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createTransactionSchema,
  listTransactionQuerySchema,
  updateTransactionSchema,
} from '../validators/transaction.validator';
import { ApiError } from '../utils/api-error';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  (req, _res, next) => {
    const parsed = listTransactionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      next(ApiError.badRequest('Invalid query parameters', parsed.error.errors));
      return;
    }
    req.query = parsed.data as never;
    next();
  },
  asyncHandler(transactionController.list),
);

router.get('/:id', asyncHandler(transactionController.getOne));
router.post('/', validateBody(createTransactionSchema), asyncHandler(transactionController.create));
router.put('/:id', validateBody(updateTransactionSchema), asyncHandler(transactionController.update));
router.delete('/:id', asyncHandler(transactionController.remove));

export default router;
