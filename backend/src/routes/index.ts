import { Router } from 'express';
import authRoutes from './auth.routes';
import transactionRoutes from './transaction.routes';
import savingsRoutes from './savings.routes';
import categoryRoutes from './category.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import insightsRoutes from './insights.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'BIKA WUNGUKE API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/savings', savingsRoutes);
router.use('/categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);

export default router;

