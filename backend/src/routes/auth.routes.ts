import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
  verifyEmailLimiter,
} from '../middleware/rate-limit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  validateResetTokenSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

const router = Router();

router.post(
  '/register',
  registerLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);
router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);
router.post(
  '/verify-email',
  verifyEmailLimiter,
  validateBody(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);
router.post(
  '/resend-otp',
  resendOtpLimiter,
  validateBody(resendOtpSchema),
  asyncHandler(authController.resendOtp),
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
router.post(
  '/reset-password',
  resetPasswordLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(authController.resetUserPassword),
);
router.post(
  '/validate-reset-token',
  resetPasswordLimiter,
  validateBody(validateResetTokenSchema),
  asyncHandler(authController.validateToken),
);

router.get('/me', requireAuth, asyncHandler(authController.me));
router.put(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  asyncHandler(authController.updateProfile),
);
router.put(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword),
);

export default router;
