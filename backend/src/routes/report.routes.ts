import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(reportController.json));
router.get('/csv', asyncHandler(reportController.csv));
router.get('/pdf', asyncHandler(reportController.pdf));

export default router;
