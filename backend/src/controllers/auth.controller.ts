import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import {
  GENERIC_RESET_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  isResetTokenValid,
  requestPasswordReset,
  resetPassword,
} from '../services/password-reset.service';
import {
  GENERIC_OTP_SENT_MESSAGE,
  resendEmailOtp,
  verifyEmailOtp,
} from '../services/email-verification.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
  UpdateProfileInput,
  ValidateResetTokenInput,
  VerifyEmailInput,
} from '../validators/auth.validator';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body as RegisterInput);
  const message = result.otpSent
    ? 'Account created. Please check your email for the verification code.'
    : 'Account created, but we could not send the verification email. Please use "Resend code" to try again.';
  return ok(res, result, message, 201);
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body as LoginInput);
  if ('verificationRequired' in result && result.verificationRequired) {
    return ok(
      res,
      result,
      result.otpSent
        ? 'Please enter the verification code we sent to your email.'
        : 'We could not send the verification email. Please use "Resend code" to try again.',
    );
  }
  return ok(res, result, 'Login successful');
}

export async function verifyEmail(req: Request, res: Response) {
  const { email, phone, otp } = req.body as VerifyEmailInput;
  const user = await verifyEmailOtp({ email, phone }, otp);
  // Verification completes authentication: issue the session now.
  return ok(
    res,
    { user: authService.publicUser(user), token: authService.signToken(user) },
    'Your email has been verified. You are now signed in.',
  );
}

export async function resendOtp(req: Request, res: Response) {
  const { email, phone } = req.body as ResendOtpInput;
  await resendEmailOtp({ email, phone });
  return ok(res, null, GENERIC_OTP_SENT_MESSAGE);
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getProfile(req.user.id);
  return ok(res, user);
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.updateProfile(req.user.id, req.body as UpdateProfileInput);
  return ok(res, user, 'Profile updated');
}

export async function changePassword(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await authService.changePassword(req.user.id, req.body as ChangePasswordInput);
  return ok(res, null, 'Password changed successfully');
}

/**
 * Always returns the same generic message whether or not the email exists,
 * so the endpoint cannot be used to discover registered addresses.
 */
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as ForgotPasswordInput;
  await requestPasswordReset(email);
  return ok(res, null, GENERIC_RESET_MESSAGE);
}

export async function resetUserPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body as ResetPasswordInput;
  await resetPassword(token, newPassword);
  return ok(
    res,
    null,
    'Your password has been reset successfully. You can now sign in with your new password.',
  );
}

export async function validateToken(req: Request, res: Response) {
  const { token } = req.body as ValidateResetTokenInput;
  const valid = await isResetTokenValid(token);
  if (!valid) throw ApiError.badRequest(INVALID_TOKEN_MESSAGE);
  return ok(res, { valid: true }, 'This reset link is valid.');
}
