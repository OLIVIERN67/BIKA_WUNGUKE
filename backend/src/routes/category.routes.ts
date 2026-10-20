import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(categoryController.list));
router.post('/', validateBody(createCategorySchema), asyncHandler(categoryController.create));
router.put('/:id', validateBody(updateCategorySchema), asyncHandler(categoryController.update));
router.delete('/:id', asyncHandler(categoryController.remove));

export default router;
